import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  KeyRound, Eye, EyeOff, Copy, Trash2, Plus, Save,
  Unlock, Loader2, AlertTriangle, CheckCircle, XCircle,
  RotateCcw, ChevronDown, GitBranch,
} from 'lucide-react';
import { getTree, unseal, seal, commitAndPush } from '../api/client';
import type { SecretRow, CommandResult, TreeNode } from '../types';
import TerminalOutput from '../components/TerminalOutput';

type EditorState = 'idle' | 'loading' | 'loaded' | 'saving' | 'saved' | 'error';

function rowBg(status: SecretRow['status']) {
  return {
    original: '',
    modified:  'bg-yellow-500/5 border-l-2 border-l-yellow-500/40',
    added:     'bg-green-500/5 border-l-2 border-l-green-500/40',
    deleted:   'bg-red-500/5 border-l-2 border-l-red-500/40 opacity-60',
  }[status];
}

function statusTag(status: SecretRow['status']) {
  const map = {
    original: null,
    modified: <span className="tag bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">изменено</span>,
    added:    <span className="tag bg-green-500/10 text-green-400 border border-green-500/20">новое</span>,
    deleted:  <span className="tag bg-red-500/10 text-red-400 border border-red-500/20">удалено</span>,
  };
  return map[status];
}

