import { motion, AnimatePresence } from 'framer-motion';
import appConfig from '../config/appConfig';

export default function LoadingScreen({ isLoading }: { isLoading: boolean }) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background backdrop-blur-xl"
        >
          <div className="absolute inset-0 bg-hero-pattern opacity-10 dark:opacity-5 pointer-events-none" />
          
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="relative z-10"
          >
            <img src={`${import.meta.env.BASE_URL}icon.png`} alt="Loading..." className="w-24 h-24 rounded-2xl shadow-2xl mb-6" />
          </motion.div>
          
          <motion.h2
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="text-3xl font-bold gradient-text relative z-10"
          >
            {appConfig.name}
          </motion.h2>
          
          <motion.p
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }}
            className="text-muted-foreground mt-3 font-medium relative z-10"
          >
            Loading your experience...
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
