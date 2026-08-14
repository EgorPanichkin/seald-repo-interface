import { useEffect, useState } from 'react';
import { Server, RefreshCw, Loader2 } from 'lucide-react';
import { getEnvs } from '../api/client';
import type { EnvEntry, CommandResult } from '../types';
import TerminalOutput from '../components/TerminalOutput';

function LevelBadge({ level }: { level: number }) {
  const cfg =
    level >= 50 ? { label: 'Owner',      cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' } :
    level >= 40 ? { label: 'Maintainer', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' } :
    level >= 30 ? { label: 'Developer',  cls: 'bg-green-500/10 text-green-400 border-green-500/20' } :
                  { label: level > 0 ? String(level) : '—', cls: 'bg-surface-overlay text-ink-faint border-border' };
  return <span className={`tag border ${cfg.cls}`}>{cfg.label}</span>;
}

function AccessCell({ you, required }: { you: number | null; required: number }) {
  if (you === null) return <span className="text-ink-faint text-xs">нет данных</span>;
  const ok = you >= required;
  return (
    <div className="flex items-center gap-2">
      <LevelBadge level={you} />
      {ok
        ? <span className="text-xs text-green-400">✓ доступ есть</span>
        : <span className="text-xs text-red-400">✗ нет доступа</span>
      }
    </div>
  );
}

export default function Environments() {
  const [envs, setEnvs] = useState<EnvEntry[]>([]);
  const [raw, setRaw] = useState<CommandResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getEnvs();
      setEnvs(data.parsed);
      setRaw(data.raw);
    } catch {
      setRaw({ stdout: '', stderr: 'Ошибка соединения с backend', code: 1, success: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-ink flex items-center gap-2.5">
            <Server className="w-5 h-5 text-ink-muted" />
            Environments
          </h1>
          <p className="text-sm text-ink-muted mt-1">sealdctl env list</p>
        </div>
        <div className="flex items-center gap-2">
          {raw && (
            <button onClick={() => setShowRaw(v => !v)} className="btn-ghost text-xs">
              {showRaw ? 'Скрыть вывод' : 'Показать вывод'}
            </button>
          )}
          <button onClick={load} disabled={loading} className="btn-ghost">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>
      </div>

      {showRaw && raw && (
        <TerminalOutput stdout={raw.stdout} stderr={raw.stderr} code={raw.code} className="mb-6" />
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-ink-muted animate-spin" />
        </div>
      ) : envs.length === 0 ? (
        <div className="card text-center py-12">
          <Server className="w-8 h-8 text-ink-faint mx-auto mb-3" />
          <p className="text-sm text-ink-muted">Окружения не найдены.</p>
          {raw?.stderr && <p className="text-xs text-red-400 mt-2 font-mono">{raw.stderr}</p>}
          <p className="text-xs text-ink-faint mt-3">Убедитесь, что рабочая директория содержит .seald/repo.yaml</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Окружение', 'Кластер', 'Namespace', 'Min Level', 'Ваш доступ'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-ink-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {envs.map((env, i) => (
                <tr key={env.name + i} className="border-b border-border/50 last:border-0 hover:bg-surface-overlay transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-ink font-mono">{env.name}</span>
                  </td>
                  <td className="px-5 py-3.5 text-ink-muted font-mono text-xs">{env.cluster || '—'}</td>
                  <td className="px-5 py-3.5 text-ink-muted font-mono text-xs">{env.namespace || '—'}</td>
                  <td className="px-5 py-3.5"><LevelBadge level={env.minLevel} /></td>
                  <td className="px-5 py-3.5"><AccessCell you={env.yourLevel} required={env.minLevel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
