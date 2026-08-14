import { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon, Folder, Globe, Save, CheckCircle, Info,
  GitBranch, KeyRound, Eye, EyeOff, Wifi,
} from 'lucide-react';
import { getSettings, saveSettings } from '../api/client';
import type { Settings } from '../types';

export default function Settings() {
  const [form, setForm] = useState<Settings>({
    workdir: '', brokerUrl: 'https://seald.geekstudio.kg', gitlabUrl: '', gitlabToken: '', useSSH: false,
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tokenVisible, setTokenVisible] = useState(false);

  useEffect(() => {
    getSettings().then(s => { setForm(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const save = async () => {
    await saveSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const field = (
    key: keyof Settings,
    icon: React.ElementType,
    label: string,
    desc: string,
    placeholder: string,
    type = 'text',
    extra?: React.ReactNode,
  ) => {
    const Icon = icon;
    return (
      <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </label>
        <div className="relative">
          <input
            type={type}
            value={form[key] as string}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            placeholder={placeholder}
            className="input font-mono text-sm w-full pr-10"
            autoComplete="off"
          />
          {extra}
        </div>
        <p className="text-xs text-ink-faint">{desc}</p>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink flex items-center gap-2.5">
          <SettingsIcon className="w-5 h-5 text-ink-muted" />
          Settings
        </h1>
        <p className="text-sm text-ink-muted mt-1">Конфигурация seald interface</p>
      </div>

      {loading ? (
        <div className="card text-center py-8 text-ink-muted text-sm">Загрузка...</div>
      ) : (
        <div className="space-y-4">
          <div className="card space-y-5">
            <div className="text-sm font-medium text-ink border-b border-border pb-3">Рабочая директория</div>
            {field(
              'workdir', Folder,
              'Путь к репозиторию деплоя',
              'Директория, содержащая .seald/repo.yaml и папку .sealed/. Обновляется автоматически при клонировании репозитория.',
              '/path/to/deploy-repo',
            )}
          </div>

          <div className="card space-y-5">
            <div className="text-sm font-medium text-ink border-b border-border pb-3">Broker</div>
            {field(
              'brokerUrl', Globe,
              'URL брокера',
              'Адрес seald-брокера. Используется для проверки /readyz и /v1/registry/snapshot.',
              'https://seald.geekstudio.kg',
            )}
          </div>

          <div className="card space-y-5">
            <div className="text-sm font-medium text-ink border-b border-border pb-3">GitLab</div>
            {field(
              'gitlabUrl', GitBranch,
              'URL GitLab',
              'Адрес вашего GitLab сервера. Используется для поиска gs-deploy репозиториев.',
              'https://gitlab.example.com',
            )}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                <KeyRound className="w-3.5 h-3.5" />
                Personal Access Token
              </label>
              <div className="relative">
                <input
                  type={tokenVisible ? 'text' : 'password'}
                  value={form.gitlabToken}
                  onChange={e => setForm(f => ({ ...f, gitlabToken: e.target.value }))}
                  placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                  className="input font-mono text-sm w-full pr-10"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setTokenVisible(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink-muted transition-colors"
                >
                  {tokenVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-ink-faint">
                Токен с правами <span className="font-mono">read_api</span>.
                Нужен только для получения списка репозиториев. Хранится локально.
              </p>
            </div>

            {/* SSH toggle */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                <Wifi className="w-3.5 h-3.5" />
                Транспорт для клонирования
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, useSSH: false }))}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                    !form.useSSH
                      ? 'bg-primary/15 border-primary/30 text-primary'
                      : 'border-border text-ink-muted hover:text-ink hover:bg-surface-overlay'
                  }`}
                >
                  HTTPS + токен
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, useSSH: true }))}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all ${
                    form.useSSH
                      ? 'bg-primary/15 border-primary/30 text-primary'
                      : 'border-border text-ink-muted hover:text-ink hover:bg-surface-overlay'
                  }`}
                >
                  SSH
                </button>
              </div>
              <p className="text-xs text-ink-faint">
                {form.useSSH
                  ? 'Клонирование через SSH. SSH-ключ должен быть добавлен в GitLab и в агент (ssh-add).'
                  : 'Клонирование через HTTPS с Personal Access Token.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <Info className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="text-xs text-blue-300">
              Настройки сохраняются в <span className="font-mono">~/.seald-interface/settings.json</span>.
              SSH-агент должен быть активен для операций seal/unseal.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={save} className="btn-primary">
              <Save className="w-4 h-4" />
              Сохранить
            </button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" /> Сохранено
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
