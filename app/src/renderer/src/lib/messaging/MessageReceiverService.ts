import { supabase } from '../supabase';
import { Person, RelationshipConversation, RelationshipMessage } from '../../types';
import { NotificationEngine } from '../NotificationEngine';
import { AuthService } from './AuthService';

let unknownSenderResolver: ((name: string | null) => void) | null = null;

export class MessageReceiverService {
  static isInitialized = false;

  static async initialize() {
    if (this.isInitialized) return;
    const hasSession = await AuthService.initAnonymousSession();
    if (!hasSession) return;

    const myKisekiId = await AuthService.getKisekiId();
    if (!myKisekiId) return;

    this.isInitialized = true;

    supabase
      .channel('public:temporary_messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'temporary_messages', filter: `receiver_id=eq.${myKisekiId}` },
        async (payload) => {
          await this.handleIncomingMessage(payload.new);
        }
      )
      .subscribe();

    // Periodically update presence
    setInterval(() => {
      if (navigator.onLine) {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
             supabase.from('kiseki_users').update({ last_seen_at: new Date().toISOString() }).eq('id', data.session.user.id).then();
          }
        });
      }
    }, 60000); // Every minute
  }

  static resolveUnknownSender(name: string | null) {
    if (unknownSenderResolver) {
      unknownSenderResolver(name);
      unknownSenderResolver = null;
    }
  }

  private static async handleIncomingMessage(row: any) {
    try {
      const senderId = row.sender_id;
      const incomingMsg = row.content as RelationshipMessage;

      // Find local relationship with this Kiseki ID
      // @ts-ignore
      const people: Person[] = await window.api.db.find('relationships', { kisekiId: senderId });
      let person = people && people.length > 0 ? people[0] : null;

      if (incomingMsg.type === 'receipt') {
        // Intercept receipt payload (doesn't require full person setup if they deleted them, but usually they exist)
        await supabase.from('temporary_messages').delete().eq('id', row.id);
        
        if (person) {
          // @ts-ignore
          let convs = await window.api.db.find('relationshipConversations', { personId: person._id });
          if (convs && convs.length > 0) {
            const conv = convs[0];
            // @ts-ignore
            const msgIndex = conv.messages.findIndex(m => m.id === incomingMsg.messageId);
            if (msgIndex !== -1) {
              // Only upgrade status (don't downgrade from read to delivered)
              // @ts-ignore
              const currentStatus = conv.messages[msgIndex].status;
              // @ts-ignore
              const newStatus = incomingMsg.status;
              if (currentStatus !== 'read' || newStatus === 'read') {
                conv.messages[msgIndex].status = newStatus;
                // @ts-ignore
                await window.api.db.update('relationshipConversations', { _id: conv._id }, { $set: { messages: conv.messages, updatedAt: Date.now() } }, {});
                
                // Dispatch event for UI to update instantly
                window.dispatchEvent(new CustomEvent('kiseki:message-status-update', { 
                  detail: { personId: person._id, messageId: incomingMsg.messageId, status: newStatus } 
                }));
              }
            }
          }
        }
        return;
      }

      if (!person) {
        // Handle Unknown Sender using premium modal
        const name = await new Promise<string | null>((resolve) => {
          unknownSenderResolver = resolve;
          const event = new CustomEvent('kiseki:unknown-sender', { detail: { senderId } });
          window.dispatchEvent(event);
        });

        if (!name) {
          // User clicked ignore
          await supabase.from('temporary_messages').delete().eq('id', row.id);
          return;
        }
        
        person = {
          _id: `rel_${Date.now()}`,
          name: name,
          relationshipType: 'Friend',
          kisekiId: senderId,
          tags: [],
          notes: [],
          relationshipScore: 50,
          lastInteraction: Date.now(),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        // @ts-ignore
        await window.api.db.insert('relationships', person);
      }

      // Save message locally
      // @ts-ignore
      let convs = await window.api.db.find('relationshipConversations', { personId: person._id });
      let conv: RelationshipConversation;
      if (!convs || convs.length === 0) {
        conv = { personId: person._id!, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
        // @ts-ignore
        conv = await window.api.db.insert('relationshipConversations', conv);
      } else {
        conv = convs[0];
      }

      // We swap sender/receiver so it renders correctly on our side
      incomingMsg.conversationId = conv._id!;
      incomingMsg.receiverId = 'self';
      incomingMsg.senderId = person._id!;
      incomingMsg.status = 'delivered'; // We received it, but haven't read it yet

      const newMessages = [...(conv.messages || []), incomingMsg];
      // @ts-ignore
      await window.api.db.update('relationshipConversations', { _id: conv._id }, { $set: { messages: newMessages, updatedAt: Date.now() } }, {});
      // @ts-ignore
      await window.api.db.update('relationships', { _id: person._id }, { $set: { lastInteraction: Date.now() } }, {});

      // Delete temporary message
      await supabase.from('temporary_messages').delete().eq('id', row.id);

      // Send delivery receipt
      import('./MessageService').then(({ MessageService }) => {
        MessageService.sendReceipt(senderId, incomingMsg.id, 'delivered');
      });

      NotificationEngine.notify('info', 'New Message', `New message from ${person.name}`, 'Relationships');

    } catch (e: any) {
      console.error('Failed to handle incoming message', e);
      NotificationEngine.notify('error', 'Message Error', e.message || String(e), 'Relationships');
    }
  }
}