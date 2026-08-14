import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import * as sealdctl from './services/sealdctl';
import * as git from './services/git';
import * as gitlab from './services/gitlab';

const app = express();
app.use(cors());
app.use(express.json());

const CONFIG_DIR = join(homedir(), '.seald-interface');
const CONFIG_FILE = join(CONFIG_DIR, 'settings.json');

interface Settings {
  workdir: string;
  brokerUrl: string;
  gitlabUrl: string;
  gitlabToken: string;
  useSSH: boolean;
}

const DEFAULTS: Settings = {
  workdir: process.cwd(),
  brokerUrl: 'https://seald.geekstudio.kg',
  gitlabUrl: '',
  gitlabToken: '',
  useSSH: false,
};

function getSettings(): Settings {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  if (existsSync(CONFIG_FILE)) {
    try { return { ...DEFAULTS, ...JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) }; } catch { /* fallthrough */ }
  }
  return { ...DEFAULTS };
}

function applyTokenToEnv(s: Settings) {
  if (s.gitlabToken) process.env.GITLAB_TOKEN = s.gitlabToken;
}

function saveSettings(s: Settings) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(s, null, 2));
  applyTokenToEnv(s);
}

// Inject token on startup so sealdctl picks it up immediately
applyTokenToEnv(getSettings());

// ── Settings ─────────────────────────────────────────────────────────────────

app.get('/api/settings', (_, res) => res.json(getSettings()));

app.post('/api/settings', (req, res) => {
  const settings = { ...getSettings(), ...req.body } as Settings;
  saveSettings(settings);
  res.json(settings);
});

// ── Status ────────────────────────────────────────────────────────────────────

app.get('/api/status', async (_, res) => {
  const { workdir } = getSettings();
  const [ver, doc] = await Promise.all([
    sealdctl.getVersion(workdir),
    sealdctl.doctor(workdir),
  ]);
  res.json({ version: ver, doctor: doc });
});

// ── Broker health ─────────────────────────────────────────────────────────────

app.get('/api/broker/health', async (_, res) => {
  const { brokerUrl } = getSettings();
  const check = async (path: string) => {
    try {
      const r = await fetch(`${brokerUrl}${path}`);
      return { ok: r.ok, status: r.status };
    } catch (e: unknown) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  };
  const [readyz, healthz] = await Promise.all([check('/readyz'), check('/healthz')]);
  res.json({ readyz, healthz, brokerUrl });
});

app.get('/api/broker/registry', async (_, res) => {
  const { brokerUrl } = getSettings();
  try {
    const r = await fetch(`${brokerUrl}/v1/registry/snapshot`);
    res.json(await r.json());
  } catch (e: unknown) {
    res.json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ── Git ───────────────────────────────────────────────────────────────────────

app.post('/api/git/pull', async (_, res) => {
  const { workdir } = getSettings();
  res.json(await sealdctl.gitPull(workdir));
});

app.post('/api/git/force-pull', async (_, res) => {
  const { workdir, gitlabToken, useSSH } = getSettings();
  res.json(await git.forcePull(workdir, useSSH ? undefined : gitlabToken));
});

app.get('/api/git/status', async (_, res) => {
  const { workdir } = getSettings();
  res.json(await git.gitStatus(workdir));
});

app.post('/api/git/commit-push', async (req, res) => {
  const { workdir, gitlabToken, useSSH } = getSettings();
  const { message } = req.body as { message?: string };
  res.json(await git.commitAndPush(workdir, message ?? 'seald: update secrets', useSSH ? undefined : gitlabToken));
});

// ── GitLab ────────────────────────────────────────────────────────────────────

app.get('/api/gitlab/repos', async (_, res) => {
  const { gitlabUrl, gitlabToken } = getSettings();
  if (!gitlabUrl || !gitlabToken) {
    return res.status(400).json({ error: 'GitLab URL и токен не настроены в Settings' });
  }
  try {
    const repos = await gitlab.listDeployRepos(gitlabUrl, gitlabToken);
    const withStatus = repos.map(r => ({
      ...r,
      cloned: git.isCloned(r.namespace.path, r.path),
      localPath: git.repoLocalPath(r.namespace.path, r.path),
    }));
    res.json(withStatus);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post('/api/gitlab/clone', async (req, res) => {
  const { gitlabToken, useSSH } = getSettings();
  const { httpUrl, sshUrl, namespace, name } = req.body as {
    httpUrl?: string; sshUrl?: string; namespace?: string; name?: string;
  };
  if (!httpUrl || !namespace || !name) {
    return res.status(400).json({ error: 'httpUrl, namespace и name обязательны' });
  }
  if (!useSSH && !gitlabToken) {
    return res.status(400).json({ error: 'GitLab токен не настроен в Settings (или включите SSH)' });
  }
  const result = await git.cloneOrPull({
    httpUrl,
    sshUrl: sshUrl ?? '',
    token: gitlabToken,
    namespace,
    name,
    useSSH,
  });
  if (result.success) {
    const localPath = git.repoLocalPath(namespace, name);
    saveSettings({ ...getSettings(), workdir: localPath });
    res.json({ ...result, localPath });
  } else {
    res.json(result);
  }
});

// ── Environments ──────────────────────────────────────────────────────────────

app.get('/api/envs', async (_, res) => {
  const { workdir } = getSettings();
  res.json(await sealdctl.envList(workdir));
});

// ── Tree ──────────────────────────────────────────────────────────────────────

app.get('/api/tree', async (req, res) => {
  const { workdir } = getSettings();
  const svc = req.query.svc as string | undefined;
  res.json(await sealdctl.tree(workdir, svc));
});

// ── Secrets ───────────────────────────────────────────────────────────────────

app.post('/api/unseal', async (req, res) => {
  const { workdir } = getSettings();
  const { svc, env, name } = req.body as { svc?: string; env?: string; name?: string };
  if (!svc || !env) return res.status(400).json({ error: 'svc and env are required' });
  res.json(await sealdctl.unseal(workdir, svc, env, name));
});

app.post('/api/seal', async (req, res) => {
  const { workdir } = getSettings();
  const { svc, env, secrets, modified } = req.body as {
    svc?: string; env?: string; secrets?: Record<string, string>; modified?: string[];
  };
  if (!svc || !env || !secrets) return res.status(400).json({ error: 'svc, env, secrets required' });
  res.json(await sealdctl.seal(workdir, svc, env, secrets, modified));
});

app.post('/api/reseal', async (req, res) => {
  const { workdir } = getSettings();
  const { svc, env, secrets, rotate } = req.body as {
    svc?: string; env?: string; secrets?: Record<string, string>; rotate?: string | string[];
  };
  if (!svc || !env || !secrets) return res.status(400).json({ error: 'svc, env, secrets required' });
  res.json(await sealdctl.reseal(workdir, svc, env, secrets, rotate));
});

// ── Verify ────────────────────────────────────────────────────────────────────

app.get('/api/verify', async (req, res) => {
  const { workdir } = getSettings();
  const strict = req.query.strict === 'true';
  res.json(await sealdctl.verify(workdir, strict));
});

// ─────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`\x1b[36m[seald-interface]\x1b[0m backend → http://localhost:${PORT}`);
});
