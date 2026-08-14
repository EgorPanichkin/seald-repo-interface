import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderTree, ChevronRight, ChevronDown, KeyRound, Layers, RefreshCw, Loader2 } from 'lucide-react';
import { getTree } from '../api/client';
import type { TreeNode } from '../types';
import TerminalOutput from '../components/TerminalOutput';

function EnvRow({ service, env }: { service: string; env: { name: string; keys: string[] } }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="border-b border-border/40 last:border-0">
      <div
        className="flex items-center gap-2 px-5 py-2.5 hover:bg-surface-overlay transition-colors cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
        {open ? <ChevronDown className="w-3.5 h-3.5 text-ink-faint" /> : <ChevronRight className="w-3.5 h-3.5 text-ink-faint" />}
        <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span className="font-mono text-sm text-ink">{env.name}</span>
        <span className="ml-auto text-xs text-ink-faint">{env.keys.length} ключей</span>
        <button
          onClick={e => { e.stopPropagation(); navigate(`/secrets?svc=${service}&env=${env.name}`); }}
          className="ml-2 px-2.5 py-1 rounded-md text-xs bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
        >
          Открыть
        </button>
      </div>

      {open && env.keys.length > 0 && (
        <div className="px-5 pb-3 pt-1 flex flex-wrap gap-1.5 pl-14">
          {env.keys.map(k => (
            <span key={k} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-border font-mono text-xs text-ink-muted">
              <KeyRound className="w-2.5 h-2.5 text-ink-faint" />
              {k}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceCard({ node }: { node: TreeNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="card p-0 overflow-hidden mb-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-3 w-full px-5 py-3.5 hover:bg-surface-overlay transition-colors text-left"
      >
        {open ? <ChevronDown className="w-4 h-4 text-ink-muted" /> : <ChevronRight className="w-4 h-4 text-ink-muted" />}
        <FolderTree className="w-4 h-4 text-primary" />
        <span className="font-mono text-sm font-medium text-ink">{node.service}</span>
        <span className="ml-auto text-xs text-ink-faint">{node.environments.length} env</span>
      </button>
      {open && node.environments.map(env => (
        <EnvRow key={env.name} service={node.service} env={env} />
      ))}
    </div>
  );
}

export default function Tree() {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [rawOut, setRawOut] = useState<{ stdout: string; stderr: string; code: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getTree();
      setNodes(data.parsed);
      setRawOut(data.raw);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-ink flex items-center gap-2.5">
            <FolderTree className="w-5 h-5 text-ink-muted" />
            Tree
          </h1>
          <p className="text-sm text-ink-muted mt-1">sealdctl tree — структура бандлов</p>
        </div>
        <div className="flex items-center gap-2">
          {rawOut && (
            <button onClick={() => setShowRaw(v => !v)} className="btn-ghost text-xs">
              {showRaw ? 'Скрыть вывод' : 'Показать вывод'}
            </button>
          )}
          <button onClick={load} disabled={loading} className="btn-ghost">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {showRaw && rawOut && (
        <TerminalOutput stdout={rawOut.stdout} stderr={rawOut.stderr} code={rawOut.code} className="mb-6" />
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 text-ink-muted animate-spin" />
        </div>
      ) : nodes.length === 0 ? (
        <div className="card text-center py-12">
          <FolderTree className="w-8 h-8 text-ink-faint mx-auto mb-3" />
          <p className="text-sm text-ink-muted">Сервисы не найдены.</p>
          {rawOut?.stderr && <p className="text-xs text-red-400 mt-2 font-mono max-w-sm mx-auto">{rawOut.stderr}</p>}
        </div>
      ) : (
        <div>
          {nodes.map(node => <ServiceCard key={node.service} node={node} />)}
        </div>
      )}

      {/* Fallback: если парсинг не дал результатов, но вывод есть */}
      {!loading && nodes.length === 0 && rawOut?.stdout && (
        <TerminalOutput stdout={rawOut.stdout} stderr={rawOut.stderr} code={rawOut.code} className="mt-4" />
      )}
    </div>
  );
}
