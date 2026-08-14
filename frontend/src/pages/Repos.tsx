import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch, RefreshCw, Download, FolderOpen, CheckCircle,
  XCircle, Loader2, AlertTriangle, Clock, HardDrive,
} from 'lucide-react';
import { getGitLabRepos, cloneRepo } from '../api/client';
import type { GitLabProject, CommandResult } from '../types';
import TerminalOutput from '../components/TerminalOutput';

type RepoAction = { id: number; loading: boolean; result: CommandResult | null };

export default function Repos() {
  const navigate = useNavigate();
  const [repos, setRepos] = useState<GitLabProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<Record<number, RepoAction>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGitLabRepos();
      setRepos(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClone = async (repo: GitLabProject) => {
    setActions(a => ({ ...a, [repo.id]: { id: repo.id, loading: true, result: null } }));
    try {
      const res = await cloneRepo(repo.http_url_to_repo, repo.ssh_url_to_repo, repo.namespace.path, repo.path);
      setActions(a => ({ ...a, [repo.id]: { id: repo.id, loading: false, result: res } }));
      if (res.success) {
        // Refresh list to update cloned status
        load();
      }
    } catch (e: unknown) {
      const err: CommandResult = {
        stdout: '', stderr: e instanceof Error ? e.message : String(e), code: 1, success: false,
      };
      setActions(a => ({ ...a, [repo.id]: { id: repo.id, loading: false, result: err } }));
    }
  };

  const handleOpen = (_repo: GitLabProject) => {
    navigate('/secrets');
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-ink flex items-center gap-2.5">
            <GitBranch className="w-5 h-5 text-ink-muted" />
            Репозитории
          </h1>
          <p className="text-sm text-ink-muted mt-1">gs-deploy репозитории из GitLab</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 mb-6">
          <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm text-red-300">
            {error.includes('не настроен') ? (
              <>
                {error}{' '}
                <a href="/settings" className="underline underline-offset-2 hover:text-red-200 transition-colors">
                  Открыть Settings
                </a>
              </>
            ) : error}
          </div>
        </div>
      )}

      {loading && (
        <div className="card text-center py-16">
          <Loader2 className="w-8 h-8 text-ink-faint mx-auto mb-3 animate-spin" />
          <p className="text-sm text-ink-muted">Загрузка репозиториев из GitLab...</p>
        </div>
      )}

      {!loading && !error && repos.length === 0 && (
        <div className="card text-center py-16">
          <GitBranch className="w-10 h-10 text-ink-faint mx-auto mb-4" />
          <p className="text-sm text-ink-muted">Репозитории gs-deploy не найдены</p>
          <p className="text-xs text-ink-faint mt-2">Убедитесь, что токен имеет доступ к нужным проектам</p>
        </div>
      )}

      {!loading && repos.length > 0 && (
        <div className="space-y-3">
          {repos.map(repo => {
            const action = actions[repo.id];
            const isLoading = action?.loading ?? false;
            const result = action?.result ?? null;

            return (
              <div key={repo.id} className="card">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-2.5 rounded-lg border shrink-0 ${
                    repo.cloned
                      ? 'bg-green-500/10 border-green-500/20 text-green-400'
                      : 'bg-surface-overlay border-border text-ink-muted'
                  }`}>
                    {repo.cloned ? <CheckCircle className="w-4 h-4" /> : <GitBranch className="w-4 h-4" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-ink">{repo.path_with_namespace}</span>
                      {repo.cloned && (
                        <span className="tag bg-green-500/10 text-green-400 border border-green-500/20">
                          клонирован
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-xs text-ink-muted mt-0.5 truncate">{repo.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-ink-faint">
                        <GitBranch className="w-3 h-3" />
                        {repo.default_branch}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-ink-faint">
                        <Clock className="w-3 h-3" />
                        {formatDate(repo.last_activity_at)}
                      </span>
                      {!repo.cloned && (
                        <span className="flex items-center gap-1 text-xs text-ink-faint font-mono truncate max-w-xs">
                          {repo.ssh_url_to_repo}
                        </span>
                      )}
                      {repo.cloned && (
                        <span className="flex items-center gap-1 text-xs text-ink-faint font-mono truncate max-w-xs">
                          <HardDrive className="w-3 h-3 shrink-0" />
                          {repo.localPath}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {repo.cloned ? (
                      <>
                        <button
                          onClick={() => handleClone(repo)}
                          disabled={isLoading}
                          className="btn-ghost text-sm"
                          title="git pull"
                        >
                          {isLoading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <RefreshCw className="w-4 h-4" />
                          }
                          Pull
                        </button>
                        <button
                          onClick={() => handleOpen(repo)}
                          className="btn-primary text-sm"
                        >
                          <FolderOpen className="w-4 h-4" />
                          Открыть
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleClone(repo)}
                        disabled={isLoading}
                        className="btn-primary text-sm"
                      >
                        {isLoading
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Клонирование...</>
                          : <><Download className="w-4 h-4" /> Клонировать</>
                        }
                      </button>
                    )}
                  </div>
                </div>

                {/* Result output */}
                {result && (
                  <div className="mt-4">
                    {result.success ? (
                      <div className="flex items-center gap-2 text-sm text-green-400 mb-2">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        {repo.cloned ? 'Pull выполнен. Workdir обновлён.' : 'Клонирован. Workdir установлен.'}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-red-400 mb-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Ошибка
                      </div>
                    )}
                    <TerminalOutput stdout={result.stdout} stderr={result.stderr} code={result.code} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
