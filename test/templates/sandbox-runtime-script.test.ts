// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

const SCRIPT = join(__dirname, '..', '..', 'templates', 'docker', '40-generate-sandbox-runtime.sh');
const PRODUCTION = 'eff33966-1c53-4643-8912-3969ff17f081';
const STAGING = 'fa747559-1050-4dbb-aa5c-9df065f1a941';
let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'sandbox-runtime-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Runs the entrypoint script from `dir` (so a glob would see its files) and evaluates what it wrote. */
function generate(env: Record<string, string>) {
  const out = join(dir, 'sandbox-runtime.js');
  const run = spawnSync('sh', [SCRIPT], {
    cwd: dir,
    env: {
      NODE_ENV: 'test',
      PATH: process.env.PATH ?? '',
      SANDBOX_RUNTIME_FILE: out,
      ...env,
    },
    encoding: 'utf8',
  });
  const window: { __SANDBOX_RUNTIME__?: Record<string, unknown> } = {};
  if (run.status === 0) runInNewContext(readFileSync(out, 'utf8'), { window });
  return { status: run.status, stderr: run.stderr, runtime: window.__SANDBOX_RUNTIME__ };
}

it('leaves the feedback project ids to the app when none are configured', () => {
  const { runtime } = generate({
    SANDBOX_ALLOWED_ORIGINS: "https://portal.example 'none'",
    SANDBOX_DEMO_ID: 'demo',
  });
  expect(runtime).toEqual({
    allowedOrigins: ['https://portal.example'],
    demoId: 'demo',
    feedbackProjectIds: null,
  });
});

it('lists the configured feedback project ids, space or comma separated', () => {
  const { runtime } = generate({
    SANDBOX_FEEDBACK_PROJECT_IDS: 'prod-1, staging_2 third',
  });
  expect(runtime).toEqual({
    allowedOrigins: [],
    demoId: null,
    feedbackProjectIds: ['prod-1', 'staging_2', 'third'],
  });
});

it('accepts real project ids with carriage returns from a Windows-edited env file', () => {
  const { status, stderr, runtime } = generate({
    SANDBOX_FEEDBACK_PROJECT_IDS: `${PRODUCTION},\r\n${STAGING}\r`,
  });
  expect(status).toBe(0);
  expect(stderr).not.toContain('WARNING');
  expect(runtime?.feedbackProjectIds).toEqual([PRODUCTION, STAGING]);
});

it.each(['', ' ', ', ,', '\r', ' ,\t, '])(
  'uses the built-in ids for an empty or separator-only value: %j',
  (value) => {
    const { status, stderr, runtime } = generate({ SANDBOX_FEEDBACK_PROJECT_IDS: value });
    expect(status).toBe(0);
    expect(stderr).not.toContain('WARNING');
    expect(runtime?.feedbackProjectIds).toBeNull();
  },
);

it.each(['bad.id', 'quote"d', 'a;b', `${PRODUCTION} bad.id`, 'prod-1 $(id)', 'é-accent'])(
  'keeps running on an unsafe value and falls back to the built-in ids with a warning: %j',
  (value) => {
    const { status, stderr, runtime } = generate({
      SANDBOX_ALLOWED_ORIGINS: 'https://portal.example',
      SANDBOX_FEEDBACK_PROJECT_IDS: value,
    });
    expect(status).toBe(0);
    expect(stderr).toContain('WARNING: SANDBOX_FEEDBACK_PROJECT_IDS ignored');
    expect(runtime).toEqual({
      allowedOrigins: ['https://portal.example'],
      demoId: null,
      feedbackProjectIds: null,
    });
  },
);

it.each(['*', 'prod-*', '[p]rod-1'])(
  'never expands a glob against the files of the working directory: %j',
  (value) => {
    writeFileSync(join(dir, 'prod-1'), '');
    const { status, stderr, runtime } = generate({ SANDBOX_FEEDBACK_PROJECT_IDS: value });
    expect(status).toBe(0);
    expect(stderr).toContain('WARNING');
    expect(runtime?.feedbackProjectIds).toBeNull();
  },
);
