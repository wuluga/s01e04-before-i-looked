import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

describe('readNight', () => {
  it('reads 2026-10-28: 5 jobs, 1 bad line', () => {
    const n = readNight('runs', '2026-10-28')!;
    expect(n.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(n.badLines).toBe(1);
  });

  it('keeps retries, failures, null owners and the logged offset', () => {
    const rows = Object.fromEntries(readNight('runs', '2026-10-28')!.rows.map((r) => [r.job, r]));
    expect(rows['fixtures/refresh']).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: 'upstream 503' });
    expect(rows['notes/backup']).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded', owner: 'lane-07' });
    expect(rows['digest/render']!.owner).toBeNull();
    expect(rows['rig/rotate-logs']!.firstAt).toBe('2026-10-28T23:00:02+01:00');
  });

  it('returns null for a night with no file or a bad name', () => {
    expect(readNight('runs', '2026-01-01')).toBeNull();
    expect(readNight('runs', '../package')).toBeNull();
  });
});
