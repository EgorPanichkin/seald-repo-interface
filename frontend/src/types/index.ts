export interface Settings {
  workdir: string;
  brokerUrl: string;
  gitlabUrl: string;
  gitlabToken: string;
  useSSH: boolean;
}

export interface GitLabProject {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  namespace: { name: string; path: string };
  http_url_to_repo: string;
  ssh_url_to_repo: string;
  description: string | null;
  last_activity_at: string;
  default_branch: string;
  cloned: boolean;
  localPath: string;
}

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

export interface TreeEnv {
  name: string;
  keys: string[];
}

export interface TreeNode {
  service: string;
  environments: TreeEnv[];
}

export type SecretStatus = 'original' | 'modified' | 'added' | 'deleted';

export interface SecretRow {
  key: string;
  value: string;
  originalValue: string;
  status: SecretStatus;
  visible: boolean;
}

export interface BrokerHealth {
  readyz: { ok: boolean; status?: number; error?: string };
  healthz: { ok: boolean; status?: number; error?: string };
  brokerUrl: string;
}
