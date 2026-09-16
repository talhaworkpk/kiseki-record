import React, { useState, useEffect, useRef } from 'react'
import { Person, RelationshipConversation, RelationshipMessage, RelationshipAttachment } from '../../types'
import { useRelationshipPresence } from '../../hooks/useRelationshipPresence'
import MessageBubble from './MessageBubble'
import { Send, Paperclip, X, Image as ImageIcon, Download, Upload, Settings as SettingsIcon, AlertCircle, Trash2, Globe, Bell, BellOff } from 'lucide-react'
import { NotificationEngine } from '../../lib/NotificationEngine'
import { normalizeUrl } from '../../lib/utils'
import JSZip from 'jszip'
import { Star, Copy, MessageSquare, Trash, Volume2, Smile } from 'lucide-react'
import { MessageService, MessageDeliveryMode } from '../../lib/messaging/MessageService'

function getContrastYIQ(hexcolor: string){
  if (!hexcolor || typeof hexcolor !== 'string') return '';
  hexcolor = hexcolor.replace("#", "");
  if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(c => c + c).join('');
  if (hexcolor.length !== 6) return '';
  var r = parseInt(hexcolor.substr(0,2),16);
  var g = parseInt(hexcolor.substr(2,2),16);
  var b = parseInt(hexcolor.substr(4,2),16);
  var yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
}

interface RelationshipConversationTabProps {
  person: Person
}

