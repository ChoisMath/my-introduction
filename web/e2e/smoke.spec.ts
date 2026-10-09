import { expect, test } from '@playwright/test';
import { SECTION_IDS } from '../src/lib/sections';

for (const [path, lang] of [['/', 'ko'], ['/en/', 'en']] as const) {
  test(`${path} renders every section with lang=${lang}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    for (const id of SECTION_IDS) await expect(page.locator(`section#${id}`)).toHaveCount(1);
  });
}

test('language toggle keeps the section hash', async ({ page }) => {
  await page.goto('/#projects');
  await page.getByTestId('lang-toggle').click();
  await expect(page).toHaveURL(/\/en\/#projects$/);
  await page.getByTestId('lang-toggle').click();
  await expect(page).toHaveURL(/\/#projects$/);
});

test('hero shows name and stats shows 5 numbers', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('section#hero h1')).toHaveText('최재혁');
  await expect(page.locator('section#hero svg[aria-hidden]')).toHaveCount(1);
  await expect(page.locator('section#stats [data-count]')).toHaveCount(5);
  await expect(page.locator('section#timeline li')).toHaveCount(6 + 2 + 6 + 13);
  await expect(page.locator('section#stats [data-count="many"]')).toHaveText('다수');
});

test('projects shows 5 cards and books shows 3 covers', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('project-card')).toHaveCount(5);
  await expect(page.locator('section#books img')).toHaveCount(3);
  // 스크롤해 들어오면 Reveal 이 완전히 나타나야 한다.
  await page.locator('section#projects').scrollIntoViewIfNeeded();
  await expect.poll(() => page.getByTestId('project-card').first().evaluate((el) => getComputedStyle(el.parentElement as HTMLElement).opacity)).toBe('1');
});

test('lectures tabs switch rows', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('section#lectures tbody tr')).toHaveCount(6);
  await page.getByRole('tab', { name: /학생 대상/ }).click();
  await expect(page.locator('section#lectures tbody tr')).toHaveCount(4);
});

test('every image on the page actually loads', async ({ page }) => {
  await page.goto('/');
  // 표지·목업은 lazy 이미지라 사용자가 하듯 끝까지 스크롤한 뒤 검사한다.
  for (const id of SECTION_IDS) await page.locator(`section#${id}`).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete));
  const broken = await page.locator('img').evaluateAll((imgs) =>
    imgs.filter((img) => !(img instanceof HTMLImageElement) || !img.complete || img.naturalWidth === 0).map((img) => (img as HTMLImageElement).src),
  );
  expect(broken).toEqual([]);
});

test.describe('mobile 375px', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  for (const path of ['/', '/en/']) {
    test(`${path} has no horizontal scroll`, async ({ page }) => {
      await page.goto(path);
      for (const id of ['hero', 'projects', 'lectures', 'contact']) {
        await page.locator(`section#${id}`).scrollIntoViewIfNeeded();
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('all section titles are visible and no video is loaded', async ({ page }) => {
    await page.goto('/');
    for (const id of ['stats', 'timeline', 'pillars', 'projects', 'books', 'lectures', 'contact']) {
      await expect(page.locator(`section#${id} h2`)).toBeVisible();
    }
    await expect(page.getByTestId('project-card').first()).toBeVisible();
    await expect(page.getByTestId('hero-video')).toHaveCount(0);
    await expect(page.locator('section#stats [data-count]').first()).not.toHaveText('0');
  });
});

test('desktop loads the hero loop and the intro dialog opens', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('hero-video')).toHaveCount(1);
  await page.getByTestId('open-video').click();
  await expect(page.locator('dialog[open] video')).toHaveAttribute('src', '/video/intro-ko.mp4');
});

test.describe('mobile hero', () => {
  test.use({ viewport: { width: 375, height: 812 } });
  test('shows the poster button instead of loading the video', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('hero-video')).toHaveCount(0);
    await page.getByRole('button', { name: /영상 재생/ }).click();
    await expect(page.getByTestId('hero-video')).toHaveCount(1);
  });
});

test('static seo files are served', async ({ request }) => {
  for (const p of ['/robots.txt', '/sitemap.xml', '/CNAME', '/img/og.png', '/video/intro-ko.mp4']) {
    const r = await request.get(p);
    expect(r.status(), p).toBe(200);
  }
});

test('page loads without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.locator('section#contact').scrollIntoViewIfNeeded();
  expect(errors).toEqual([]);
});

test('stats cards put the term before the value and hero uses webp pictogram', async ({ page }) => {
  await page.goto('/');
  const firstTags = await page.locator('section#stats dl > div').evaluateAll((cards) => cards.map((c) => c.firstElementChild?.tagName));
  expect(firstTags).toEqual(['DT', 'DT', 'DT', 'DT', 'DT']);
  await expect(page.locator('section#hero img')).toHaveAttribute('src', /\/img\/pictogram\.webp$/);
});

test('timeline dots are direct children of list items', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('section#timeline li > span')).toHaveCount(6 + 2 + 6 + 13);
});

test('lecture tabs follow the ARIA tab pattern and react to arrow keys', async ({ page }) => {
  await page.goto('/');
  const selected = page.getByRole('tab', { selected: true });
  const controls = await selected.getAttribute('aria-controls');
  expect(controls).toBeTruthy();
  await expect(page.locator(`#${controls}[role="tabpanel"]`)).toHaveCount(1);
  await selected.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { selected: true })).toHaveText(/학생 대상/);
  await expect(page.locator('section#lectures tbody tr')).toHaveCount(4);
});

test('intro dialog closes when the backdrop is clicked', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-video').click();
  await expect(page.locator('dialog[open]')).toHaveCount(1);
  await page.mouse.click(5, 5);
  await expect(page.locator('dialog[open]')).toHaveCount(0);
});
