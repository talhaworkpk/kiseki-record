import { motion } from 'framer-motion';
import { GitCommit } from 'lucide-react';
import appConfig from '../config/appConfig';

export default function Changelog() {
  return (
    <section id="changelog" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Changelog</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Follow the development journey and see what's new in each release.
          </p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {appConfig.changelog.map((entry, index) => (
            <motion.div
              key={entry.version}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative pl-8 pb-12 last:pb-0"
            >
              {/* Timeline line */}
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-border" />
              
              {/* Timeline dot */}
              <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full gradient-bg shadow-lg" />

              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <GitCommit className="text-primary" size={20} />
                    <h3 className="text-xl font-bold">Version {entry.version}</h3>
                  </div>
                  <span className="text-sm text-muted-foreground">{entry.date}</span>
                </div>
                <ul className="space-y-2">
                  {entry.changes.map((change, changeIndex) => (
                    <li key={changeIndex} className="flex items-start gap-2 text-muted-foreground">
                      <span className="text-primary mt-1.5">•</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