export default function SecretEditor() {
  const [searchParams] = useSearchParams();
  const [services, setServices] = useState<TreeNode[]>([]);
  const [svc, setSvc] = useState(searchParams.get('svc') ?? '');
  const [env, setEnv] = useState(searchParams.get('env') ?? '');
  const [rows, setRows] = useState<SecretRow[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [state, setState] = useState<EditorState>('idle');
  const [result, setResult] = useState<CommandResult | null>(null);
  const [copyMsg, setCopyMsg] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<(CommandResult & { nothingToCommit?: boolean }) | null>(null);

  useEffect(() => {
    getTree().then(d => setServices(d.parsed)).catch(() => {});
  }, []);

  const envOptions = services.find(s => s.service === svc)?.environments.map(e => e.name) ?? [];

  const hasChanges = rows.some(r => r.status !== 'original');

  const loadSecrets = useCallback(async () => {
    if (!svc || !env) return;
    setState('loading');
    setResult(null);
    try {
      const data = await unseal(svc, env);
      if (!data.raw.success) {
        setState('error');
        setResult(data.raw);
        return;
      }
      const loaded: SecretRow[] = Object.entries(data.secrets).map(([k, v]) => ({
        key: k, value: v, originalValue: v, status: 'original', visible: false,
      }));
      setRows(loaded);
      setState('loaded');
    } catch (e: unknown) {
      setState('error');
      setResult({ stdout: '', stderr: e instanceof Error ? e.message : String(e), code: 1, success: false });
    }
  }, [svc, env]);

  useEffect(() => {
    if (svc && env) loadSecrets();
  }, []); // only on mount if params are set

  const toggleVisible = (idx: number) => {
    setRows(r => r.map((row, i) => i === idx ? { ...row, visible: !row.visible } : row));
  };

  const toggleAllVisible = () => {
    const next = !showAll;
    setShowAll(next);
    setRows(r => r.map(row => ({ ...row, visible: next })));
  };

  const updateValue = (idx: number, val: string) => {
    setRows(r => r.map((row, i) => {
      if (i !== idx) return row;
      const status = row.status === 'added' ? 'added'
        : val === row.originalValue ? 'original' : 'modified';
      return { ...row, value: val, status };
    }));
  };

  const markDeleted = (idx: number) => {
    setRows(r => r.map((row, i) => {
      if (i !== idx) return row;
      if (row.status === 'added') return null as unknown as SecretRow; // remove completely
      return { ...row, status: row.status === 'deleted' ? ('original' as const) : ('deleted' as const) };
    }).filter(Boolean));
  };

  const addSecret = () => {
    if (!newKey.trim()) return;
    setRows(r => [...r, { key: newKey.trim(), value: newVal, originalValue: '', status: 'added', visible: true }]);
    setNewKey(''); setNewVal(''); setShowAdd(false);
  };

  const copyValue = (val: string) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopyMsg('Скопировано!');
      setTimeout(() => setCopyMsg(''), 1500);
    });
  };

  const push = async () => {
    setPushing(true);
    setPushResult(null);
    try {
      const res = await commitAndPush(`seald: update secrets ${svc}/${env}`);
      setPushResult(res);
    } catch (e: unknown) {
      setPushResult({ stdout: '', stderr: e instanceof Error ? e.message : String(e), code: 1, success: false });
    } finally {
      setPushing(false);
    }
  };

  const saveChanges = async () => {
    if (!svc || !env) return;
    setState('saving');
    setResult(null);
    const remaining = rows.filter(r => r.status !== 'deleted');
    const secrets = Object.fromEntries(remaining.map(r => [r.key, r.value]));
    try {
      const res = await seal(svc, env, secrets);
      setResult(res);
      setState(res.success ? 'saved' : 'error');
      if (res.success) {
        setRows(r => r
          .filter(row => row.status !== 'deleted')
          .map(row => ({ ...row, status: 'original', originalValue: row.value }))
        );
      }
    } catch (e: unknown) {
      setState('error');
      setResult({ stdout: '', stderr: e instanceof Error ? e.message : String(e), code: 1, success: false });
    }
  };

  const activeRows = rows.filter(r => r.status !== 'deleted');
  const deletedRows = rows.filter(r => r.status === 'deleted');

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-ink flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-ink-muted" />
            Secrets
          </h1>
          <p className="text-sm text-ink-muted mt-1">Чтение и изменение секретов</p>
        </div>
      </div>

      {/* Service + Env picker */}
      <div className="card mb-6">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-44">
            <label className="block text-xs text-ink-muted mb-1.5">Сервис</label>
            <div className="relative">
              <select
                value={svc}
                onChange={e => { setSvc(e.target.value); setEnv(''); setRows([]); setState('idle'); }}
                className="input appearance-none pr-8 cursor-pointer"
              >
                <option value="">Выберите сервис...</option>
                {services.map(s => (
                  <option key={s.service} value={s.service}>{s.service}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint pointer-events-none" />
            </div>
          </div>
          <div className="flex-1 min-w-44">
            <label className="block text-xs text-ink-muted mb-1.5">Окружение</label>
            <div className="relative">
              <select
                value={env}
                onChange={e => { setEnv(e.target.value); setRows([]); setState('idle'); }}
                disabled={!svc}
                className="input appearance-none pr-8 cursor-pointer disabled:opacity-50"
              >
                <option value="">Выберите env...</option>
                {envOptions.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint pointer-events-none" />
            </div>
          </div>
          <button
            onClick={loadSecrets}
            disabled={!svc || !env || state === 'loading'}
            className="btn-primary"
          >
            {state === 'loading'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Загрузка...</>
              : <><Unlock className="w-4 h-4" /> Загрузить</>
            }
          </button>
        </div>
      </div>

      {/* Security notice */}
      {state === 'loaded' && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 mb-4">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          <span className="text-xs text-yellow-300">Секреты расшифрованы. Не делитесь экраном и не копируйте значения в чат.</span>
        </div>
      )}

      {/* Result after save */}
      {(state === 'saved' || state === 'error') && result && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border mb-4 ${
          state === 'saved' ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'
        }`}>
          {state === 'saved'
            ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
            : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          }
          <div className="text-sm">
            {state === 'saved' ? 'Секреты сохранены.' : 'Ошибка при сохранении.'}
          </div>
        </div>
      )}
      {result && (
        <TerminalOutput stdout={result.stdout} stderr={result.stderr} code={result.code} className="mb-4" />
      )}

      {/* Push to GitLab after successful seal */}
      {state === 'saved' && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-surface mb-4">
          <GitBranch className="w-4 h-4 text-ink-muted shrink-0" />
          <span className="text-sm text-ink-muted flex-1">
            {pushResult?.nothingToCommit
              ? 'Нет изменений для коммита — файлы уже актуальны в репозитории.'
              : pushResult?.success
                ? 'Запушено в GitLab.'
                : 'Запушить изменения в GitLab?'}
          </span>
          {(!pushResult || !pushResult.success || pushResult.nothingToCommit) && (
            <button
              onClick={push}
              disabled={pushing}
              className="btn-primary text-sm"
            >
              {pushing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Pushing...</>
                : <><GitBranch className="w-4 h-4" /> Commit & Push</>
              }
            </button>
          )}
        </div>
      )}
      {pushResult && (
        <TerminalOutput stdout={pushResult.stdout} stderr={pushResult.stderr} code={pushResult.code} className="mb-4" />
      )}

      {/* Secrets table */}
      {(state === 'loaded' || state === 'saving' || state === 'saved' || state === 'error') && rows.length > 0 && (
        <div className="card p-0 overflow-hidden mb-4">
          {/* Table toolbar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-surface">
            <span className="text-xs text-ink-muted">{activeRows.length} ключей</span>
            {hasChanges && (
              <span className="text-xs text-yellow-400 ml-1">· есть изменения</span>
            )}
            {copyMsg && <span className="text-xs text-green-400 ml-1">{copyMsg}</span>}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={toggleAllVisible} className="btn-ghost text-xs">
                {showAll ? <><EyeOff className="w-3.5 h-3.5" /> Скрыть все</> : <><Eye className="w-3.5 h-3.5" /> Показать все</>}
              </button>
              <button onClick={() => setShowAdd(v => !v)} className="btn-ghost text-xs">
                <Plus className="w-3.5 h-3.5" /> Добавить
              </button>
            </div>
          </div>

          {/* Add row */}
          {showAdd && (
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-green-500/5">
              <input
                placeholder="КЛЮЧ"
                value={newKey}
                onChange={e => setNewKey(e.target.value.toUpperCase())}
                className="input font-mono text-xs w-48"
              />
              <input
                placeholder="значение"
                value={newVal}
                onChange={e => setNewVal(e.target.value)}
                className="input font-mono text-xs flex-1"
              />
              <button onClick={addSecret} disabled={!newKey.trim()} className="btn-primary text-xs">
                <Plus className="w-3.5 h-3.5" /> Добавить
              </button>
              <button onClick={() => setShowAdd(false)} className="btn-ghost text-xs">Отмена</button>
            </div>
          )}

          {/* Rows */}
          <div>
            {rows.map((row, idx) => (
              <div key={row.key + idx} className={`flex items-center gap-3 px-5 py-3 border-b border-border/50 last:border-0 group ${rowBg(row.status)}`}>
                {/* Key */}
                <div className="w-56 shrink-0 font-mono text-xs text-ink-muted flex items-center gap-1.5">
                  <KeyRound className="w-3 h-3 text-ink-faint shrink-0" />
                  <span className={row.status === 'deleted' ? 'line-through opacity-50' : ''}>{row.key}</span>
                </div>

                {/* Status tag */}
                <div className="w-24 shrink-0">{statusTag(row.status)}</div>

                {/* Value */}
                <div className="flex-1 min-w-0">
                  {row.status === 'deleted' ? (
                    <span className="font-mono text-xs text-ink-faint line-through">••••••••</span>
                  ) : (
                    <input
                      type={row.visible ? 'text' : 'password'}
                      value={row.value}
                      onChange={e => updateValue(idx, e.target.value)}
                      className="w-full bg-transparent font-mono text-xs text-ink focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1 py-0.5"
                    />
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {row.status !== 'deleted' && (
                    <>
                      <button onClick={() => toggleVisible(idx)} className="p-1.5 rounded hover:bg-surface-overlay text-ink-faint hover:text-ink-muted transition-colors" title={row.visible ? 'Скрыть' : 'Показать'}>
                        {row.visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => copyValue(row.value)} className="p-1.5 rounded hover:bg-surface-overlay text-ink-faint hover:text-ink-muted transition-colors" title="Копировать">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  {row.status === 'deleted' ? (
                    <button onClick={() => markDeleted(idx)} className="p-1.5 rounded hover:bg-surface-overlay text-ink-faint hover:text-green-400 transition-colors" title="Восстановить">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button onClick={() => markDeleted(idx)} className="p-1.5 rounded hover:bg-red-500/10 text-ink-faint hover:text-red-400 transition-colors" title="Удалить">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save bar */}
      {hasChanges && (
        <div className="sticky bottom-6 flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface-raised/90 backdrop-blur shadow-glow">
          <div className="text-sm text-ink-muted">
            <span className="text-yellow-400 font-medium">{rows.filter(r => r.status === 'modified').length}</span> изменено,{' '}
            <span className="text-green-400 font-medium">{rows.filter(r => r.status === 'added').length}</span> добавлено,{' '}
            <span className="text-red-400 font-medium">{deletedRows.length}</span> удалено
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { loadSecrets(); setShowAdd(false); }}
              className="btn-ghost text-sm"
            >
              Отмена
            </button>
            <button
              onClick={saveChanges}
              disabled={state === 'saving'}
              className="btn-primary"
            >
              {state === 'saving'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Сохранение...</>
                : <><Save className="w-4 h-4" /> Сохранить изменения</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {state === 'idle' && (
        <div className="card text-center py-16">
          <KeyRound className="w-10 h-10 text-ink-faint mx-auto mb-4" />
          <p className="text-sm text-ink-muted">Выберите сервис и окружение, затем нажмите «Загрузить»</p>
          <p className="text-xs text-ink-faint mt-2">SSH-агент должен быть активен (ssh-add)</p>
        </div>
      )}
    </div>
  );
}
