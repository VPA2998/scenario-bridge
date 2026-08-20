// End-to-end smoke tests for index.html.
//
// These load the app straight off disk (file://) — there's no build step and
// no server, matching how anyone actually uses this tool. Each test also
// asserts there are zero browser console errors, which is what caught a real
// bug during development (a literal "</script>" landing inside the app's own
// <script> block, silently truncating it).

const { test, expect } = require('@playwright/test');
const path = require('path');

const APP_PATH = 'file://' + path.join(__dirname, '..', 'index.html');
const FIXTURES = path.join(__dirname, '..', 'test-fixtures');

async function trackConsoleErrors(page) {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));
  return errors;
}

async function loadScenario(page, fixture = 'test.xosc') {
  await page.setInputFiles('#fileInput', path.join(FIXTURES, fixture));
  await page.waitForSelector('#status.ok', { timeout: 5000 });
}

async function loadRoadNetwork(page, fixture = 'test.xodr') {
  await page.setInputFiles('#fileInputOdr', path.join(FIXTURES, fixture));
  await page.waitForFunction(
    () => !document.getElementById('statusOdr').textContent.includes('Reading'),
    { timeout: 5000 }
  );
}

test('loads and parses an .xosc scenario', async ({ page }) => {
  const errors = await trackConsoleErrors(page);
  await page.goto(APP_PATH);
  await loadScenario(page);

  await expect(page.locator('#status')).toContainText('2 entities, 2 events');
  await expect(page.locator('#metricEntities')).toHaveText('2');
  await expect(page.locator('#metricEvents')).toHaveText('2');
  expect(errors).toEqual([]);
});

test('loads a matching .xodr and resolves entities onto real road geometry', async ({ page }) => {
  const errors = await trackConsoleErrors(page);
  await page.goto(APP_PATH);
  await loadScenario(page);
  await loadRoadNetwork(page);

  const entitiesHtml = await page.innerHTML('#entitiesBody');
  expect(entitiesHtml).toContain('Road geometry');
  expect(errors).toEqual([]);
});

test('generated frames follow the curved road (heading changes over time)', async ({ page }) => {
  await page.goto(APP_PATH);
  await loadScenario(page);
  await loadRoadNetwork(page);

  await page.fill('#duration', '3');
  await page.fill('#hz', '5');
  await page.click('#generateBtn');
  await page.waitForFunction(() => document.getElementById('metricFrames').textContent !== '0');

  const preview = JSON.parse(await page.textContent('#preview'));
  const yaw0 = preview[0].global_ground_truth.moving_object[0].base.yaw_rad;
  const yaw2 = preview[2].global_ground_truth.moving_object[0].base.yaw_rad;
  expect(yaw0).not.toEqual(yaw2);
});

test('events with no explicit Actors still apply to every entity', async ({ page }) => {
  // Regression test: a real-world <Actors selectTriggeringEntities="true"/> with no
  // <EntityRef> children used to mean "applies to nobody", which silently froze
  // playback. It must now mean "applies to everyone".
  await page.goto(APP_PATH);
  await loadScenario(page, 'test_nontrigger.xosc');

  await expect(page.locator('#eventsBody')).toContainText('(all entities)');

  await page.fill('#duration', '5');
  await page.fill('#hz', '5');
  await page.click('#generateBtn');
  await page.waitForFunction(() => document.getElementById('metricFrames').textContent !== '0');

  const preview = JSON.parse(await page.textContent('#preview'));
  const x0 = preview[0].global_ground_truth.moving_object[0].base.x_m;
  const x2 = preview[2].global_ground_truth.moving_object[0].base.x_m;
  expect(x2).toBeGreaterThan(x0);
});

test('playback animates over real wall-clock time, not just on scrub', async ({ page }) => {
  await page.goto(APP_PATH);
  await loadScenario(page, 'test_nontrigger.xosc');
  await page.fill('#duration', '5');
  await page.fill('#hz', '5');
  await page.click('#generateBtn');
  await page.waitForFunction(() => document.getElementById('metricFrames').textContent !== '0');

  await page.click('#tabPlayback');
  const canvas = page.locator('#canvas');
  const before = await canvas.screenshot();
  await page.click('#playBtn');
  await page.waitForTimeout(1200);
  const after = await canvas.screenshot();
  await page.click('#playBtn'); // pause

  expect(Buffer.compare(before, after)).not.toBe(0);
});

test('Sources tab reflects the currently loaded files, not a generic reference', async ({ page }) => {
  await page.goto(APP_PATH);
  await loadScenario(page);
  await loadRoadNetwork(page);
  await page.click('#tabSources');

  await expect(page.locator('#sourcesOscBody')).toContainText('Ego');
  await expect(page.locator('#sourcesOscBody')).toContainText('20.0 m/s');
  await expect(page.locator('#sourcesOdrBody')).toContainText('road@id="1"');
});

test('Convert to real OSI opens a new window with a valid osi3.GroundTruth-shaped payload', async ({ page }) => {
  await page.goto(APP_PATH);
  await loadScenario(page);
  await page.fill('#duration', '2');
  await page.fill('#hz', '5');
  await page.click('#generateBtn');
  await page.waitForFunction(() => document.getElementById('metricFrames').textContent !== '0');

  await page.click('#tabData');
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.click('#convertOsiBtn'),
  ]);
  await popup.waitForLoadState('load');

  const first = await popup.evaluate(() => fullData[0]);
  expect(first.movingObject[0].id.value).toBe('1');
  expect(['TYPE_VEHICLE', 'TYPE_PEDESTRIAN', 'TYPE_OTHER']).toContain(first.movingObject[0].type);
  expect(typeof first.timestamp.seconds).toBe('string');
  expect(first.movingObject[0].base.orientationRate).toBeDefined();
});
