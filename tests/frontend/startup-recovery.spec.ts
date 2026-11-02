import {test,expect} from '@playwright/test';
import {demoMeta,demoTracks} from '../../lib/fixtures';

const catalog={results:demoTracks,meta:{...demoMeta,data_mode:'real'}};
const endpoint='**/v1/catalog/starters';
test.beforeEach(async({page})=>{await page.clock.install();});

test('a sleeping catalog recovers automatically and preserves typed search input',async({page})=>{
  let calls=0;
  await page.route(endpoint,route=>++calls===1?route.fulfill({status:503}):route.fulfill({json:catalog}));
  await page.goto('/variants/v1');
  await expect(page.getByRole('status')).toContainText('Waking up');
  await page.getByRole('searchbox').fill('Tiffany');
  await page.clock.fastForward(10_000);
  await expect(page.locator('.starter-button')).toHaveCount(4);
  await expect(page.getByRole('searchbox')).toHaveValue('Tiffany');
  expect(calls).toBe(2);
  await expect(page.getByRole('note')).toHaveCount(0);
});

test('an eight-second request timeout retries successfully',async({page})=>{
  let calls=0;
  await page.route(endpoint,route=>{if(++calls>1)return route.fulfill({json:catalog});});
  await page.goto('/variants/v1');
  await page.clock.fastForward(8001);
  await expect(page.getByRole('status')).toContainText('Waking up');
  await page.clock.fastForward(10_000);
  await expect(page.locator('.starter-button')).toHaveCount(4);
  expect(calls).toBe(2);
});

test('persistent failure stops after two minutes and manual retry starts fresh',async({page})=>{
  let calls=0;
  await page.route(endpoint,route=>{calls++;return route.fulfill({status:503});});
  await page.goto('/variants/v1');
  await expect(page.getByRole('status')).toContainText('Waking up');
  for(let i=0;i<11;i++){
    await page.clock.fastForward(10_000);
    await expect.poll(()=>calls).toBe(i+2);
    await expect(page.getByRole('status')).toContainText('Waking up');
  }
  await page.clock.fastForward(10_000);
  await expect(page.locator('main').getByRole('alert')).toContainText('after two minutes');
  await page.clock.fastForward(60_000);expect(calls).toBe(12);
  await page.route(endpoint,route=>route.fulfill({json:catalog}));
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await expect(page.locator('.starter-button')).toHaveCount(4);
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
});

test('switching to demo cancels the pending real retry',async({page})=>{
  let calls=0;
  await page.route(endpoint,route=>{calls++;return route.fulfill({status:503});});
  await page.goto('/variants/v1');
  await expect(page.getByRole('status')).toContainText('Waking up');
  await page.getByRole('combobox',{name:'Data'}).selectOption('demo');
  await expect(page.getByRole('note')).toContainText('Demonstration');
  await page.clock.fastForward(30_000);expect(calls).toBe(1);
  await expect(page.locator('.starter-button')).toHaveCount(4);
});

for(const status of [429,200])test(`status ${status} with invalid data never starts automatic retries`,async({page})=>{
  let calls=0;
  await page.route(endpoint,route=>{calls++;return route.fulfill({status,json:{results:[],meta:{data_mode:'demo'}}});});
  await page.goto('/variants/v1');
  await expect(page.locator('main').getByRole('alert')).toContainText(status===429?'Too many requests':'unexpected data');
  await page.clock.fastForward(130_000);expect(calls).toBe(1);
  await expect(page.locator('.starter-button')).toHaveCount(0);
});

test('malformed JSON fails immediately without retrying',async({page})=>{
  let calls=0;
  await page.route(endpoint,route=>{calls++;return route.fulfill({body:'{',contentType:'application/json'});});
  await page.goto('/variants/v1');
  await expect(page.locator('main').getByRole('alert')).toContainText('unexpected data');
  await page.clock.fastForward(130_000);expect(calls).toBe(1);
});
