import type { Metadata, Viewport } from 'next';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/michroma/latin-400.css';
import './globals.css';
import '../v1/style.css';
import '../v2/style.css';
import '../v3/style.css';
import '../v4/style.css';
import '../v5/style.css';
import '../v2/studies.css';
import '../v2/atmosphere.css';
import '../v2/player.css';
import '../v2/rack.css';
import '../v2/rack-study.css';
import '../components/ui/liquid-glass.css';
import { LiquidGlass } from '../components/ui/liquid-glass';

export const metadata: Metadata = { title: 'Music Recommender — discover your next song', description: 'Start with one song and explore connections through shared listening, with recommendation details and links to listen.' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#F4F9FF' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><LiquidGlass />{children}</body></html>;
}
