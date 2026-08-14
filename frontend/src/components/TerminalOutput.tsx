import { Terminal } from 'lucide-react';

interface Props {
  stdout?: string;
  stderr?: string;
  code?: number;
  className?: string;
}

export default function TerminalOutput({ stdout, stderr, code, className = '' }: Props) {
  const hasOutput = stdout || stderr;
  if (!hasOutput) return null;

  return (
    <div className={`rounded-xl border border-border overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 bg-surface border-b border-border">
        <Terminal className="w-3.5 h-3.5 text-ink-faint" />
        <span className="text-xs text-ink-muted font-mono">output</span>
        {code !== undefined && (
          <span className={`ml-auto tag ${
            code === 0
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            exit {code}
          </span>
        )}
      </div>
      <div className="bg-[#050509] p-4 overflow-x-auto max-h-80 overflow-y-auto">
        {stdout && (
          <pre className="font-mono text-xs text-green-400 whitespace-pre-wrap break-words leading-relaxed">
            {stdout}
          </pre>
        )}
        {stderr && (
          <pre className="font-mono text-xs text-red-400 whitespace-pre-wrap break-words leading-relaxed mt-2">
            {stderr}
          </pre>
        )}
      </div>
    </div>
  );
}
