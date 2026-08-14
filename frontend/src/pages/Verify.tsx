import { useState } from 'react';
import { ShieldCheck, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { runVerify } from '../api/client';
import type { CommandResult } from '../types';
import TerminalOutput from '../components/TerminalOutput';

export default function Verify() {
  const [strict, setStrict] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CommandResult | null>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await runVerify(strict);
      setResult(res);
    } catch (e: unknown) {
      setResult({ stdout: '', stderr: e instanceof Error ? e.message : String(e), code: 1, success: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-ink-muted" />
          Verify
        </h1>
        <p className="text-sm text-ink-muted mt-1">Структурная проверка бандлов без подключения к брокеру</p>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-ink mb-1">Режим проверки</div>
            <div className="text-xs text-ink-muted">
              Strict-режим требует формат v4 для всех бандлов
            </div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="text-sm text-ink-muted">{strict ? 'Strict' : 'Normal'}</span>
            <div
              onClick={() => setStrict(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${strict ? 'bg-primary' : 'bg-border-strong'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${strict ? 'translate-x-5' : ''}`} />
            </div>
          </label>
        </div>

        <div className="mt-5 pt-4 border-t border-border flex items-center gap-3">
          <button onClick={run} disabled={loading} className="btn-primary">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Проверка...</>
              : <><ShieldCheck className="w-4 h-4" /> Запустить verify</>
            }
          </button>
          {strict && (
            <span className="tag bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              --strict
            </span>
          )}
        </div>
      </div>

      {result && !loading && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border mb-4 ${
          result.success
            ? 'border-green-500/20 bg-green-500/5'
            : 'border-red-500/20 bg-red-500/5'
        }`}>
          {result.success
            ? <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            : <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          }
          <span className="text-sm">
            {result.success ? 'Все бандлы прошли проверку.' : 'Проверка выявила ошибки.'}
          </span>
          <span className={`ml-auto tag border ${
            result.success
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            exit {result.code}
          </span>
        </div>
      )}

      {result && (
        <TerminalOutput stdout={result.stdout} stderr={result.stderr} code={result.code} />
      )}

      {!result && !loading && (
        <div className="card text-center py-12">
          <ShieldCheck className="w-8 h-8 text-ink-faint mx-auto mb-3" />
          <p className="text-sm text-ink-muted">Нажмите «Запустить verify» для проверки бандлов</p>
          <p className="text-xs text-ink-faint mt-2">Работает офлайн — не требует подключения к брокеру</p>
        </div>
      )}
    </div>
  );
}
