import { motion, AnimatePresence } from 'framer-motion';
import { Download as DownloadIcon, Package, Calendar, HardDrive, CheckCircle, Copy, Heart } from 'lucide-react';
import appConfig from '../config/appConfig';
import { useState } from 'react';
import { BirthdayBackground } from '../components/BirthdayBackground';

export default function Download() {
  const [copied, setCopied] = useState(false);
  const [isDownloadHovered, setIsDownloadHovered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadClick = () => {
    setIsDownloading(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(appConfig.latestRelease.sha256 || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="download" className="py-20 relative overflow-hidden transition-colors duration-1000">
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out pointer-events-none dark:hidden ${
          isDownloading ? 'bg-celebration opacity-100' : 'opacity-0'
        }`} 
      />
      {isDownloading && <BirthdayBackground />}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="gradient-text">Download</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get the latest version of Kiseki Record and start organizing your life today.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          {/* Version Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-card rounded-3xl p-8 mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold mb-1">Version {appConfig.latestRelease.version}</h3>
                <p className="text-muted-foreground">Released on {appConfig.latestRelease.releaseDate}</p>
              </div>
              <div className="px-4 py-2 bg-green-500/10 text-green-500 rounded-full text-sm font-medium">
                Latest
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="flex items-center gap-3 p-4 bg-accent rounded-xl">
                <Package className="text-primary" size={24} />
                <div>
                  <p className="text-sm text-muted-foreground">File Size</p>
                  <p className="font-semibold">{appConfig.latestRelease.fileSize}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-accent rounded-xl">
                <Calendar className="text-primary" size={24} />
                <div>
                  <p className="text-sm text-muted-foreground">Release Date</p>
                  <p className="font-semibold">{appConfig.latestRelease.releaseDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-accent rounded-xl">
                <HardDrive className="text-primary" size={24} />
                <div>
                  <p className="text-sm text-muted-foreground">Platform</p>
                  <p className="font-semibold">Windows 10+</p>
                </div>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={appConfig.latestRelease.downloadUrl}
                onClick={handleDownloadClick}
                onMouseEnter={() => setIsDownloadHovered(true)}
                onMouseLeave={() => setIsDownloadHovered(false)}
                className="flex-1 px-6 py-4 gradient-bg text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group"
              >
                <div className={`absolute inset-0 transition-opacity duration-500 ${isDownloading ? 'bg-white/20 opacity-100' : 'opacity-0'}`} />
                <DownloadIcon size={20} className="relative z-10" />
                <span className="relative z-10">Download Installer (.exe)</span>
              </a>
              {appConfig.latestRelease.portableUrl && (
                <a
                  href={appConfig.latestRelease.portableUrl}
                  className="flex-1 px-6 py-4 glass-card rounded-xl font-semibold text-lg hover:bg-accent transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Package size={20} />
                  Portable Version ({appConfig.latestRelease.portableFileSize})
                </a>
              )}
            </div>
          </motion.div>

          {/* System Requirements */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-card rounded-3xl p-8 mb-8"
          >
            <h3 className="text-xl font-bold mb-4">System Requirements</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-500 mt-0.5" size={20} />
                <div>
                  <p className="font-medium">Operating System</p>
                  <p className="text-sm text-muted-foreground">{appConfig.systemRequirements.os}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-500 mt-0.5" size={20} />
                <div>
                  <p className="font-medium">Memory</p>
                  <p className="text-sm text-muted-foreground">{appConfig.systemRequirements.ram}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-500 mt-0.5" size={20} />
                <div>
                  <p className="font-medium">Storage</p>
                  <p className="text-sm text-muted-foreground">{appConfig.systemRequirements.storage}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-500 mt-0.5" size={20} />
                <div>
                  <p className="font-medium">Processor</p>
                  <p className="text-sm text-muted-foreground">{appConfig.systemRequirements.processor}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* SHA256 Checksum */}
          {appConfig.latestRelease.sha256 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="glass-card rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">SHA256 Checksum</h3>
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <code className="block w-full p-3 bg-accent rounded-lg text-sm text-muted-foreground break-all font-mono">
                {appConfig.latestRelease.sha256}
              </code>
            </motion.div>
          )}
        </div>
      </div>

      {/* Floating Happy Icon when hovered */}
      <AnimatePresence>
        {isDownloadHovered && (
          <motion.div
            initial={{ opacity: 0, y: 100, x: 50, scale: 0.5, rotate: -20 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              x: 0, 
              scale: 1, 
              rotate: [0, -15, 15, -15, 15, 0],
            }}
            exit={{ opacity: 0, y: 100, scale: 0.5 }}
            transition={{ 
              duration: 0.5,
              rotate: { repeat: Infinity, duration: 1.5, ease: "easeInOut" } 
            }}
            className="fixed bottom-8 right-8 z-50 pointer-events-none"
          >
            <div className="bg-primary text-white p-4 rounded-full shadow-2xl flex items-center justify-center gap-2">
              <Heart 
                size={32} 
                className={`transition-all duration-500 ${isDownloading ? 'fill-red-500 text-red-500 scale-125' : 'text-white'}`} 
              />
              <span className="font-bold text-lg hidden sm:inline-block pr-2">
                {isDownloading ? "Woohoo!" : "Thank you!"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
