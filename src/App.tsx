import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Hero from './sections/Hero';
import Features from './sections/Features';
import Screenshots from './sections/Screenshots';
import Download from './sections/Download';
import Changelog from './sections/Changelog';
import FAQ from './sections/FAQ';
import Privacy from './sections/Privacy';
import Contact from './sections/Contact';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Hero />
        <Features />
        <Screenshots />
        <Download />
        <Changelog />
        <FAQ />
        <Privacy />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}

export default App;
