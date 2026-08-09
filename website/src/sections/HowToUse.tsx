import { useState } from 'react';
import { motion } from 'framer-motion';
import { MousePointer2, MonitorSmartphone, RefreshCw, DatabaseBackup, Info, CalendarDays, Wallpaper, Palette, Cpu } from 'lucide-react';

export default function HowToUse() {
  const [hoveredTip, setHoveredTip] = useState<number | null>(null);

  const tips = [
    {
      icon: <MousePointer2 size={24} />,
      title: 'Right-Click Drag to Scroll',
      description: <>Throughout the app, you might notice hidden horizontal or vertical scrollbars for a cleaner look. You can seamlessly scroll anywhere by simply holding down the <strong className="text-foreground">Right Mouse Button</strong> and dragging up, down, left, or right!</>,
    },
    {
      icon: <MonitorSmartphone size={24} />,
      title: 'Dual Mode Toggle',
      description: <>Press <strong className="text-foreground">Ctrl + Alt + Shift + P</strong> to toggle Dual Mode. This powerful feature completely changes how you interact with your data and windows.</>,
    },
    {
      icon: <RefreshCw size={24} />,
      title: 'Quick Restart',
      description: <>If you ever need to quickly refresh or restart the application to apply new settings, simply press <strong className="text-foreground">Ctrl + Alt + Shift + R</strong> anywhere in the app.</>,
    },
    {
      icon: <DatabaseBackup size={24} />,
      title: 'Smart Vault Backups',
      description: <>Exporting your Vault creates a highly secure, encrypted backup file (<strong className="text-foreground">.kvault</strong>) of your entire life record. The app will automatically store your 3 most recent exports securely within the Settings menu. You can easily <strong className="text-foreground">Import</strong> (replace your current data), <strong className="text-foreground">Merge</strong> (combine with current data), or <strong className="text-foreground">Download</strong> these backups directly from the app interface without hunting for files on your computer.</>,
    },
    {
      icon: <CalendarDays size={24} />,
      title: 'Dashboard Calendar',
      description: <>Your Dashboard Calendar is a powerful tool to navigate your life history. Use it to instantly see which days have logged memories or activities, and <strong className="text-foreground">click on any date to jump back in time</strong> and review that specific day's entries.</>,
    },
    {
      icon: <Wallpaper size={24} />,
      title: 'Dynamic App Backgrounds',
      description: <>Kiseki Record rewards consistency! You can unlock and apply stunning dynamic backgrounds for your app by fulfilling specific, <strong className="text-foreground">hidden conditions</strong> as you track your life.</>,
    },
    {
      icon: <Palette size={24} />,
      title: 'AI Chat Customization',
      description: <>Make your AI assistant truly yours. Dive into the settings to fully customize your AI chat experience, including <strong className="text-foreground">changing the chat backgrounds, message bubble styles, and text colors</strong> to match your aesthetic.</>,
    },
    {
      icon: <Cpu size={24} />,
      title: 'Local AI with Ollama',
      description: <>Take full control of your privacy by running AI completely offline! Download <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">Ollama</a>, install your preferred local AI model, and connect it seamlessly in Kiseki Record's AI settings.</>,
    }
  ];

  return (
    <section id="how-to-use" className="relative py-20 bg-muted/30 overflow-hidden transition-colors duration-700">
      {/* Dynamic 3D SVG Background layer for the section */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none ${
          hoveredTip !== null ? `bg-3d-${(hoveredTip % 7) + 1} bg-3d-animated bg-3d-pattern opacity-15 dark:opacity-20` : 'opacity-0'
        }`} 
      />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">How To Use</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Master the Kiseki Record application with these essential tips, hidden shortcuts, and advanced features.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {tips.map((tip, index) => (
            <motion.div
              key={tip.title}
              initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.02, rotateX: 2, rotateY: index % 2 === 0 ? 2 : -2, z: 20 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative glass-card rounded-2xl p-8 flex flex-col md:flex-row gap-6 items-start overflow-hidden perspective-1000"
              onMouseEnter={() => setHoveredTip(index)}
              onMouseLeave={() => setHoveredTip(null)}
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-[0.15] dark:group-hover:opacity-[0.25] transition-opacity duration-500 bg-3d-${(index % 7) + 1} bg-3d-animated bg-3d-pattern -z-10`} />
              <div className="flex-shrink-0 w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-white shadow-lg relative z-10">
                {tip.icon}
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">{tip.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{tip.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Additional Tip Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 p-6 rounded-2xl border border-primary/20 bg-primary/5 flex items-center gap-4"
        >
          <Info className="text-primary hidden sm:block flex-shrink-0" size={28} />
          <p className="text-sm text-foreground/80">
            <strong className="text-foreground">Pro Tip:</strong> All data is stored locally on your device for absolute privacy. Use the Vault Export feature regularly to ensure your memories and records are safely backed up!
          </p>
        </motion.div>
      </div>
    </section>
  );
}
