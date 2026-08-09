import { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import LoadingScreen from './components/LoadingScreen';
import Footer from './components/Footer';
import Hero from './sections/Hero';
import Features from './sections/Features';
import HowToUse from './sections/HowToUse';
import Download from './sections/Download';
import Changelog from './sections/Changelog';
import FAQ from './sections/FAQ';
import Privacy from './sections/Privacy';
import Contact from './sections/Contact';
import { useRightClickScroll } from './hooks/useRightClickScroll';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  useRightClickScroll();

  useEffect(() => {
    const handleLoad = () => {
      setTimeout(() => setIsLoading(false), 800);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  return (
    <>
      <LoadingScreen isLoading={isLoading} />
      <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Hero />
        <Features />
        <HowToUse />
        <Download />
        <Changelog />
        <FAQ />
        <Privacy />
        <Contact />
      </main>
      <Footer />
    </div>
    </>
  );
}

export default App;
