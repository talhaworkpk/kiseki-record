import { supabase } from '../supabase'
import { RelationshipMessage } from '../../types'

export enum MessageDeliveryMode {
  ONLINE_ONLY = 'ONLINE_ONLY'
}

export interface MessageDeliveryResult {
  success: boolean;
  status: 'sent' | 'waiting' | 'failed';
  error?: string;
}

export class MessageService {
  static async send(message: RelationshipMessage, receiverKisekiId: string, mode: MessageDeliveryMode = MessageDeliveryMode.ONLINE_ONLY): Promise<MessageDeliveryResult> {
    if (!navigator.onLine) {
      return { success: false, status: 'failed', error: 'You are currently offline.' };
    }

    if (mode === MessageDeliveryMode.ONLINE_ONLY) {
      return await this.sendOnlineOnly(message, receiverKisekiId);
    }
    return { success: false, status: 'failed', error: 'Unsupported delivery mode' };
  }

  private static async sendOnlineOnly(message: RelationshipMessage, receiverKisekiId: string): Promise<MessageDeliveryResult> {
    try {
      // Check if recipient is online using presence/last_seen_at (For Phase 1, just check if they exist and are online)
      const { data: recipient, error: recipientError } = await supabase
        .from('kiseki_users')
        .select('id, last_seen_at')
        .eq('kiseki_id', receiverKisekiId)
        .single();
      
      if (recipientError || !recipient) {
        return { success: false, status: 'failed', error: 'Kiseki user not found.' };
      }

      // Very simple presence check based on last_seen_at (within last 2 minutes for example)
      // Ideally this uses Realtime Presence, but falling back to last_seen_at
      const isOnline = new Date().getTime() - new Date(recipient.last_seen_at).getTime() < 120000;
      
      // Temporarily bypass strict online check for testing
      // if (!isOnline) {
      //   return { success: false, status: 'failed', error: 'Recipient is currently offline. Messages can only be delivered when both users are online in this version of Kiseki.' };
      // }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, status: 'failed', error: 'Not authenticated' };
      
      const { data: senderData } = await supabase.from('kiseki_users').select('kiseki_id').eq('id', user.id).single();
      if (!senderData) return { success: false, status: 'failed', error: 'Sender identity not found' };

      const { error: insertError } = await supabase
        .from('temporary_messages')
        .insert({
          sender_id: senderData.kiseki_id,
          receiver_id: receiverKisekiId,
          conversation_key: message.conversationId,
          content: message,
        });
      
      if (insertError) throw insertError;
      return { success: true, status: 'sent' };
    } catch (e: any) {
      console.error(e);
      return { success: false, status: 'failed', error: e.message || 'Failed to send message' };
    }
  }

  static async sendReceipt(receiverKisekiId: string, messageId: string, status: 'delivered' | 'read'): Promise<void> {
    if (!navigator.onLine) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: senderData } = await supabase.from('kiseki_users').select('kiseki_id').eq('id', user.id).single();
      if (!senderData) return;

      const receiptMsg = {
        type: 'receipt',
        messageId,
        status,
        timestamp: Date.now()
      };

      await supabase
        .from('temporary_messages')
        .insert({
          sender_id: senderData.kiseki_id,
          receiver_id: receiverKisekiId,
          conversation_key: 'system_receipt',
          content: receiptMsg,
        });
    } catch (e) {
      console.error('Failed to send receipt', e);
    }
  }

  static async updatePresence() {
    if (!navigator.onLine) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('kiseki_users').update({ last_seen_at: new Date().toISOString() }).eq('id', user.id);
    } catch (e) {
      console.error('Failed to update presence', e);
    }
  }
}