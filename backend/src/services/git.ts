import { execFile } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { CommandResult } from './sealdctl';

export function reposBaseDir(): string {
  return join(homedir(), '.seald-interface', 'repos');
}

export function repoLocalPath(namespace: string, name: string): string {
  return join(reposBaseDir(), namespace, name);
}

export function isCloned(namespace: string, name: string): boolean {
  return existsSync(join(repoLocalPath(namespace, name), '.git'));
}

function exec(args: string[], cwd?: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, env: process.env }, (err, stdout, stderr) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: err ? (err as NodeJS.ErrnoException & { status?: number }).status ?? 1 : 0,
        success: !err,
      });
    });
  });
}

export async function cloneOrPull(opts: {
  httpUrl: string;
  sshUrl: string;
  token: string;
  namespace: string;
  name: string;
  useSSH: boolean;
}): Promise<CommandResult> {
  const { httpUrl, sshUrl, token, namespace, name, useSSH } = opts;
  const dir = repoLocalPath(namespace, name);

  if (isCloned(namespace, name)) {
    return exec(['pull'], dir);
  }

  mkdirSync(join(reposBaseDir(), namespace), { recursive: true });

  if (useSSH) {
    return exec(['clone', sshUrl, dir]);
  }

  const authUrl = httpUrl.replace(/^https?:\/\//, `https://oauth2:${token}@`);
  return exec(['clone', authUrl, dir]);
}

export async function gitStatus(cwd: string): Promise<CommandResult & { clean: boolean; files: string[] }> {
  const res = await exec(['status', '--porcelain'], cwd);
  const files = res.stdout ? res.stdout.split('\n').filter(Boolean) : [];
  return { ...res, clean: res.success && files.length === 0, files };
}

export async function commitAndPush(cwd: string, message: string): Promise<CommandResult & { nothingToCommit?: boolean }> {
  const status = await exec(['status', '--short'], cwd);

  const add = await exec(['add', '-A'], cwd);
  if (!add.success) return add;

  const commit = await exec(['commit', '-m', message], cwd);
  const nothingToCommit =
    !commit.success &&
    (commit.stdout.includes('nothing to commit') || commit.stderr.includes('nothing to commit'));

  // Real commit error (not "nothing to commit") → bail out
  if (!commit.success && !nothingToCommit) return commit;

  // Always pull --rebase and push — there may be unpushed commits from earlier runs
  const pull = await exec(['pull', '--rebase'], cwd);
  if (!pull.success) return pull;

  const push = await exec(['push'], cwd);
  return {
    ...push,
    nothingToCommit,
    stdout: [
      status.stdout ? `Изменённые файлы:\n${status.stdout}` : null,
      nothingToCommit ? '(нечего коммитить — пушим накопленные коммиты)' : commit.stdout,
      pull.stdout,
      push.stdout,
    ].filter(Boolean).join('\n\n'),
  };
}
