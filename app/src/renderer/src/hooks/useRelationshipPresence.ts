import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useRelationshipPresence(personId: string | undefined, lastInteraction?: number, kisekiId?: string) {
  const [presence, setPresence] = useState<{ status: 'Online' | 'Offline', text: string }>({
    status: 'Online',
    text: 'Online'
  })

  useEffect(() => {
    if (!personId) return

    // Since this is an offline-first app, true real-time online status isn't applicable without a backend.
    // However, to satisfy the requirement of a presence abstraction:
    // If the person had an interaction in the last 5 minutes, we consider them "Online".
    // Otherwise, we show "Last seen..." based on their lastInteraction.

    const checkPresence = async () => {
      let activeLastInteraction = lastInteraction

      // If we have a kisekiId, try to fetch their real last_seen_at from Supabase
      if (kisekiId && navigator.onLine) {
        try {
          const { data } = await supabase
            .from('kiseki_users')
            .select('last_seen_at')
            .eq('kiseki_id', kisekiId)
            .single()
          if (data && data.last_seen_at) {
            activeLastInteraction = new Date(data.last_seen_at).getTime()
          }
        } catch (e) {
          console.error('Failed to fetch remote presence', e)
        }
      }

      const now = Date.now()
      
      if (activeLastInteraction) {
        const timeDiff = now - activeLastInteraction
        const fiveMinutes = 5 * 60 * 1000
        
        if (timeDiff < fiveMinutes) {
          setPresence({ status: 'Online', text: 'Online' })
        } else {
          // Format last seen
          const lastSeenDate = new Date(activeLastInteraction)
          const isToday = new Date().toDateString() === lastSeenDate.toDateString()
          const timeString = lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          
          if (isToday) {
            setPresence({ status: 'Offline', text: `Last seen today at ${timeString}` })
          } else {
            const dateString = lastSeenDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            setPresence({ status: 'Offline', text: `Last seen ${dateString} at ${timeString}` })
          }
        }
      } else {
        setPresence({ status: 'Online', text: 'Online' })
      }
    }

    checkPresence()
    
    // Periodically update the presence status every minute to refresh relative times
    const interval = setInterval(checkPresence, 60000)
    
    return () => clearInterval(interval)
  }, [personId, lastInteraction, kisekiId])

  return presence
}
