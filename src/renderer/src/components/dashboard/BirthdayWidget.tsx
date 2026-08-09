import React, { useState, useEffect } from 'react'
import { Sparkles, Gift } from 'lucide-react'

const BIRTHDAY_MESSAGES = [
  // 5 Quotes
  { text: "Count your age by friends, not years. Count your life by smiles, not tears.", author: "John Lennon", type: "Quote" },
  { text: "The great thing about getting older is that you don't lose all the other ages you've been.", author: "Madeleine L'Engle", type: "Quote" },
  { text: "Let us never know what old age is. Let us know the happiness time brings, not count the years.", author: "Ausonius", type: "Quote" },
  { text: "Every age can be enchanting, provided you live within it.", author: "Brigitte Bardot", type: "Quote" },
  { text: "Today you are you! That is truer than true! There is no one alive who is you-er than you!", author: "Dr. Seuss", type: "Quote" },
  
  // 5 Poetry
  { text: "Another candle on your cake\nAnother year for you to make\nMore memories to hold so dear\nThroughout the coming happy year.", author: "Anonymous", type: "Poetry" },
  { text: "Time is a canvas, day by day\nWe paint our lives along the way.\nToday's a splash of brilliant hue\nA masterpiece made just for you.", author: "Anonymous", type: "Poetry" },
  { text: "The sun shines brighter on this day\nThe stars will dance, the moon will play\nFor on this day a life began\nA beautiful part of a master plan.", author: "Anonymous", type: "Poetry" },
  { text: "Like a tree that grows so tall\nThrough spring and summer, winter, fall\nYou've grown in wisdom, strength and grace\nTo make this world a better place.", author: "Anonymous", type: "Poetry" },
  { text: "A birthday is a bridge of light\nBetween the past and future bright\nCross over with a heart so free\nAnd embrace the joy of what will be.", author: "Anonymous", type: "Poetry" }
]

export function BirthdayWidget({ userProfile }: { userProfile: any }) {
  if (!userProfile?.dateOfBirth) return null
  
  const currentYear = new Date().getFullYear()
  const birthYear = new Date(userProfile.dateOfBirth).getFullYear()
  const age = currentYear - birthYear
  
  // Deterministic 10-year cycle
  // If the user sees a specific poetry at age X, they will see it again at age X + 10.
  const index = Math.abs(age) % 10
  const message = BIRTHDAY_MESSAGES[index]

  const [displayedText, setDisplayedText] = useState('')

  useEffect(() => {
    let currentLength = 0
    setDisplayedText('')
    
    const intervalId = setInterval(() => {
      setDisplayedText(message.text.substring(0, currentLength + 1))
      currentLength++
      
      if (currentLength >= message.text.length) {
        clearInterval(intervalId)
      }
    }, 40) // Adjust speed here (40ms per character)

    return () => clearInterval(intervalId)
  }, [message.text])

  return (
    <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-purple-500/30 p-8 rounded-3xl shadow-xl backdrop-blur-sm relative overflow-hidden mb-8 group shrink-0">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 p-6 opacity-50 group-hover:opacity-100 transition-opacity">
        <Sparkles className="text-purple-500 w-12 h-12 animate-pulse" />
      </div>
      <div className="absolute bottom-0 left-0 p-6 opacity-20 group-hover:opacity-50 transition-opacity rotate-12">
        <Gift className="text-pink-500 w-16 h-16" />
      </div>
      
      <div className="relative z-10 max-w-2xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-indigo-500 mb-6 font-serif tracking-tight">
          Happy Birthday, {userProfile.fullName.split(' ')[0]}!
        </h2>
        
        <div className="text-lg md:text-xl italic font-medium text-foreground/90 whitespace-pre-wrap leading-relaxed mb-6 font-serif min-h-[100px] flex items-center justify-center relative">
          "{displayedText}"
          {displayedText.length < message.text.length && (
            <span className="w-[2px] h-[1.2em] bg-purple-500 animate-pulse ml-1 inline-block align-middle"></span>
          )}
        </div>
        
        <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-center gap-2">
          <span className="w-8 h-px bg-muted-foreground/30"></span>
          {message.author}
          <span className="w-8 h-px bg-muted-foreground/30"></span>
        </div>
      </div>
    </div>
  )
}
