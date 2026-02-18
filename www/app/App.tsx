import { Navigation } from './components/Navigation';
import { HeroSection } from './components/HeroSection';
import { FeaturesGrid } from './components/FeaturesGrid';
import { ScreenshotsSection } from './components/ScreenshotsSection';
import { DownloadSection } from './components/DemoSection';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navigation />
      <HeroSection />
      <FeaturesGrid />
      <ScreenshotsSection />
      <DownloadSection />
      <Footer />
    </div>
  );
}
