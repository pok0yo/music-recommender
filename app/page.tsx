import { MusicRackStudy } from '../components/music-rack-study';
import { scenarioName } from '../lib/fixtures';

export default async function Home({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return <MusicRackStudy mode={query.mode === 'demo' ? 'demo' : 'real'}
    fixture={scenarioName(typeof query.fixture === 'string' ? query.fixture : 'entry')}
    developerControls={query.dev === '1'} />;
}
