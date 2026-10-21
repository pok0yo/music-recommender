import { notFound } from 'next/navigation';
import { Preview } from '../../../../../components/preview';
import { scenarioName } from '../../../../../lib/fixtures';
import { studySlugs } from '../../../../../v2/studies';
export default async function StudyPage({ params, searchParams }: {
  params: Promise<{ study: string; section?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { study, section } = await params;
  const query = await searchParams;
  const index = studySlugs.indexOf(study);
  if (index < 0 || (section && (section.length !== 1 || section[0] !== 'about'))) notFound();
  return <Preview initialVariant={2} initialStudy={index + 1} initialMode={query.mode === 'demo' ? 'demo' : 'real'}
    initialFixture={scenarioName(typeof query.fixture === 'string' ? query.fixture : 'entry')} about={section?.[0] === 'about'} />;
}
