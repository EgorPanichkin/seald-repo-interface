import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Server, FolderTree, KeyRound,
  ShieldCheck, Settings, LockKeyhole, GitBranch,
} from 'lucide-react';

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/repos',     icon: GitBranch,       label: 'Repos' },
  { to: '/envs',      icon: Server,          label: 'Environments' },
  { to: '/tree',      icon: FolderTree,      label: 'Tree' },
  { to: '/secrets',   icon: KeyRound,        label: 'Secrets' },
  { to: '/verify',    icon: ShieldCheck,     label: 'Verify' },
];

export default function Sidebar() {
  return (
    <aside className="flex flex-col w-56 border-r border-border bg-surface shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/20 border border-primary/30">
          <LockKeyhole className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold text-ink tracking-tight">seald</span>
        <span className="text-xs text-ink-faint ml-auto">interface</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-100 ${
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/20 shadow-glow-sm'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-overlay'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="p-3 border-t border-border">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-100 ${
              isActive
                ? 'bg-primary/15 text-primary border border-primary/20'
                : 'text-ink-muted hover:text-ink hover:bg-surface-overlay'
            }`
          }
        >
          <Settings className="w-4 h-4 shrink-0" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
