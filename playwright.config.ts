import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const software = !!(process.env.CI || process.env.PLAYWRIGHT_SOFTWARE);
export default defineConfig({
  // OneDrive can lock live trace files; keep local diagnostic churn outside the checkout.
  outputDir: process.env.CI ? 'test-results/artifacts' : join(tmpdir(), 'music-recommender-playwright'),
  testDir: './tests/frontend', fullyParallel: software, workers: software ? 1 : 2,
  // CPU graphics checks verify behavior; the separate real-API/browser probes measure latency.
  timeout: software ? 120_000 : 30_000, expect: { timeout: software ? 30_000 : 8000 }, reporter: [['list'], ['json', { outputFile: 'test-results/frontend-results.json' }]],
  use: { baseURL: 'http://127.0.0.1:3000', channel: process.env.CI ? undefined : 'chrome',
    launchOptions: software ? { args: ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--disable-gpu-compositing'] } : {},
    trace: 'retain-on-failure', screenshot: 'only-on-failure', viewport: { width: 1440, height: 900 } },
  webServer: { command: 'npm run start', url: 'http://127.0.0.1:3000', reuseExistingServer: !process.env.CI, timeout: 60_000 },
});
