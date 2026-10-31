// Plan morning-digest § 1. The contract every part of § 2 starts against: the page, the JSON,
// the board link and the route tests all read a `Night`, never `runs/` directly.

export type JobStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing at the edge.
export type RunLine = {
  at: string; // as logged, offset kept (styleguide: never convert to UTC)
  job: string;
  status: JobStatus;
  owner: string | null;
  error?: string;
};

// One row per job for the night.
export type DigestRow = {
  job: string;
  owner: string | null; // owner on the job's last line; null renders as `—`
  runs: number; // lines for this job, retries included
  retries: number; // lines with status `retry`
  lastStatus: JobStatus;
  lastError: string | null; // error on the last line that had one; null renders as `—`
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string; // YYYY-MM-DD, the file name
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that didn't parse: counted, never thrown
  counts: Record<JobStatus, number>; // parsed lines per status
};

// A night name is a file name under runsDir, so it is checked before any path is built.
export const NIGHT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// null: no file for that night (the routes answer 404). An empty file is a Night with no rows.
export type ReadNight = (runsDir: string, night: string) => Night | null;
