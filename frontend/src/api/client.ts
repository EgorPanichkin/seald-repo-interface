import type { Settings, EnvEntry, TreeNode, CommandResult, BrokerHealth, GitLabProject } from '../types';

const BASE = '/api';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }
  return res.json();
}

// Settings
export const getSettings = () => req<Settings>('/settings');
export const saveSettings = (s: Partial<Settings>) =>
  req<Settings>('/settings', { method: 'POST', body: JSON.stringify(s) });

// Status
export const getStatus = () =>
  req<{ version: CommandResult; doctor: CommandResult }>('/status');

// Broker
export const getBrokerHealth = () => req<BrokerHealth>('/broker/health');
export const getBrokerRegistry = () => req<unknown>('/broker/registry');

// Environments
export const getEnvs = () =>
  req<{ raw: CommandResult; parsed: EnvEntry[] }>('/envs');

// Tree
export const getTree = (svc?: string) =>
  req<{ raw: CommandResult; parsed: TreeNode[] }>(`/tree${svc ? `?svc=${svc}` : ''}`);

// Secrets
export const unseal = (svc: string, env: string, name?: string) =>
  req<{ raw: CommandResult; secrets: Record<string, string> }>('/unseal', {
    method: 'POST',
    body: JSON.stringify({ svc, env, name }),
  });

export const seal = (svc: string, env: string, secrets: Record<string, string>) =>
  req<CommandResult>('/seal', {
    method: 'POST',
    body: JSON.stringify({ svc, env, secrets }),
  });

export const reseal = (svc: string, env: string, secrets: Record<string, string>, rotate?: string) =>
  req<CommandResult>('/reseal', {
    method: 'POST',
    body: JSON.stringify({ svc, env, secrets, rotate }),
  });

// Verify
export const runVerify = (strict?: boolean) =>
  req<CommandResult>(`/verify${strict ? '?strict=true' : ''}`);

// Git
export const gitPull = () =>
  req<CommandResult>('/git/pull', { method: 'POST' });

export const gitStatus = () =>
  req<CommandResult & { clean: boolean; files: string[] }>('/git/status');

export const commitAndPush = (message?: string) =>
  req<CommandResult & { nothingToCommit?: boolean }>('/git/commit-push', { method: 'POST', body: JSON.stringify({ message }) });

// GitLab
export const getGitLabRepos = () =>
  req<GitLabProject[]>('/gitlab/repos');

export const cloneRepo = (httpUrl: string, sshUrl: string, namespace: string, name: string) =>
  req<CommandResult & { localPath?: string }>('/gitlab/clone', {
    method: 'POST',
    body: JSON.stringify({ httpUrl, sshUrl, namespace, name }),
  });
