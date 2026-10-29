import { notFound, redirect } from 'next/navigation';
import { Preview } from '../../../../../../components/preview';
import { scenarioName } from '../../../../../../lib/fixtures';
import { artworks } from '../../../../../../v2/artwork';
import { MusicRackStudy } from '../../../../../../components/music-rack-study';
export default async function ArtworkPage({ params, searchParams }: {
  params: Promise<{ artwork: string; section?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { artwork, section } = await params;
  const query = await searchParams;
  if (section && (section.length !== 1 || section[0] !== 'about')) notFound();
  if (['glass-current', 'aero-player', 'liquid-star'].includes(artwork)) {
    const preserved = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) preserved.append(key, item);
    }
    preserved.set('v', '1');
    redirect(`/prototypes/disc-tray/artwork/orbital-disc${section ? '/about' : ''}?${preserved}`);
  }
  const index = artworks.findIndex(item => item.slug === artwork);
  if (index < 0) notFound();
  if (!section && query.view !== 'app' && query.interface !== 'classic') return <MusicRackStudy mode={query.mode === 'demo' ? 'demo' : 'real'} fixture={scenarioName(typeof query.fixture === 'string' ? query.fixture : 'entry')} />;
  return <Preview initialVariant={2} initialArtwork={index + 1} initialMode={query.mode === 'demo' ? 'demo' : 'real'}
    initialFixture={scenarioName(typeof query.fixture === 'string' ? query.fixture : 'entry')} initialBackground={query.background === 'crisp' ? 'crisp' : 'hazy'} initialWaterMotion={query.water !== 'still'} initialFullPlayer={query.interface !== 'classic'} about={section?.[0] === 'about'} />;
}
