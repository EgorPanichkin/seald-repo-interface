# seald interface

Веб-интерфейс для работы с секретами через `sealdctl`. Позволяет клонировать gs-deploy репозитории из GitLab, читать и изменять секреты, коммитить и пушить изменения.

## Требования

- **Node.js** 18+
- **npm** 9+
- **sealdctl** — CLI-инструмент для работы с секретами
- **git**
- **SSH-агент** с добавленным ключом (для операций seal/unseal и SSH-клонирования)

### Установка sealdctl

```bash
curl -fsSL https://raw.githubusercontent.com/DawnBreather/gitseal/main/install.sh | sh
```

## Запуск

### 1. Установить зависимости

```bash
npm run install:all
```

### 2. Запустить в режиме разработки

```bash
npm run dev
```

Запускает одновременно:
- **Backend** (Express) → `http://localhost:3001`
- **Frontend** (Vite + React) → `http://localhost:5173`

Открыть в браузере: `http://localhost:5173`

## Первоначальная настройка

После запуска перейти в **Settings** и заполнить:

| Поле | Описание | Пример |
|---|---|---|
| Путь к репозиторию | Рабочая директория с `.seald/repo.yaml` | `/home/user/repos/gs-deploy` |
| URL брокера | Адрес seald-брокера | `https://seald.geekstudio.kg` |
| URL GitLab | Адрес GitLab-сервера | `https://gitlab.geekstudio.kg` |
| Personal Access Token | Токен с правом `read_api` | `glpat-xxxxxxxxxxxxxxxxxxxx` |
| Транспорт | HTTPS + токен или SSH | SSH (рекомендуется) |

Настройки сохраняются в `~/.seald-interface/settings.json`.

### Настройка SSH (рекомендуется)

```bash
# Добавить ключ в SSH-агент
ssh-add ~/.ssh/id_ed25519

# Проверить
ssh-add -l

# Проверить доступ к GitLab
ssh -T git@gitlab.geekstudio.kg
```

SSH-ключ должен быть добавлен в GitLab: **Profile → SSH Keys**.

GitLab-токен нужен только для получения списка репозиториев через API (`read_api`), git-операции идут через SSH.

## Workflow

```
Repos → Клонировать репо → Secrets → выбрать сервис/env → Загрузить → изменить → Сохранить → Commit & Push
```

### Подробно

1. **Repos** — выбрать gs-deploy репозиторий и нажать **Клонировать**
   - Репо клонируется в `~/.seald-interface/repos/{namespace}/{name}/`
   - `workdir` обновляется автоматически

2. **Secrets** — выбрать сервис и окружение, нажать **Загрузить**
   - Запускает `sealdctl unseal`
   - SSH-агент должен быть активен

3. Изменить значения, добавить или удалить ключи, нажать **Сохранить изменения**
   - Запускает `sealdctl seal`

4. Нажать **Commit & Push**
   - `git add -A` → `git commit` → `git pull --rebase` → `git push`

## Структура проекта

```
seald-interface/
├── backend/           Express-сервер, запускает sealdctl и git
│   └── src/
│       ├── index.ts              API-роуты
│       └── services/
│           ├── sealdctl.ts       Обёртки над sealdctl CLI
│           ├── git.ts            Git-операции (clone, commit, push)
│           └── gitlab.ts         GitLab API (список репозиториев)
├── frontend/          React + Vite + Tailwind
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.tsx     Статус системы, git pull
│       │   ├── Repos.tsx         Список и клонирование gs-deploy репо
│       │   ├── Secrets.tsx       Редактор секретов
│       │   ├── Environments.tsx  Список окружений
│       │   ├── Tree.tsx          Структура сервисов и ключей
│       │   ├── Verify.tsx        sealdctl verify
│       │   └── Settings.tsx      Настройки
│       └── api/client.ts         HTTP-клиент
└── package.json       Корневой — запуск обоих сервисов
```

## Хранение данных

| Что | Где |
|---|---|
| Настройки | `~/.seald-interface/settings.json` |
| Клонированные репозитории | `~/.seald-interface/repos/{namespace}/{name}/` |

## Переменные окружения

`GITLAB_TOKEN` выставляется автоматически из настроек при запуске бэкенда — `sealdctl` подхватывает его для аутентификации.

Можно также задать вручную перед запуском:

```bash
export GITLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx
npm run dev
```
