import { notFound } from 'next/navigation';
import { Preview } from '../../../../../../components/preview';
import { scenarioName } from '../../../../../../lib/fixtures';
import { artworks } from '../../../../../../v2/artwork';
export default async function ArtworkPage({ params, searchParams }: {
  params: Promise<{ artwork: string; section?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { artwork, section } = await params;
  const query = await searchParams;
  const index = artworks.findIndex(item => item.slug === artwork);
  if (index < 0 || (section && (section.length !== 1 || section[0] !== 'about'))) notFound();
  return <Preview initialVariant={2} initialArtwork={index + 1} initialMode={query.mode === 'demo' ? 'demo' : 'real'}
    initialFixture={scenarioName(typeof query.fixture === 'string' ? query.fixture : 'entry')} initialBackground={query.background === 'crisp' ? 'crisp' : 'hazy'} initialWaterMotion={query.water !== 'still'} about={section?.[0] === 'about'} />;
}
