import { motion, AnimatePresence } from 'framer-motion';
import { Download, ArrowRight, Sparkles, MousePointerClick } from 'lucide-react';
import appConfig from '../config/appConfig';
import { useState, useEffect } from 'react';

const TypewriterText = ({ text }: { text: string }) => {
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    if (!isDeleting && displayText === text) {
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayText === '') {
      setIsDeleting(false);
    } else {
      timeout = setTimeout(() => {
        setDisplayText(current => {
          if (isDeleting) return current.slice(0, -1);
          return text.slice(0, current.length + 1);
        });
      }, isDeleting ? 30 : 60);
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, text]);

  return (
    <span>
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
        className="inline-block w-[2px] h-[1em] bg-primary ml-1 align-middle"
      />
    </span>
  );
};

export default function Hero() {
  const [isBtnHovered, setIsBtnHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: -1000, y: -1000 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <section 
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setMousePosition({ x: -1000, y: -1000 })}
    >
      {/* Interactive Cursor Glow (Light Theme) */}
      <div 
        className="pointer-events-none absolute w-[600px] h-[600px] rounded-full blur-[80px] opacity-100 dark:opacity-0 transition-opacity duration-300 z-0"
        style={{
          background: 'radial-gradient(circle, rgba(99,102,241,0.5) 0%, rgba(168,85,247,0.2) 40%, transparent 70%)',
          left: mousePosition.x - 300,
          top: mousePosition.y - 300,
          mixBlendMode: 'multiply'
        }}
      />
      <div className="absolute inset-0 bg-hero-pattern opacity-60 dark:opacity-30 pointer-events-none" />
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '4s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <img 
            src={`${import.meta.env.BASE_URL}icon.png`} 
            alt="Kiseki Record" 
            className="w-24 h-24 mx-auto rounded-2xl shadow-2xl animate-float"
          />
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-bold mb-6"
        >
          <span className="gradient-text">{appConfig.name}</span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="text-xl md:text-2xl text-muted-foreground mb-4"
        >
          {appConfig.tagline}
        </motion.p>

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto min-h-[3rem]"
        >
          <TypewriterText text={appConfig.description} />
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center relative"
        >
          <div className="relative">
            <a
              href="#download"
              onMouseEnter={() => setIsBtnHovered(true)}
              onMouseLeave={() => setIsBtnHovered(false)}
              className="group px-8 py-4 gradient-bg text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl active:scale-95 active:!bg-none active:bg-purple-800 active:text-purple-100 dark:active:!bg-white dark:active:text-primary transition-all duration-300 flex items-center gap-2 relative z-10"
            >
              <Download size={20} />
              Download for Windows
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </a>
            
            {/* Hover Floating Icon */}
            <AnimatePresence>
              {isBtnHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.8, rotate: -20 }}
                  animate={{ opacity: 1, y: 0, scale: 1, rotate: [0, -10, 10, -10, 0] }}
                  exit={{ opacity: 0, scale: 0.5, rotate: -20 }}
                  transition={{ 
                    duration: 0.3,
                    rotate: { repeat: Infinity, duration: 1, ease: "easeInOut" }
                  }}
                  className="absolute -top-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center"
                >
                  <div className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg mb-1 whitespace-nowrap">
                    Click me!
                  </div>
                  <MousePointerClick size={24} className="text-primary fill-primary/20" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <a
            href="#features"
            className="px-8 py-4 glass-card rounded-xl font-semibold text-lg hover:bg-accent transition-all duration-300 flex items-center gap-2"
          >
            <Sparkles size={20} />
            View Features
          </a>
        </motion.div>

        {/* Version info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mt-12 text-sm text-muted-foreground"
        >
          <span className="glass px-4 py-2 rounded-full">
            Latest Version: {appConfig.latestRelease.version} • {appConfig.latestRelease.fileSize}
          </span>
        </motion.div>
      </div>
    </section>
  );
}
