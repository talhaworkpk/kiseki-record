import React from 'react'
import { Check, CheckCheck, FileText, Image as ImageIcon, Video, Folder, Download, Eye, AlertCircle, Clock, Star } from 'lucide-react'
import { RelationshipMessage } from '../../types'
import { getSafeMediaUrl, normalizeUrl } from '../../lib/utils'

interface MessageBubbleProps {
  message: RelationshipMessage
  isUser: boolean
  appearance: {
    bgC?: string
    bgGradEnd?: string
    txtC?: string
    txtGradEnd?: string
    txtShadow?: string
    msgOpacity?: number
  }
  onContextMenu?: (e: React.MouseEvent, msgId: string) => void
  onResend?: (msgId: string) => void
  quotedMessage?: RelationshipMessage
}

export default function MessageBubble({ message, isUser, appearance, onContextMenu, onResend, quotedMessage }: MessageBubbleProps) {
  const { bgC, bgGradEnd, txtC, txtGradEnd, txtShadow, msgOpacity = 1.0 } = appearance

  let backgroundStyle = bgC || undefined
  if (bgGradEnd && bgC) {
    backgroundStyle = `linear-gradient(to right, ${bgC}, ${bgGradEnd})`
  }

  let textStyle: React.CSSProperties = {}
  if (txtGradEnd && txtC) {
    textStyle = {
      backgroundImage: `linear-gradient(to right, ${txtC}, ${txtGradEnd}, ${txtC})`,
      backgroundSize: '4ch 100%',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      color: 'transparent'
    }
  } else if (txtC) {
    textStyle = { color: txtC }
  }

  if (txtShadow) {
    textStyle.textShadow = `0 0 10px ${txtShadow}`
    if (textStyle.WebkitTextFillColor) {
      textStyle.filter = `drop-shadow(0 0 10px ${txtShadow})`
    }
  }

  const bubbleStyle = backgroundStyle ? { background: backgroundStyle } : {}

  const hasAttachments = message.attachments && message.attachments.length > 0

  return (
    <div id={`msg-${message.id}`} className={`flex gap-4 group ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex flex-col gap-1 max-w-[85%] min-w-[200px] ${isUser ? 'items-end' : 'items-start'}`}>
        <div 
          className={`px-4 py-3 shadow-sm transition-all duration-200 relative
            ${isUser ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm'} 
            ${!bgC && isUser ? 'bg-primary text-primary-foreground' : ''} 
            ${!bgC && !isUser ? 'bg-card border border-border text-foreground' : ''}`}
          style={{ ...bubbleStyle, opacity: msgOpacity }}
          onContextMenu={(e) => onContextMenu?.(e, message.id)}
        >
          {message.isStarred && (
            <div className={`absolute ${isUser ? '-left-2' : '-right-2'} -top-2 bg-yellow-400 text-white rounded-full p-0.5 shadow-sm`}>
              <Star size={12} fill="currentColor" />
            </div>
          )}

          {/* Quoted Message Preview */}
          {quotedMessage && (
            <div 
              className={`mb-2 p-2 rounded-lg border-l-4 text-xs opacity-90 cursor-pointer overflow-hidden ${!bgC && isUser ? 'bg-primary-foreground/20 border-primary-foreground/50' : 'bg-foreground/5 border-foreground/30'}`}
              style={{ background: bgC ? 'rgba(0,0,0,0.1)' : undefined }}
              onClick={() => {
                const el = document.getElementById(`msg-${quotedMessage.id}`)
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  el.classList.add('animate-pulse', 'bg-accent/30')
                  setTimeout(() => el.classList.remove('animate-pulse', 'bg-accent/30'), 2000)
                }
              }}
            >
              <div className="font-bold opacity-80 mb-0.5">{quotedMessage.senderId === 'self' ? 'You' : 'Them'}</div>
              <div className="truncate opacity-90">{quotedMessage.text || (quotedMessage.attachments?.length ? 'Attachment' : '')}</div>
            </div>
          )}

          {/* Attachments Section */}
          {hasAttachments && (
            <div className="flex flex-col gap-2 mb-2 w-full">
              {message.attachments.map((attachment, idx) => {
                const isImage = attachment.mimeType.startsWith('image/')
                const isVideo = attachment.mimeType.startsWith('video/')
                
                // If it's imported but unavailable, localPath might be a placeholder or empty
                const isUnavailable = !attachment.localPath || attachment.localPath === 'UNAVAILABLE'

                if (isUnavailable) {
                  return (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-black/10 dark:bg-white/10 rounded-lg border border-black/5 dark:border-white/5">
                      <AlertCircle size={20} className="text-yellow-500 shrink-0" />
                      <div className="flex flex-col overflow-hidden text-xs" style={textStyle}>
                        <span className="truncate font-semibold text-yellow-500">{attachment.fileName}</span>
                        <span className="opacity-70">Attachment unavailable</span>
                      </div>
                    </div>
                  )
                }

                if (isImage) {
                  return (
                    <div key={idx} className="relative group/att rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-black/5">
                      <img src={normalizeUrl(attachment.localPath)} className="w-full h-auto max-h-64 object-cover" alt={attachment.fileName} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={() => window.open(normalizeUrl(attachment.localPath), '_blank')} className="p-2 bg-white/20 text-white rounded hover:bg-white/40"><Eye size={16}/></button>
                      </div>
                    </div>
                  )
                }

                if (isVideo) {
                  return (
                    <div key={idx} className="relative group/att rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-black/90">
                      <video src={getSafeMediaUrl(attachment.localPath)} controls className="w-full max-h-64 object-contain" />
                    </div>
                  )
                }

                // Default Document Card
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 rounded-lg transition-colors border border-black/5 dark:border-white/5 cursor-pointer" onClick={() => window.api.shell.openExternal(attachment.localPath)}>
                    <div className="p-2 bg-background/50 rounded shrink-0">
                      <FileText size={20} className={!bgC && isUser ? 'text-primary' : 'text-primary'} style={txtC ? { color: txtC } : {}} />
                    </div>
                    <div className="flex flex-col overflow-hidden text-xs" style={textStyle}>
                      <span className="truncate font-semibold">{attachment.fileName}</span>
                      <span className="opacity-70">{(attachment.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Message Text */}
          {message.text && (
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed break-words" style={textStyle}>
              {message.text}
            </p>
          )}

          {/* Footer (Time & Status) */}
          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] opacity-70" style={textStyle}>
            <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isUser && (
              <span className="ml-1 flex items-center">
                {message.status === 'pending' && <Clock size={12} />}
                {message.status === 'sent' && <Check size={12} />}
                {(message.status === 'delivered' || message.status === 'read') && <CheckCheck size={14} />}
                {message.status === 'failed' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onResend?.(message.id); }}
                    className="flex items-center gap-1 bg-destructive/10 text-destructive hover:bg-destructive/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                    title="Click to resend"
                  >
                    <AlertCircle size={12} />
                    <span className="text-[9px] font-bold">Resend</span>
                  </button>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Reactions row */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1
                return acc
              }, {} as Record<string, number>)
            ).map(([emoji, count]) => (
              <div key={emoji} className="bg-card border border-border shadow-sm rounded-full px-2 py-0.5 text-xs flex items-center gap-1">
                <span>{emoji}</span>
                <span className="opacity-70">{count}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
