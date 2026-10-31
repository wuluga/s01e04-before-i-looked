import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

// Routes are tested against a temp runs dir. runs/ is read-only: it is only ever copied from.
let runsDir: string;
let config: { adapter: string; installed: string; beatEverySeconds: number; runsDir: string };

const JOBS_IN_ORDER = ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs'];

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
  copyFileSync(join('runs', '2026-10-28.jsonl'), join(runsDir, '2026-10-28.jsonl'));
  writeFileSync(join(runsDir, '2026-10-30.jsonl'), '');
  writeFileSync(
    join(runsDir, '2026-10-31.jsonl'),
    [
      '{"at":"2026-10-31T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
      '{"at":"2026-10-31T02:00:00+01:00","job":"lane/sync","status":"retry","owner":"rook","error":"lock held"}',
      '{not json',
    ].join('\n') + '\n',
  );
  config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir };
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('GET /digest/:night and GET /api/digest/:night', () => {
  it('200 for 2026-10-28: rows in job order, 1 bad line, same jobs on the page', async () => {
    const app = createApp(config);

    const json = await app.request('/api/digest/2026-10-28');
    expect(json.status).toBe(200);
    const night = (await json.json()) as Night;
    expect(night.rows.map((r) => r.job)).toEqual(JOBS_IN_ORDER);
    expect(night.badLines).toBe(1);

    const page = await app.request('/digest/2026-10-28');
    expect(page.status).toBe(200);
    const html = await page.text();
    const positions = JOBS_IN_ORDER.map((job) => html.indexOf(job));
    positions.forEach((pos) => expect(pos).toBeGreaterThanOrEqual(0));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(html).toContain('—');
  });

  it('404 for a night with no file, on both routes', async () => {
    const app = createApp(config);
    expect((await app.request('/digest/2026-01-01')).status).toBe(404);
    expect((await app.request('/api/digest/2026-01-01')).status).toBe(404);
  });

  it('empty night 2026-10-30: page says "nothing ran", JSON has no rows and no bad lines', async () => {
    const app = createApp(config);

    const page = await app.request('/digest/2026-10-30');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');

    const json = await app.request('/api/digest/2026-10-30');
    expect(json.status).toBe(200);
    const night = (await json.json()) as Night;
    expect(night.rows).toEqual([]);
    expect(night.badLines).toBe(0);
  });

  it('bad-line night 2026-10-31: both routes answer 200, one bad line, one row with 2 runs', async () => {
    const app = createApp(config);

    const page = await app.request('/digest/2026-10-31');
    expect(page.status).toBe(200);

    const json = await app.request('/api/digest/2026-10-31');
    expect(json.status).toBe(200);
    const night = (await json.json()) as Night;
    expect(night.badLines).toBe(1);
    expect(night.rows).toHaveLength(1);
    expect(night.rows[0]!.runs).toBe(2);
  });
});
