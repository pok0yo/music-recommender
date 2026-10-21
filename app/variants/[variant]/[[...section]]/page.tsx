import { notFound } from 'next/navigation';
import { Preview } from '../../../../components/preview';
import { scenarioName } from '../../../../lib/fixtures';
export default async function VariantPage({ params, searchParams }: {
  params: Promise<{ variant: string; section?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { variant, section } = await params;
  const query = await searchParams;
  if (!/^v[1-5]$/.test(variant) || (section && (section.length !== 1 || section[0] !== 'about'))) notFound();
  return <Preview initialVariant={Number(variant.slice(1))} initialMode={query.mode === 'demo' ? 'demo' : 'real'}
    initialFixture={scenarioName(typeof query.fixture === 'string' ? query.fixture : 'entry')} about={section?.[0] === 'about'} />;
}
