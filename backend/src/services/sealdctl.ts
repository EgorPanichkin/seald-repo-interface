import { spawn, execFile } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
  success: boolean;
}

export interface EnvEntry {
  name: string;
  cluster: string;
  namespace: string;
  minLevel: number;
  yourLevel: number | null;
}

export interface TreeNode {
  service: string;
  environments: { name: string; keys: string[] }[];
}

export async function run(args: string[], cwd: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    const proc = spawn('sealdctl', args, {
      cwd,
      env: process.env,
      shell: false,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), code: code ?? 1, success: code === 0 });
    });

    proc.on('error', (err: NodeJS.ErrnoException) => {
      const msg = err.code === 'ENOENT'
        ? 'sealdctl не найден. Установите: curl -fsSL https://raw.githubusercontent.com/DawnBreather/gitseal/main/install.sh | sh'
        : err.message;
      resolve({ stdout: '', stderr: msg, code: 127, success: false });
    });
  });
}

export function gitPull(cwd: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile('git', ['pull'], { cwd, env: process.env }, (err, stdout, stderr) => {
      const code = err ? (err as NodeJS.ErrnoException & { code?: number }).code ?? 1 : 0;
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: typeof code === 'number' ? code : (code === null ? 1 : 1),
        success: !err,
      });
    });
  });
}

export const getVersion = (cwd: string) => run(['version'], cwd);
export const doctor = (cwd: string) => run(['doctor'], cwd);
export const verify = (cwd: string, strict?: boolean) =>
  run(strict ? ['verify', '--strict'] : ['verify'], cwd);

export async function envList(cwd: string): Promise<{ raw: CommandResult; parsed: EnvEntry[] }> {
  const raw = await run(['env', 'list'], cwd);
  const parsed = parseEnvList(raw.stdout);
  return { raw, parsed };
}

export async function tree(cwd: string, svc?: string): Promise<{ raw: CommandResult; parsed: TreeNode[] }> {
  const raw = await run(svc ? ['tree', '--svc', svc] : ['tree'], cwd);
  const parsed = parseTree(raw.stdout);
  return { raw, parsed };
}

export async function unseal(
  cwd: string, svc: string, env: string, name?: string
): Promise<{ raw: CommandResult; secrets: Record<string, string> }> {
  const args = name
    ? ['unseal', '--svc', svc, '--env', env, '--name', name]
    : ['unseal', '--svc', svc, '--env', env, '--all'];
  const raw = await run(args, cwd);
  const secrets = raw.success ? parseSecrets(raw.stdout) : {};
  return { raw, secrets };
}

function writeTmp(secrets: Record<string, string>): string {
  const file = join(tmpdir(), `seald_${Date.now()}_${Math.random().toString(36).slice(2)}.env`);
  const content = Object.entries(secrets).map(([k, v]) => `${k}=${v}`).join('\n');
  writeFileSync(file, content, { mode: 0o600 });
  return file;
}

export async function seal(
  cwd: string, svc: string, env: string, secrets: Record<string, string>
): Promise<CommandResult> {
  const file = writeTmp(secrets);
  try {
    return await run(['seal', '--svc', svc, '--env', env, '--from', file], cwd);
  } finally {
    try { unlinkSync(file); } catch { /* ignore */ }
  }
}

export async function reseal(
  cwd: string, svc: string, env: string, secrets: Record<string, string>, rotate?: string
): Promise<CommandResult> {
  const file = writeTmp(secrets);
  try {
    const args = ['reseal', '--svc', svc, '--env', env, '--from', file];
    if (rotate) args.push('--rotate', rotate);
    return await run(args, cwd);
  } finally {
    try { unlinkSync(file); } catch { /* ignore */ }
  }
}

function parseSecrets(output: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of output.split('\n')) {
    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1);
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
      result[key] = value;
    }
  }
  return result;
}

function parseEnvList(output: string): EnvEntry[] {
  const lines = output.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  return lines.slice(1).map(line => {
    const parts = line.trim().split(/\s{2,}/);
    return {
      name: parts[0] ?? '',
      cluster: parts[1] ?? '',
      namespace: parts[2] ?? '',
      minLevel: parseInt(parts[3] ?? '0', 10) || 0,
      yourLevel: parts[4] ? (parseInt(parts[4], 10) || null) : null,
    };
  }).filter(e => e.name);
}

function parseTree(output: string): TreeNode[] {
  // Format per line:
  //   service-name          ← starts with letter, no tree chars
  //   ├─ env-name   KEY1 KEY2 ...   ✍ SHA256:xxx   ← env + keys on same line
  const lines = output.split('\n');
  const services: TreeNode[] = [];
  let current: TreeNode | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    const firstCh = line.charAt(0);

    // Service line: starts with a letter/digit, no tree characters
    if (/[a-zA-Z0-9_-]/.test(firstCh)) {
      current = { service: line.trim(), environments: [] };
      services.push(current);
      continue;
    }

    if (!current) continue;

    // Env line: starts with tree chars (├ └ │ ─)
    // Strip tree-drawing chars, split by whitespace → [envName, key1, key2, ..., ✍, SHA256:xxx]
    const tokens = line
      .replace(/[├└│─]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length === 0) continue;

    const envName = tokens[0];
    const keys = tokens.slice(1).filter(t =>
      t !== '✍' &&          // ✍
      !/^sha256:/i.test(t) &&
      !/^SHA256:/i.test(t) &&
      !t.startsWith('SHA256:') &&
      t !== '✍'
    );

    current.environments.push({ name: envName, keys });
  }

  return services;
}