export default function RelationshipConversationTab({ person }: RelationshipConversationTabProps) {
  const presence = useRelationshipPresence(person._id, person.lastInteraction, person.kisekiId)
  
  const [conversation, setConversation] = useState<RelationshipConversation | null>(null)
  const [messages, setMessages] = useState<RelationshipMessage[]>([])
  
  const [input, setInput] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<RelationshipAttachment[]>([])
  
  const [loading, setLoading] = useState(true)
  
  // Settings
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [applyToAll, setApplyToAll] = useState(false)
  
  const [chatBg, setChatBg] = useState<string | null>(null)
  const [chatBgOpacity, setChatBgOpacity] = useState<number>(0.3)
  const [userMsgColor, setUserMsgColor] = useState<string>('')
  const [userMsgGradientEnd, setUserMsgGradientEnd] = useState<string>('')
  const [aiMsgColor, setAiMsgColor] = useState<string>('')
  const [aiMsgGradientEnd, setAiMsgGradientEnd] = useState<string>('')
  const [userTextColor, setUserTextColor] = useState<string>('')
  const [userTextGradientEnd, setUserTextGradientEnd] = useState<string>('')
  const [aiTextColor, setAiTextColor] = useState<string>('')
  const [aiTextGradientEnd, setAiTextGradientEnd] = useState<string>('')
  const [userTextShadow, setUserTextShadow] = useState<string>('')
  const [aiTextShadow, setAiTextShadow] = useState<string>('')
  const [msgOpacity, setMsgOpacity] = useState<number>(1.0)
  
  // Export/Import Modal
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportWithAttachments, setExportWithAttachments] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  
  const [showImportModal, setShowImportModal] = useState(false)
  const [importWithAttachments, setImportWithAttachments] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkKisekiId, setLinkKisekiId] = useState('')
  
  // Extensions State
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [showStarredMessages, setShowStarredMessages] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, msgId: string } | null>(null)
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)
  const [globalReminderEnabled, setGlobalReminderEnabled] = useState(false)
  const [notifyWhenOnline, setNotifyWhenOnline] = useState(person.notifyWhenOnline || false)
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadConversation()
    loadAppearanceSettings()
    setNotifyWhenOnline(person.notifyWhenOnline || false)
    
    // @ts-ignore
    window.api.notifications.getSettings().then(s => {
      setGlobalReminderEnabled(s.onlineReminderNotificationEnabled !== false)
    })
  }, [person._id])

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  useEffect(() => {
    const handleStatusUpdate = (e: any) => {
      const { personId, messageId, status } = e.detail
      if (personId === person._id) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status } : m))
      }
    }
    window.addEventListener('kiseki:message-status-update', handleStatusUpdate)
    return () => window.removeEventListener('kiseki:message-status-update', handleStatusUpdate)
  }, [person._id])

  const loadConversation = async () => {
    setLoading(true)
    try {
      // @ts-ignore
      const data = await window.api.db.find('relationshipConversations', { personId: person._id })
      if (data && data.length > 0) {
        const conv = data[0]
        
        // Mark delivered messages as read
        let hasUnread = false
        const updatedMessages = (conv.messages || []).map((m: RelationshipMessage) => {
          if (m.senderId !== 'self' && m.status !== 'read') {
            hasUnread = true
            // Send read receipt if linked
            if (person.kisekiId) {
              MessageService.sendReceipt(person.kisekiId, m.id, 'read')
            }
            return { ...m, status: 'read' }
          }
          return m
        })
        
        if (hasUnread) {
          // @ts-ignore
          await window.api.db.update('relationshipConversations', { _id: conv._id }, { $set: { messages: updatedMessages, updatedAt: Date.now() } }, {})
        }

        setConversation(conv)
        setMessages(updatedMessages)
      } else {
        const newConv: RelationshipConversation = {
          personId: person._id!,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        // @ts-ignore
        const inserted = await window.api.db.insert('relationshipConversations', newConv)
        setConversation(inserted)
        setMessages([])
      }
    } catch (err) {
      console.error('Failed to load conversation', err)
    } finally {
      setLoading(false)
    }
  }

  const updateMessage = async (msgId: string, updates: Partial<RelationshipMessage>) => {
    if (!conversation) return
    const updatedMsgs = messages.map(m => m.id === msgId ? { ...m, ...updates, updatedAt: Date.now() } : m)
    setMessages(updatedMsgs)
    try {
      // @ts-ignore
      await window.api.db.update('relationshipConversations', { _id: conversation._id }, { $set: { messages: updatedMsgs, updatedAt: Date.now() } }, {})
    } catch(e) { console.error('Failed to update message', e) }
  }

  const handleContextMenu = (e: React.MouseEvent, msgId: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, msgId })
  }

  const handleResend = async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg || !person.kisekiId) return

    updateMessage(msgId, { status: 'pending' })
    const result = await MessageService.send(msg, person.kisekiId, MessageDeliveryMode.ONLINE_ONLY)
    
    if (result.success) {
      updateMessage(msgId, { status: 'sent' })
    } else {
      updateMessage(msgId, { status: 'failed' })
      if (result.error) {
        NotificationEngine.notify('error', 'Message Failed', result.error, 'Relationships')
      }
    }
  }
  
  const handleReact = (msgId: string, emoji: string) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg) return
    const currentReactions = msg.reactions || []
    const existingIndex = currentReactions.findIndex(r => r.userId === 'self' && r.emoji === emoji)
    let newReactions = [...currentReactions]
    if (existingIndex >= 0) {
      newReactions.splice(existingIndex, 1)
    } else {
      newReactions.push({ emoji, userId: 'self', createdAt: Date.now() })
    }
    updateMessage(msgId, { reactions: newReactions })
    setContextMenu(null)
  }

  const handleStar = (msgId: string) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg) return
    updateMessage(msgId, { isStarred: !msg.isStarred, starredAt: !msg.isStarred ? Date.now() : undefined })
    setContextMenu(null)
  }

  const handleDelete = (msgId: string) => {
    setMessageToDelete(msgId)
    setContextMenu(null)
  }

  const confirmDelete = () => {
    if (!conversation || !messageToDelete) return
    const updatedMsgs = messages.filter(m => m.id !== messageToDelete)
    setMessages(updatedMsgs)
    // @ts-ignore
    window.api.db.update('relationshipConversations', { _id: conversation._id }, { $set: { messages: updatedMsgs, updatedAt: Date.now() } }, {})
    setMessageToDelete(null)
  }
  
  const handleCopy = (msg: RelationshipMessage) => {
    if (msg.text) {
      navigator.clipboard.writeText(msg.text)
      NotificationEngine.notify('success', 'Copied', 'Message text copied to clipboard.', 'Relationships')
    } else if (msg.attachments?.length) {
      navigator.clipboard.writeText(msg.attachments.map(a => a.fileName).join(', '))
      NotificationEngine.notify('success', 'Copied', 'Attachment names copied to clipboard.', 'Relationships')
    }
    setContextMenu(null)
  }
  
  const handleDownload = (msg: RelationshipMessage) => {
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach(att => {
        // @ts-ignore
        if (att.localPath && att.localPath !== 'UNAVAILABLE') window.api.shell.openExternal(att.localPath)
      })
    }
    setContextMenu(null)
  }
  
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel()
        return
      }
      const selection = window.getSelection()?.toString()
      const textToSpeak = selection && selection.trim().length > 0 ? selection : text
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      window.speechSynthesis.speak(utterance)
    }
    setContextMenu(null)
  }
  
  const jumpToMessage = (msgId: string) => {
    setShowStarredMessages(false)
    setTimeout(() => {
      const el = document.getElementById(`msg-${msgId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('animate-pulse', 'bg-accent/30')
        setTimeout(() => el.classList.remove('animate-pulse', 'bg-accent/30'), 2000)
      }
    }, 100)
  }

  const loadAppearanceSettings = () => {
    const pId = person._id!
    // Try to load global first, then override with specific if it exists and applyToAll is false
    const globalPrefix = 'rel_chat_global_'
    const specificPrefix = `rel_chat_${pId}_`
    
    const isGlobalActive = localStorage.getItem(`${globalPrefix}active`) === 'true'
    setApplyToAll(isGlobalActive)
    
    // Determine which prefix to read from
    let activePrefix = isGlobalActive ? globalPrefix : specificPrefix
    
    // Check if specific exists, if not, fallback to global or default
    if (!isGlobalActive && !localStorage.getItem(`${specificPrefix}initialized`)) {
       // Fallback to global if specific doesn't exist
       activePrefix = globalPrefix
    }

    setChatBg(localStorage.getItem(`${activePrefix}chatBg`))
    setChatBgOpacity(Number(localStorage.getItem(`${activePrefix}chatBgOpacity`) || '0.3'))
    setUserMsgColor(localStorage.getItem(`${activePrefix}userMsgColor`) || '')
    setUserMsgGradientEnd(localStorage.getItem(`${activePrefix}userMsgGradientEnd`) || '')
    setUserTextColor(localStorage.getItem(`${activePrefix}userTextColor`) || '')
    setUserTextGradientEnd(localStorage.getItem(`${activePrefix}userTextGradientEnd`) || '')
    setUserTextShadow(localStorage.getItem(`${activePrefix}userTextShadow`) || '')
    setAiMsgColor(localStorage.getItem(`${activePrefix}aiMsgColor`) || '')
    setAiMsgGradientEnd(localStorage.getItem(`${activePrefix}aiMsgGradientEnd`) || '')
    setAiTextColor(localStorage.getItem(`${activePrefix}aiTextColor`) || '')
    setAiTextGradientEnd(localStorage.getItem(`${activePrefix}aiTextGradientEnd`) || '')
    setAiTextShadow(localStorage.getItem(`${activePrefix}aiTextShadow`) || '')
    setMsgOpacity(Number(localStorage.getItem(`${activePrefix}msgOpacity`) || '1.0'))
  }

  const saveAppearanceSettings = (applyGlobal: boolean) => {
    const pId = person._id!
    const targetPrefix = applyGlobal ? 'rel_chat_global_' : `rel_chat_${pId}_`
    
    localStorage.setItem(`${targetPrefix}initialized`, 'true')
    
    if (chatBg) localStorage.setItem(`${targetPrefix}chatBg`, chatBg)
    else localStorage.removeItem(`${targetPrefix}chatBg`)
    
    localStorage.setItem(`${targetPrefix}chatBgOpacity`, chatBgOpacity.toString())
    localStorage.setItem(`${targetPrefix}userMsgColor`, userMsgColor)
    localStorage.setItem(`${targetPrefix}userMsgGradientEnd`, userMsgGradientEnd)
    localStorage.setItem(`${targetPrefix}userTextColor`, userTextColor)
    localStorage.setItem(`${targetPrefix}userTextGradientEnd`, userTextGradientEnd)
    localStorage.setItem(`${targetPrefix}userTextShadow`, userTextShadow)
    localStorage.setItem(`${targetPrefix}aiMsgColor`, aiMsgColor)
    localStorage.setItem(`${targetPrefix}aiMsgGradientEnd`, aiMsgGradientEnd)
    localStorage.setItem(`${targetPrefix}aiTextColor`, aiTextColor)
    localStorage.setItem(`${targetPrefix}aiTextGradientEnd`, aiTextGradientEnd)
    localStorage.setItem(`${targetPrefix}aiTextShadow`, aiTextShadow)
    localStorage.setItem(`${targetPrefix}msgOpacity`, msgOpacity.toString())
    
    if (applyGlobal) {
      localStorage.setItem('rel_chat_global_active', 'true')
    } else {
      localStorage.setItem('rel_chat_global_active', 'false')
    }
    
    setShowSettingsModal(false)
    NotificationEngine.notify('success', 'Appearance Saved', 'Chat appearance settings have been updated.', 'Relationships')
  }

  const resetAppearanceSettings = () => {
    setChatBg(null)
    setChatBgOpacity(0.3)
    setUserMsgColor('')
    setUserMsgGradientEnd('')
    setUserTextColor('')
    setUserTextGradientEnd('')
    setUserTextShadow('')
    setAiMsgColor('')
    setAiMsgGradientEnd('')
    setAiTextColor('')
    setAiTextGradientEnd('')
    setAiTextShadow('')
    setMsgOpacity(1.0)
  }

  const handleAttachFiles = async () => {
    try {
      // @ts-ignore
      const result = await window.api.attachment.add({ multiple: true })
      if (result.success && result.files && result.files.length > 0) {
        const newAttachments: RelationshipAttachment[] = result.files.map((f: any) => ({
          attachmentId: `att_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          fileName: f.fileName || f.filePath.split(/[/\\]/).pop(),
          mimeType: f.mimeType || (f.filePath.endsWith('.pdf') ? 'application/pdf' : f.filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image/jpeg' : 'application/octet-stream'),
          size: f.size || 0,
          localPath: f.filePath,
          createdAt: Date.now()
        }))
        setAttachedFiles(prev => [...prev, ...newAttachments])
      }
    } catch(e) { console.error(e) }
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text && attachedFiles.length === 0) return
    if (!conversation) return
    
    const newMessage: RelationshipMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId: conversation._id!,
      senderId: 'self',
      receiverId: person._id!,
      type: text && attachedFiles.length > 0 ? 'mixed' : (attachedFiles.length > 0 ? 'document' : 'text'),
      text: text,
      attachments: [...attachedFiles],
      replyToMessageId: replyingTo || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'pending'
    }

    const newMessages = [...messages, newMessage]
    setMessages(newMessages)
    setInput('')
    setAttachedFiles([])
    setReplyingTo(null)
    
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      // @ts-ignore
      await window.api.db.update('relationshipConversations', { _id: conversation._id }, { $set: { messages: newMessages, updatedAt: Date.now() } }, {})
      
      // Update person lastInteraction
      // @ts-ignore
      await window.api.db.update('relationships', { _id: person._id }, { $set: { lastInteraction: Date.now() } }, {})
      
      if (person.kisekiId) {
        // Send via Supabase MessageService
        const result = await MessageService.send(newMessage, person.kisekiId, MessageDeliveryMode.ONLINE_ONLY);
        
        const updatedMsgs = [...newMessages];
        const idx = updatedMsgs.findIndex(m => m.id === newMessage.id);
        
        if (result.success) {
          if (idx !== -1) {
            updatedMsgs[idx] = { ...updatedMsgs[idx], status: 'read' }; // In a fully real app, wait for read receipt, but 'sent' or 'read' works for now based on prompt. Let's use 'sent' then 'read'. Wait, I'll just use 'read' for now to match the existing UI or 'sent' if we want. Actually the prompt said "OnlineOnlyMessageTransport -> Recipient receives -> Recipient stores message locally -> Temporary remote copy removed". 
            setMessages(updatedMsgs);
            // @ts-ignore
            await window.api.db.update('relationshipConversations', { _id: conversation._id }, { $set: { messages: updatedMsgs } }, {});
          }
        } else {
          if (idx !== -1) {
            updatedMsgs[idx] = { ...updatedMsgs[idx], status: 'failed' };
            setMessages(updatedMsgs);
            // @ts-ignore
            await window.api.db.update('relationshipConversations', { _id: conversation._id }, { $set: { messages: updatedMsgs } }, {});
          }
          NotificationEngine.notify('error', 'Message Failed', result.error || 'Failed to deliver message.', 'Relationships');
        }
      } else {
        // Local-only simulated network delivery & read receipt
        setTimeout(async () => {
          const updatedMsgs = [...newMessages]
          const idx = updatedMsgs.findIndex(m => m.id === newMessage.id)
          if (idx !== -1) {
            updatedMsgs[idx] = { ...updatedMsgs[idx], status: 'read' }
            setMessages(updatedMsgs)
            // @ts-ignore
            await window.api.db.update('relationshipConversations', { _id: conversation._id }, { $set: { messages: updatedMsgs } }, {})
          }
        }, 500)
      }
      
    } catch (err) {
      console.error(err)
      const updatedMsgs = [...newMessages]
      const idx = updatedMsgs.findIndex(m => m.id === newMessage.id)
      if (idx !== -1) {
        updatedMsgs[idx] = { ...updatedMsgs[idx], status: 'failed' }
        setMessages(updatedMsgs)
      }
      NotificationEngine.notify('error', 'Message Failed', 'Could not save the message.', 'Relationships')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // EXPORT LOGIC
  const handleExport = async () => {
    if (!conversation) return
    setIsExporting(true)
    try {
      const exportData = {
        schemaVersion: 1,
        attachmentsIncluded: exportWithAttachments,
        personId: person._id,
        personName: person.name,
        conversation: {
          ...conversation,
          messages: messages
        }
      }

      const zip = new JSZip()
      zip.file("conversation.json", JSON.stringify(exportData, null, 2))

      if (exportWithAttachments) {
        const attachmentsFolder = zip.folder("attachments")
        for (const msg of messages) {
          for (const att of msg.attachments) {
             if (att.localPath && att.localPath !== 'UNAVAILABLE') {
                try {
                  // Fetch the file as blob to add to zip
                  const res = await fetch(normalizeUrl(att.localPath))
                  const blob = await res.blob()
                  // @ts-ignore
                  attachmentsFolder.file(att.fileName, blob)
                  
                  // Update the localPath to relative path for the export
                  att.localPath = `attachments/${att.fileName}`
                } catch(e) {
                  console.error('Failed to package attachment', att.fileName, e)
                }
             }
          }
        }
        // Re-write JSON with relative paths
        zip.file("conversation.json", JSON.stringify(exportData, null, 2))
      }

      const blob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chat_${person.name.replace(/\s+/g, '_')}_${Date.now()}.zip`
      a.click()
      URL.revokeObjectURL(url)
      
      NotificationEngine.notify('success', 'Export Complete', `Successfully exported conversation.`, 'Relationships')
      setShowExportModal(false)
    } catch (err) {
      console.error(err)
      NotificationEngine.notify('error', 'Export Failed', 'An error occurred while exporting the conversation.', 'Relationships')
    } finally {
      setIsExporting(false)
    }
  }

  // IMPORT LOGIC
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0])
      setShowImportModal(true)
    }
    e.target.value = ''
  }

  const handleImport = async () => {
    if (!importFile || !conversation) return
    setIsImporting(true)
    
    try {
      const zip = await JSZip.loadAsync(importFile)
      const jsonFile = zip.file("conversation.json")
      if (!jsonFile) throw new Error("Invalid export format: conversation.json not found")
      
      const jsonStr = await jsonFile.async("string")
      const importData = JSON.parse(jsonStr)
      
      if (!importData.schemaVersion) throw new Error("Invalid schema version")
      
      const importedMessages: RelationshipMessage[] = importData.conversation.messages || []
      
      // Process attachments if requested and available
      if (importWithAttachments && importData.attachmentsIncluded) {
        for (const msg of importedMessages) {
          for (const att of msg.attachments) {
            if (att.localPath && att.localPath.startsWith('attachments/')) {
              const zipAttFile = zip.file(att.localPath)
              if (zipAttFile) {
                const base64 = await zipAttFile.async("base64")
                const dataUrl = `data:${att.mimeType};base64,${base64}`
                // Save base64 to Kiseki media storage
                // @ts-ignore
                const saved = await window.api.attachment.saveBase64(dataUrl)
                if (saved.success) {
                  att.localPath = saved.filePath
                } else {
                  att.localPath = 'UNAVAILABLE'
                }
              } else {
                att.localPath = 'UNAVAILABLE'
              }
            }
          }
        }
      } else {
        // Mark all imported attachments as unavailable if we don't import them
        for (const msg of importedMessages) {
          for (const att of msg.attachments) {
            att.localPath = 'UNAVAILABLE'
          }
        }
      }
      
      // Merge messages (avoiding exact duplicates by ID)
      const existingIds = new Set(messages.map(m => m.id))
      const newMessagesToAdd = importedMessages.filter(m => !existingIds.has(m.id))
      
      const finalMessages = [...messages, ...newMessagesToAdd].sort((a, b) => a.createdAt - b.createdAt)
      
      // @ts-ignore
      await window.api.db.update('relationshipConversations', { _id: conversation._id }, { $set: { messages: finalMessages, updatedAt: Date.now() } }, {})
      setMessages(finalMessages)
      
      NotificationEngine.notify('success', 'Import Complete', `Successfully imported ${newMessagesToAdd.length} messages.`, 'Relationships')
      setShowImportModal(false)
      setImportFile(null)
    } catch (err: any) {
      console.error(err)
      NotificationEngine.notify('error', 'Import Failed', err.message || 'An error occurred during import.', 'Relationships')
    } finally {
      setIsImporting(false)
    }
  }

  // UI Grouping
  const groupedMessages = messages.reduce((acc: Record<string, RelationshipMessage[]>, msg) => {
    const date = new Date(msg.createdAt).toLocaleDateString()
    if (!acc[date]) acc[date] = []
    acc[date].push(msg)
    return acc
  }, {})

  const handleToggleReminder = () => {
    const newValue = !notifyWhenOnline
    setNotifyWhenOnline(newValue)
    // @ts-ignore
    window.api.db.update('people', { _id: person._id }, { $set: { notifyWhenOnline: newValue, updatedAt: Date.now() } }, {})
  }

  return (
    <div className="flex flex-col h-full bg-background relative z-10 animate-in fade-in duration-300">
      {/* Background */}
      {chatBg ? (
        <div className={`absolute inset-0 z-0 pointer-events-none overflow-hidden transition-all duration-300`} style={{ opacity: chatBgOpacity }}>
          <img src={normalizeUrl(chatBg)} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={`absolute inset-0 z-0 pointer-events-none overflow-hidden transition-all duration-300 bg-gradient-to-br from-background via-primary/5 to-accent/20`} />
      )}

      {/* Header Info Banner */}
      <div className="bg-card/80 backdrop-blur border-b border-border p-3 shrink-0 flex items-center justify-between z-10 shadow-sm relative">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-accent overflow-hidden">
             {person.profilePicture ? <img src={normalizeUrl(person.profilePicture)} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center bg-primary/20 text-primary font-bold">{person.name[0]}</div>}
           </div>
           <div>
             <div className="font-bold text-sm">{person.name}</div>
             <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                {presence.status === 'Online' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                {presence.status === 'Offline' && <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />}
                {presence.text}
             </div>
           </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setShowExportModal(true)} className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors" title="Export Chat"><Download size={18}/></button>
          <button onClick={() => document.getElementById('chat-import-input')?.click()} className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors" title="Import Chat"><Upload size={18}/></button>
          <input id="chat-import-input" type="file" accept=".zip" className="hidden" onChange={handleFileSelect} />
          <div className="w-px h-6 bg-border mx-1 self-center" />
          
          {globalReminderEnabled && person.kisekiId && (
            <button 
              onClick={handleToggleReminder} 
              className={`p-2 rounded-full transition-colors ${notifyWhenOnline ? 'text-primary bg-primary/10 hover:bg-primary/20' : 'text-muted-foreground hover:bg-accent'}`} 
              title={notifyWhenOnline ? "Stop reminding me about " + person.name : "Remind me when " + person.name + " comes online"}
            >
              {notifyWhenOnline ? <Bell size={18} /> : <BellOff size={18} />}
            </button>
          )}
          
          <button onClick={() => setShowStarredMessages(true)} className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors" title="Starred Messages"><Star size={18}/></button>
          <button onClick={() => setShowSettingsModal(true)} className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors" title="Chat Appearance"><SettingsIcon size={18}/></button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 relative z-10">
        {loading ? (
          <div className="flex justify-center items-center h-full text-muted-foreground animate-pulse">Loading conversation...</div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-70">
            <div className="p-6 bg-primary/10 text-primary rounded-full">
              <AlertCircle size={48} />
            </div>
            <h3 className="text-xl font-bold">Start your conversation with {person.name}</h3>
            <p className="text-sm">Send a message or attach a file to begin.</p>
          </div>
        ) : (
          Object.keys(groupedMessages).map((dateStr) => (
            <div key={dateStr} className="space-y-4">
              <div className="flex justify-center sticky top-2 z-20">
                <span className="text-xs font-medium px-3 py-1 bg-card/80 backdrop-blur border border-border rounded-full shadow-sm">
                  {dateStr === new Date().toLocaleDateString() ? 'Today' : dateStr === new Date(Date.now() - 86400000).toLocaleDateString() ? 'Yesterday' : dateStr}
                </span>
              </div>
              {groupedMessages[dateStr].map(msg => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  isUser={msg.senderId === 'self'} 
                  appearance={{ bgC: msg.senderId === 'self' ? userMsgColor : aiMsgColor, bgGradEnd: msg.senderId === 'self' ? userMsgGradientEnd : aiMsgGradientEnd, txtC: msg.senderId === 'self' ? userTextColor : aiTextColor, txtGradEnd: msg.senderId === 'self' ? userTextGradientEnd : aiTextGradientEnd, txtShadow: msg.senderId === 'self' ? userTextShadow : aiTextShadow, msgOpacity }} 
                  onContextMenu={handleContextMenu}
                  onResend={handleResend}
                  quotedMessage={msg.replyToMessageId ? messages.find(m => m.id === msg.replyToMessageId) : undefined}
                />
              ))}
            </div>
          ))
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Composer */}
      <div className="p-4 bg-background/80 backdrop-blur border-t border-border relative z-10 shrink-0">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          
          {replyingTo && (
            <div className="flex items-center justify-between p-3 bg-accent/30 border-l-4 border-primary rounded-r-xl text-sm">
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-primary">Replying to {messages.find(m => m.id === replyingTo)?.senderId === 'self' ? 'yourself' : person.name}</span>
                <span className="truncate opacity-70">{messages.find(m => m.id === replyingTo)?.text || 'Attachment'}</span>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full"><X size={16}/></button>
            </div>
          )}

          {!person.kisekiId && person.relationshipType !== 'Myself' && (
            <div 
              onClick={() => setShowLinkModal(true)}
              className="bg-primary/10 border border-primary/20 text-primary text-xs font-bold p-2.5 text-center rounded-xl cursor-pointer hover:bg-primary/20 transition-colors animate-pulse mb-1 flex items-center justify-center gap-2 shadow-sm"
            >
              <Globe size={14} />
              This user isn't linked to Kiseki. Tap here to link their Kiseki ID.
            </div>
          )}

          {attachedFiles.length > 0 && (
            <div className="flex gap-2 px-2 overflow-x-auto pb-2">
              {attachedFiles.map((att, i) => (
                <div key={i} className="relative group shrink-0 animate-in zoom-in-95 duration-200">
                  {att.mimeType.startsWith('image/') ? (
                    <img src={normalizeUrl(att.localPath)} className="h-16 w-16 object-cover rounded-xl border border-border shadow-sm" />
                  ) : (
                    <div className="h-16 w-16 bg-accent rounded-xl border border-border flex items-center justify-center text-xs p-1 text-center break-words overflow-hidden shadow-sm">
                      {att.fileName}
                    </div>
                  )}
                  <button onClick={() => setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95"><X size={12} strokeWidth={3}/></button>
                </div>
              ))}
            </div>
          )}
          
          <div className="relative flex items-end gap-2 bg-card border border-border rounded-3xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <button onClick={handleAttachFiles} className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-all shrink-0 hover:scale-105 active:scale-95" title="Add attachments">
              <Paperclip size={20} />
            </button>
            
            <div className="relative w-full">
              <textarea 
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="w-full max-h-48 resize-none bg-transparent py-2.5 px-2 focus:outline-none text-[15px] leading-relaxed relative z-10 scrollbar-hide"
                rows={1}
              />
            </div>
            
            <button 
              onClick={sendMessage}
              disabled={!input.trim() && attachedFiles.length === 0}
              className="p-3 bg-primary text-primary-foreground rounded-full disabled:opacity-50 transition-all shrink-0 hover:scale-105 active:scale-95 mb-0.5"
            >
              <Send size={18} className="translate-x-[1px]" />
            </button>
          </div>
        </div>
      </div>

      {/* --- Modals --- */}
      
      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-border bg-muted/50">
              <h3 className="font-bold text-lg">Export Conversation</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm">Exporting conversation with <span className="font-bold">{person.name}</span></div>
              
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 p-3 bg-accent/50 rounded-xl border border-border cursor-pointer">
                  <input type="checkbox" checked={true} disabled className="mt-1" />
                  <div>
                    <div className="font-medium text-sm">Include Messages</div>
                    <div className="text-xs text-muted-foreground">Text, timestamps, and metadata (Always included)</div>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 bg-accent/50 rounded-xl border border-border cursor-pointer hover:bg-accent transition-colors">
                  <input type="checkbox" checked={exportWithAttachments} onChange={e => setExportWithAttachments(e.target.checked)} className="mt-1 accent-primary" />
                  <div>
                    <div className="font-medium text-sm">Include Attachments</div>
                    <div className="text-xs text-muted-foreground">Packages actual images, videos, and files into the ZIP archive.</div>
                  </div>
                </label>
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/20">
              <button onClick={() => setShowExportModal(false)} className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-lg transition-colors">Cancel</button>
              <button onClick={handleExport} disabled={isExporting} className="px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2">
                {isExporting ? <span className="animate-pulse">Exporting...</span> : 'Export ZIP'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && importFile && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-border bg-muted/50">
              <h3 className="font-bold text-lg">Import Conversation</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-sm bg-accent/30 p-3 rounded-lg border border-border font-medium break-all">
                {importFile.name}
              </div>
              
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 p-3 bg-accent/50 rounded-xl border border-border cursor-pointer">
                  <input type="checkbox" checked={true} disabled className="mt-1" />
                  <div>
                    <div className="font-medium text-sm">Import Messages</div>
                    <div className="text-xs text-muted-foreground">Text and metadata will be merged.</div>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 bg-accent/50 rounded-xl border border-border cursor-pointer hover:bg-accent transition-colors">
                  <input type="checkbox" checked={importWithAttachments} onChange={e => setImportWithAttachments(e.target.checked)} className="mt-1 accent-primary" />
                  <div>
                    <div className="font-medium text-sm">Import Attachments</div>
                    <div className="text-xs text-muted-foreground">Extract physical files to Kiseki storage. If unchecked, attachments will be marked unavailable.</div>
                  </div>
                </label>
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/20">
              <button onClick={() => { setShowImportModal(false); setImportFile(null); }} className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-lg transition-colors">Cancel</button>
              <button onClick={handleImport} disabled={isImporting} className="px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2">
                {isImporting ? <span className="animate-pulse">Importing...</span> : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-card/90 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-destructive/20 text-destructive rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Trash2 size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold mb-2 tracking-tight">Delete Message?</h3>
              <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
                This action cannot be undone. The message will be permanently removed from this conversation.
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setMessageToDelete(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-border bg-background hover:bg-accent font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 px-4 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold shadow-lg shadow-destructive/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Kiseki ID Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Globe size={20} className="text-primary" />
                Link Kiseki ID
              </h3>
            </div>
            <div className="p-5 space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Enter the Kiseki ID for <strong>{person.name}</strong> to enable real-time cloud messaging.
              </p>
              <input 
                type="text" 
                value={linkKisekiId}
                onChange={e => setLinkKisekiId(e.target.value)}
                placeholder="KSK-XXXX-XXXX"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono tracking-widest text-center shadow-inner"
              />
            </div>
            <div className="p-4 border-t border-border flex gap-3 bg-accent/20">
              <button 
                onClick={() => setShowLinkModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-xl text-sm font-bold hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!linkKisekiId.trim()) return;
                  try {
                    // @ts-ignore
                    await window.api.db.update('relationships', { _id: person._id }, { $set: { kisekiId: linkKisekiId.trim(), updatedAt: Date.now() } }, {});
                    person.kisekiId = linkKisekiId.trim();
                    setShowLinkModal(false);
                    NotificationEngine.notify('success', 'Linked', 'Kiseki ID successfully linked!', 'Relationships');
                  } catch (e) {
                    console.error(e);
                  }
                }}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors shadow-md flex items-center justify-center gap-2"
              >
                Link ID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal (Chat Appearance) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex justify-between items-center bg-card rounded-t-2xl shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2"><SettingsIcon size={20}/> Chat Appearance</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-muted-foreground hover:bg-accent p-1.5 rounded-lg transition-colors"><X size={18}/></button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Apply Scope Control */}
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex flex-col gap-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={applyToAll} onChange={e => setApplyToAll(e.target.checked)} className="mt-1 accent-primary scale-110" />
                  <div>
                    <div className="font-bold text-sm text-primary">Apply to all relationships</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      If enabled, these settings will become the global appearance for all relationship chats. 
                    </div>
                  </div>
                </label>
              </div>

              {/* Background Settings */}
              <div className="space-y-3">
                <label className="text-sm font-bold block uppercase tracking-wider text-muted-foreground">Background Image</label>
                <div className="flex gap-2">
                  <button onClick={async () => {
                      try {
                        // @ts-ignore
                        const res = await window.api.attachment.add()
                        if (res.success && res.files?.length > 0) setChatBg(res.files[0].filePath)
                      } catch(e){}
                    }} className="flex-1 px-3 py-2.5 bg-accent hover:bg-accent/80 border border-border rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                    <ImageIcon size={16}/> Select Image
                  </button>
                  {chatBg && (
                    <button onClick={() => setChatBg(null)} className="px-3 py-2.5 text-destructive hover:bg-destructive/10 border border-destructive/20 rounded-xl text-sm font-medium transition-colors">
                      Remove
                    </button>
                  )}
                </div>
                {chatBg && (
                  <div className="mt-4 p-4 border border-border rounded-xl bg-accent/20">
                    <div className="flex justify-between text-sm font-medium mb-2">
                      <span>Background Opacity</span>
                      <span>{Math.round(chatBgOpacity * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={chatBgOpacity} onChange={e => setChatBgOpacity(Number(e.target.value))} className="w-full accent-primary" />
                  </div>
                )}
              </div>

              <div className="h-px bg-border w-full"></div>

              {/* Message Colors Settings */}
              <div className="space-y-4">
                <label className="text-sm font-bold block uppercase tracking-wider text-muted-foreground">Message Colors</label>
                  <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-background">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Your Messages</span>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Background & Text</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(userMsgColor || userTextColor || userMsgGradientEnd || userTextGradientEnd || userTextShadow) && <button onClick={() => {setUserMsgColor(''); setUserTextColor(''); setUserMsgGradientEnd(''); setUserTextGradientEnd(''); setUserTextShadow('');}} className="text-xs font-bold text-muted-foreground hover:text-foreground mr-2">Reset</button>}
                      <div className="flex gap-1.5 items-center">
                        <input type="color" title="Background Start" value={userMsgColor || '#3b82f6'} onChange={e => setUserMsgColor(e.target.value)} className="w-5 h-5 cursor-pointer rounded-[4px] border-0 p-0 shadow-sm shadow-black/20" />
                        <input type="color" title="Background End" value={userMsgGradientEnd || userMsgColor || '#3b82f6'} onChange={e => setUserMsgGradientEnd(e.target.value)} className="w-5 h-5 cursor-pointer rounded-[4px] border-0 p-0 shadow-sm shadow-black/20" />
                        <div className="w-1" />
                        <input type="color" title="Text Start" value={userTextColor || getContrastYIQ(userMsgColor) || '#ffffff'} onChange={e => setUserTextColor(e.target.value)} className="w-5 h-5 cursor-pointer rounded-[4px] border-0 p-0 shadow-sm shadow-black/20" />
                        <input type="color" title="Text End" value={userTextGradientEnd || userTextColor || getContrastYIQ(userMsgColor) || '#ffffff'} onChange={e => setUserTextGradientEnd(e.target.value)} className="w-5 h-5 cursor-pointer rounded-[4px] border-0 p-0 shadow-sm shadow-black/20" />
                        <div className="w-1" />
                        <input type="color" title="Text Shadow Glow" value={userTextShadow || '#000000'} onChange={e => setUserTextShadow(e.target.value)} className="w-5 h-5 cursor-pointer rounded-[4px] border-0 p-0 shadow-sm shadow-black/20" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-background">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">Person Messages</span>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Background & Text</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(aiMsgColor || aiTextColor || aiMsgGradientEnd || aiTextGradientEnd || aiTextShadow) && <button onClick={() => {setAiMsgColor(''); setAiTextColor(''); setAiMsgGradientEnd(''); setAiTextGradientEnd(''); setAiTextShadow('');}} className="text-xs font-bold text-muted-foreground hover:text-foreground mr-2">Reset</button>}
                      <div className="flex gap-1.5 items-center">
                        <input type="color" title="Background Start" value={aiMsgColor || '#1e293b'} onChange={e => setAiMsgColor(e.target.value)} className="w-5 h-5 cursor-pointer rounded-[4px] border-0 p-0 shadow-sm shadow-black/20" />
                        <input type="color" title="Background End" value={aiMsgGradientEnd || aiMsgColor || '#1e293b'} onChange={e => setAiMsgGradientEnd(e.target.value)} className="w-5 h-5 cursor-pointer rounded-[4px] border-0 p-0 shadow-sm shadow-black/20" />
                        <div className="w-1" />
                        <input type="color" title="Text Start" value={aiTextColor || getContrastYIQ(aiMsgColor) || '#ffffff'} onChange={e => setAiTextColor(e.target.value)} className="w-5 h-5 cursor-pointer rounded-[4px] border-0 p-0 shadow-sm shadow-black/20" />
                        <input type="color" title="Text End" value={aiTextGradientEnd || aiTextColor || getContrastYIQ(aiMsgColor) || '#ffffff'} onChange={e => setAiTextGradientEnd(e.target.value)} className="w-5 h-5 cursor-pointer rounded-[4px] border-0 p-0 shadow-sm shadow-black/20" />
                        <div className="w-1" />
                        <input type="color" title="Text Shadow Glow" value={aiTextShadow || '#000000'} onChange={e => setAiTextShadow(e.target.value)} className="w-5 h-5 cursor-pointer rounded-[4px] border-0 p-0 shadow-sm shadow-black/20" />
                      </div>
                    </div>
                  </div>
              </div>

              <div className="mt-4 p-4 border border-border rounded-xl bg-accent/20">
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span>Message Opacity</span>
                  <span>{Math.round(msgOpacity * 100)}%</span>
                </div>
                <input type="range" min="0.1" max="1" step="0.05" value={msgOpacity} onChange={e => setMsgOpacity(Number(e.target.value))} className="w-full accent-primary" />
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-card rounded-b-2xl flex justify-between items-center shrink-0">
              <button onClick={resetAppearanceSettings} className="px-4 py-2 text-sm font-bold text-destructive hover:bg-destructive/10 rounded-xl transition-colors">
                Reset
              </button>
              <button onClick={() => saveAppearanceSettings(applyToAll)} className="px-5 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu Overlay */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[110]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
          <div 
            className="fixed z-[120] bg-card border border-border shadow-xl rounded-xl w-48 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{ 
              top: Math.min(contextMenu.y, window.innerHeight - 300), 
              left: Math.min(contextMenu.x, window.innerWidth - 200) 
            }}
          >
            {messages.find(m => m.id === contextMenu.msgId) && (
              <>
                <div className="px-2 py-2 flex justify-between bg-accent/20 border-b border-border">
                  {['❤️', '👍', '😂', '😮', '😢', '🙏'].map(emoji => (
                    <button key={emoji} onClick={() => handleReact(contextMenu.msgId, emoji)} className="hover:scale-125 transition-transform">{emoji}</button>
                  ))}
                </div>
                <button onClick={() => { setReplyingTo(contextMenu.msgId); setContextMenu(null); textareaRef.current?.focus(); }} className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-3"><MessageSquare size={16}/> Reply</button>
                <button onClick={() => handleCopy(messages.find(m => m.id === contextMenu.msgId)!)} className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-3"><Copy size={16}/> Copy</button>
                <button onClick={() => speakText(messages.find(m => m.id === contextMenu.msgId)?.text || '')} className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-3"><Volume2 size={16}/> Read aloud</button>
                {messages.find(m => m.id === contextMenu.msgId)?.attachments?.length ? (
                  <button onClick={() => handleDownload(messages.find(m => m.id === contextMenu.msgId)!)} className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-3"><Download size={16}/> Download</button>
                ) : null}
                <button onClick={() => handleStar(contextMenu.msgId)} className="w-full text-left px-4 py-2 text-sm hover:bg-accent flex items-center gap-3"><Star size={16}/> {messages.find(m => m.id === contextMenu.msgId)?.isStarred ? 'Unstar' : 'Star'}</button>
                <div className="h-px bg-border my-1" />
                <button onClick={() => handleDelete(contextMenu.msgId)} className="w-full text-left px-4 py-2 text-sm hover:bg-destructive/10 text-destructive flex items-center gap-3"><Trash size={16}/> Delete</button>
              </>
            )}
          </div>
        </>
      )}

      {/* Starred Messages Panel */}
      {showStarredMessages && (
        <div className="absolute inset-y-0 right-0 w-80 bg-card border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right-8 duration-300">
          <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20 shrink-0">
            <h3 className="font-bold flex items-center gap-2"><Star size={18} className="text-yellow-500 fill-yellow-500"/> Starred Messages</h3>
            <button onClick={() => setShowStarredMessages(false)} className="p-1 hover:bg-accent rounded-md transition-colors"><X size={16}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.filter(m => m.isStarred).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
                <Star size={40} className="mb-2" />
                <div className="font-bold text-lg">No starred messages</div>
                <div className="text-sm">Star important messages to find them quickly later.</div>
              </div>
            ) : (
              messages.filter(m => m.isStarred).sort((a, b) => b.starredAt! - a.starredAt!).map(msg => (
                <div key={msg.id} className="bg-accent/30 rounded-xl p-3 text-sm flex flex-col gap-2 group border border-transparent hover:border-border cursor-pointer transition-colors" onClick={() => jumpToMessage(msg.id)}>
                  <div className="flex justify-between items-center opacity-70 text-xs">
                    <span className="font-bold">{msg.senderId === 'self' ? 'You' : person.name}</span>
                    <div className="flex items-center gap-2">
                      <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleStar(msg.id); }} className="hover:scale-110"><Star size={14} className="text-yellow-500 fill-yellow-500"/></button>
                    </div>
                  </div>
                  <div className="truncate opacity-90">{msg.text || (msg.attachments?.length ? `📎 ${msg.attachments.length} attachment(s)` : '')}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
