import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Terminal, Server, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle, XCircle, GitPullRequest, Loader2 } from 'lucide-react';
import { getBrokerHealth, getStatus, getEnvs, gitPull } from '../api/client';
import type { BrokerHealth, CommandResult } from '../types';
import TerminalOutput from '../components/TerminalOutput';

interface StatusState {
  version: string | null;
  doctorOk: boolean | null;
  loading: boolean;
}

interface BrokerState {
  health: BrokerHealth | null;
  loading: boolean;
}

function StatCard({ label, value, sub, icon: Icon, accent = false }: {
  label: string;
  value: string | number | React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div className={`card flex items-start gap-4 ${accent ? 'border-primary/30 bg-primary/5' : ''}`}>
      <div className={`p-2.5 rounded-lg border ${accent ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-surface-overlay border-border text-ink-muted'}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-ink-muted mb-1">{label}</div>
        <div className="text-lg font-semibold text-ink truncate">{value}</div>
        {sub && <div className="text-xs text-ink-faint mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  );
}

function BrokerDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${ok ? 'text-green-400' : 'text-red-400'}`}>
      <span className={`w-2 h-2 rounded-full ${ok ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]' : 'bg-red-400'}`} />
      {ok ? 'Online' : 'Offline'}
    </span>
  );
}

export default function Dashboard() {
  const [status, setStatus] = useState<StatusState>({ version: null, doctorOk: null, loading: true });
  const [broker, setBroker] = useState<BrokerState>({ health: null, loading: true });
  const [envCount, setEnvCount] = useState<number | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pullResult, setPullResult] = useState<CommandResult | null>(null);

  const loadAll = async () => {
    setStatus(s => ({ ...s, loading: true }));
    setBroker(s => ({ ...s, loading: true }));

    const [s, b, e] = await Promise.allSettled([
      getStatus(),
      getBrokerHealth(),
      getEnvs(),
    ]);

    if (s.status === 'fulfilled') {
      const versionLine = s.value.version.stdout || '';
      const match = versionLine.match(/v[\d.]+/);
      setStatus({ version: match ? match[0] : versionLine || 'unknown', doctorOk: s.value.doctor.success, loading: false });
    } else {
      setStatus({ version: null, doctorOk: false, loading: false });
    }

    if (b.status === 'fulfilled') {
      setBroker({ health: b.value, loading: false });
    } else {
      setBroker({ health: null, loading: false });
    }

    if (e.status === 'fulfilled') {
      setEnvCount(e.value.parsed.length);
    }
  };

  const doPull = async () => {
    setPulling(true);
    setPullResult(null);
    try {
      const res = await gitPull();
      setPullResult(res);
    } catch (e: unknown) {
      setPullResult({ stdout: '', stderr: e instanceof Error ? e.message : String(e), code: 1, success: false });
    } finally {
      setPulling(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const brokerOnline = broker.health?.readyz.ok && broker.health?.healthz.ok;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-muted mt-1">Состояние системы seald</p>
        </div>
        <button onClick={loadAll} className="btn-ghost">
          <RefreshCw className="w-4 h-4" />
          Обновить
        </button>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Broker"
          value={broker.loading ? '...' : <BrokerDot ok={brokerOnline ?? false} />}
          sub={broker.health?.brokerUrl}
          icon={Globe}
          accent={brokerOnline ?? false}
        />
        <StatCard
          label="sealdctl"
          value={status.loading ? '...' : (status.version ?? 'не найден')}
          sub={status.doctorOk === true ? 'всё ок' : status.doctorOk === false ? 'требует внимания' : undefined}
          icon={Terminal}
        />
        <StatCard
          label="Окружений"
          value={envCount !== null ? envCount : '—'}
          sub="доступно в репозитории"
          icon={Server}
        />
      </div>

      {/* Broker detail */}
      {broker.health && !broker.loading && (
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-ink-muted" />
            <span className="text-sm font-medium text-ink">Broker endpoints</span>
          </div>
          <div className="space-y-2">
            {(['readyz', 'healthz'] as const).map(ep => {
              const state = broker.health![ep];
              return (
                <div key={ep} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    {state.ok
                      ? <CheckCircle className="w-4 h-4 text-green-400" />
                      : <XCircle className="w-4 h-4 text-red-400" />
                    }
                    <span className="mono text-ink-muted">/{ep}</span>
                  </div>
                  <span className={`tag ${state.ok ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {state.ok ? `HTTP ${state.status}` : state.error ?? 'error'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Git Pull */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-ink-muted" />
            <span className="text-sm font-medium text-ink">Репозиторий</span>
          </div>
          <button
            onClick={doPull}
            disabled={pulling}
            className="btn-primary text-sm"
          >
            {pulling
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Pulling...</>
              : <><GitPullRequest className="w-4 h-4" /> git pull</>
            }
          </button>
        </div>
        {pullResult && (
          <>
            <div className={`flex items-center gap-2 mb-2 text-sm ${pullResult.success ? 'text-green-400' : 'text-red-400'}`}>
              {pullResult.success
                ? <CheckCircle className="w-4 h-4 shrink-0" />
                : <XCircle className="w-4 h-4 shrink-0" />
              }
              {pullResult.success ? 'Успешно' : 'Ошибка'}
            </div>
            <TerminalOutput stdout={pullResult.stdout} stderr={pullResult.stderr} code={pullResult.code} />
          </>
        )}
        {!pullResult && (
          <p className="text-xs text-ink-faint">Стянуть последние изменения из удалённого репозитория в рабочую директорию.</p>
        )}
      </div>

      {/* Quick actions */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-ink-muted" />
          <span className="text-sm font-medium text-ink">Быстрые действия</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { to: '/secrets', label: 'Открыть редактор секретов', desc: 'Читать и изменять секреты' },
            { to: '/envs',    label: 'Список окружений',          desc: 'Все env с уровнями доступа' },
            { to: '/tree',    label: 'Обзор структуры',           desc: 'Сервисы и имена ключей' },
            { to: '/verify',  label: 'Проверить бандлы',          desc: 'sealdctl verify' },
          ].map(({ to, label, desc }) => (
            <Link key={to} to={to} className="flex flex-col gap-1 p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-150 group">
              <span className="text-sm font-medium text-ink group-hover:text-primary transition-colors">{label}</span>
              <span className="text-xs text-ink-faint">{desc}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Offline warning */}
      {!broker.loading && !brokerOnline && (
        <div className="mt-4 flex items-start gap-3 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-300">
            Broker недоступен. Проверьте подключение или настройте рабочую директорию в{' '}
            <Link to="/settings" className="underline underline-offset-2">Settings</Link>.
          </div>
        </div>
      )}
    </div>
  );
}
