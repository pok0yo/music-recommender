import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Requires the existing local PostgreSQL/API and production frontend; never mocks responses.
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
try {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:3000/variants/v1');
  await page.locator('.starter-button').first().waitFor();
  assert.equal(await page.locator('.starter-button').count(), 4);
  assert.equal(await page.getByRole('note').count(), 0);
  const searchResponse = page.waitForResponse(r => r.url().includes('/v1/catalog/search?'));
  await page.getByRole('searchbox').fill('Tiffany');
  await page.getByRole('searchbox').press('Enter');
  const search = await (await searchResponse).json();
  assert.equal(search.meta.data_mode, 'real');
  const response = page.waitForResponse(r => r.url().includes('/v1/recommendations/'));
  await page.getByRole('button', { name: /CLOUDS.*Use this song/i }).click();
  const recommendations = await (await response).json();
  await page.locator('#results-heading').filter({ hasText: 'connections to explore' }).waitFor();
  assert.equal(recommendations.meta.data_mode, 'real');
  assert.equal(await page.locator('.track-list > li').count(), recommendations.results.length);
  assert.equal(await page.locator('.hero-slot').count(), 0);
  assert.ok(recommendations.results.length > 0);
  await page.locator('summary').first().click();
  assert.equal(await page.getByText('Listening link unavailable.', { exact: true }).first().isVisible(), true);
  const seed = recommendations.seed.recording_id;
  await page.goto(`http://127.0.0.1:3000/variants/v5?seed=${seed}`);
  await page.locator('#track-inspector').waitFor();
  assert.equal(await page.locator('.track-list > li').count(), recommendations.results.length);
  assert.deepEqual(errors, []);
  const evidence = {
    observed_at: new Date().toISOString(), browser: browser.version(),
    scope: 'Actual local PostgreSQL, frozen model, API and v1/v5 browser integration; no routes mocked. Not deployed acceptance or a user study.',
    search: { query: 'Tiffany', count: search.results.length, meta: search.meta },
    seed: { recording_id: seed, title: recommendations.seed.title },
    recommendations: { status: recommendations.status, displayed: recommendations.results.length,
      requested_limit: recommendations.requested_limit, model_result_count: recommendations.model_result_count,
      omitted_metadata_count: recommendations.omitted_metadata_count, ranks: recommendations.results.map(t => t.rank), meta: recommendations.meta },
    assertions: ['four real starter choices', 'real search and recommendation metadata', 'rendered count equals API count', 'no demo notice or hero in working state', 'unavailable listening link explicit', 'v5 direct seed loads inspector', 'no page errors'],
  };
  await writeFile('docs/evidence/stage-9-real-smoke.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
} finally { await browser.close(); }
