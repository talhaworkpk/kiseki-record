import { motion } from 'framer-motion';
import { Shield, Lock, Database, EyeOff } from 'lucide-react';

export default function Privacy() {
  const privacyFeatures = [
    {
      icon: Shield,
      title: 'Data Stays on Your Computer',
      description: 'All your personal data is stored locally on your device. Nothing is ever sent to external servers without your explicit consent.',
    },
    {
      icon: Lock,
      title: 'Encrypted Storage',
      description: 'Your data is stored securely with encryption options available through our vault backup system.',
    },
    {
      icon: Database,
      title: 'Offline-First Architecture',
      description: 'The application is designed to work completely offline. Your data never needs to leave your device for core functionality.',
    },
    {
      icon: EyeOff,
      title: 'No Tracking or Telemetry',
      description: 'We do not collect any usage data, analytics, or tracking information. Your privacy is respected at all times.',
    },
  ];

  return (
    <section id="privacy" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Privacy First</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your data belongs to you. We believe in complete privacy and data ownership.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {privacyFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-white mb-4">
                <feature.icon size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="glass-card rounded-3xl p-8 text-center"
        >
          <h3 className="text-2xl font-bold mb-4">You Own Your Data</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            Unlike many applications that hold your data hostage, Kiseki Record gives you full control. 
            Export your data anytime, in a standard format that you can use elsewhere. Your memories, 
            your relationships, your life - they belong to you.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 rounded-full text-sm font-medium">
            <Shield size={16} />
            Open Source & Transparent
          </div>
        </motion.div>
      </div>
    </section>
  );
}
