# Contributing to Preroll Plus

Thanks for your interest in improving Preroll Plus! This guide covers how to get a local copy running, how the project is laid out, and what to check before opening a pull request.

Questions are welcome in [Discussions](https://github.com/chadwpalm/PrerollPlus/discussions) or on [Discord](https://discord.gg/sXse6H8fMF). For bugs, please open an [issue](https://github.com/chadwpalm/PrerollPlus/issues) first so the fix can be discussed.

## Contents

- [What you need](#what-you-need)
- [Get the code](#get-the-code)
- [Set up the config folder](#set-up-the-config-folder)
- [Run Preroll Plus for development](#run-preroll-plus-for-development)
- [Project layout](#project-layout)
- [Sending test webhooks](#sending-test-webhooks)
- [Logging and troubleshooting](#logging-and-troubleshooting)
- [Before you open a pull request](#before-you-open-a-pull-request)
- [Opening the pull request](#opening-the-pull-request)

## What you need

- **Node.js 26** (the version in [`.nvmrc`](.nvmrc), and the one the Docker image uses). With [nvm](https://github.com/nvm-sh/nvm), run `nvm install` then `nvm use` in the repo folder.
- **Git**, and a GitHub account for your fork.
- **A Plex Media Server** you can sign in to, to test against.
- **A folder of preroll videos.** A few short `.mp4` files in a couple of subfolders is enough.
- **Plex Pass** if you want real webhooks. Webhooks are a Plex Pass feature. You can also send fake webhooks with `curl` (see [Sending test webhooks](#sending-test-webhooks)).
- **A Calendarific API key** (optional), only if you work on holiday schedules that use the Premier (Calendarific) source. The Legacy (Nager.Date) source needs no key.
- **Docker** (optional), to test the image the same way users run it.
- **An editor with Prettier and ESLint.** In VS Code, install the [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) and [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) extensions (VS Code suggests both when you open the repo) and turn on **Format On Save**.

Preroll Plus is developed on Linux and also runs on macOS. On **Windows**, use [WSL2](https://learn.microsoft.com/windows/wsl/).

## Get the code

1. Fork [chadwpalm/PrerollPlus](https://github.com/chadwpalm/PrerollPlus) on GitHub.
2. Clone your fork and add the main repository as `upstream`:

   ```bash
   git clone https://github.com/<your-username>/PrerollPlus.git
   cd PrerollPlus
   git remote add upstream https://github.com/chadwpalm/PrerollPlus.git
   ```

3. Create your branch from **`develop`**. `main` only receives releases.

   ```bash
   git fetch upstream
   git checkout -b my-feature upstream/develop
   ```

4. Install dependencies for the backend (repo root) and the frontend:

   ```bash
   nvm use
   npm install
   cd frontend && npm install && cd ..
   ```

## Set up the config folder

Preroll Plus keeps its settings (`settings.js`), logs and holiday cache in a config folder. In Docker this is **`/config`** (the volume users mount). The `CONFIG_DIR` environment variable points it somewhere else.

For development, use **`npm run dev`** (next section). It sets `CONFIG_DIR=./dev-config`, so everything goes into a `dev-config` folder inside your clone. That folder is ignored by Git, is created on first start, and keeps your development settings apart from any real installation. To start over with a fresh setup, stop Preroll Plus and delete `dev-config`.

> [!NOTE]
> `npm start` (without `CONFIG_DIR`) uses `/config`, like the Docker image. Use it only if you want to work with that folder. Other apps, such as Lumunarr, use `/config/settings.js` too, so don't share that folder between them.

> [!CAUTION]
> When it starts, and whenever a movie starts playing, Preroll Plus **writes the preroll setting on the Plex server** you configured. If you point a development copy at the Plex server you use every day, it will change that server's prerolls.

When running natively, set **Settings > Preroll Media > Location of Preroll Media** to your preroll folder, and **Plex Location of Preroll Media** to the same folder as Plex sees it (the same path if Plex runs on the same machine).

## Run Preroll Plus for development

Use two terminals.

**Terminal 1: backend** (Express on port 4949, settings in `./dev-config`, restarts automatically when backend files change):

```bash
npm run dev
```

**Terminal 2: frontend** (Vite dev server on port 3000, with hot reload):

```bash
cd frontend
npm run dev
```

Open **http://localhost:3000**. The Vite dev server forwards `/backend`, `/webhook` and `/feed` requests, and the live-update WebSocket, to the backend on 4949 (see [`frontend/vite.config.js`](frontend/vite.config.js)), so the backend in terminal 1 must be running.

- Frontend changes (`.jsx` and `.css` files) show up in the browser immediately, usually without a page reload.
- Backend changes restart the server through nodemon (see [`nodemon.json`](nodemon.json)). Changes under `frontend/` do not restart it.
- If your backend runs somewhere else, start the frontend with `BACKEND_URL=http://host:port npm run dev`.

> [!NOTE]
> If you set a **URL Base** in Settings (or `APP_BASE_URL`), the backend only answers under that path, and the dev server on port 3000 will not reach it. Clear the URL base while developing, or test that feature against a production build (below).

### Production build

This is what the Docker image serves. Express serves the built files from `frontend/production`:

```bash
cd frontend && npm run build && cd ..
npm run dev
```

Then open **http://localhost:4949**.

### Useful environment variables

| Variable        | Purpose                                                                                                                                                           |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONFIG_DIR`    | Folder for settings, logs and the holiday cache (default `/config`). `npm run dev` sets it to `./dev-config`. Relative paths are resolved from the start folder. |
| `APP_PORT`      | Port to listen on (default 4949). Overrides the Port setting. `PORT` also works.                                                                                  |
| `APP_BASE_URL`  | URL base for reverse proxies, e.g. `/prerollplus`. Overrides the URL Base setting.                                                                                |
| `DISABLE_AUTH`  | `true` turns off sign-in, and lets a different Plex account become the owner on its next sign-in. For recovery; overrides the Authentication setting.                |
| `SCHEDULE_TIME` | Time of day (`HH:MM`, 24-hour) for the daily sequence change. Default `00:00`.                                                                                    |
| `PUID` / `PGID` | Owner applied to the settings file (mainly for Docker).                                                                                                           |
| `BUILD`         | Build number shown in the UI and logs (set by CI; defaults to `Native`).                                                                                          |
| `TZ`            | Time zone (Docker). Schedules and holidays use the local date.                                                                                                    |
| `BACKEND_URL`   | Frontend dev server only: where to forward API calls (default `http://localhost:4949`).                                                                           |

## Project layout

```
app.js                  Express app: routes, URL base handling, serves the built frontend
bin/www                 Starts the HTTP server and the WebSocket (port from backend/config.js)
bin/healthcheck.js      Docker HEALTHCHECK
backend/
  config.js             Port and URL base (env vars and settings)
  logger.js             Logging: levels, tags, secret masking, log files
  paths.js              Config folder location (CONFIG_DIR, default /config)
  settingsStore.js      The one place that reads/writes settings.js (use update() to change a few fields)
  load.js, save.js      Startup settings checks/migration, and the routes the pages load and save through
  migrate.js            Upgrades settings from the v1 format
  settings.js           Lists the Plex servers on the account (Settings page)
  auth.js               Sign-in: Plex owner check, session cookie, Authentication setting, access checks
  directory.js          Lists preroll files and folders (bucket editor)
  streamer.js           Streams a preroll file for the preview player
  mediaPath.js          Keeps directory listing and streaming inside the preroll media folder
  monitor.js            Watches the preroll folder and updates buckets on rename/move/delete
  holidays.js           Holiday lists from Nager.Date or Calendarific, cached on disk and in memory
  holiday.js            Holiday list route for the sequence editor
  clearcache.js         Clears the holiday cache
  websocket.js          Tells open browsers to reload when files or settings change
  host.js               Running port/URL base/config folder for the Settings page and About box
webhook/index.js        Picks today's sequence and sends the preroll list to Plex (on startup,
                        daily, and when a movie starts); also builds the Calendar page data
feed/index.js           iCal feed of the schedule (secured with the API key from Settings)
frontend/               React app (Vite)
  src/components/       One folder per page or component
  src/api.js            fetch helper for backend requests (api.get, api.post, api.saveSettings, ...)
  src/locale.js         Browser locale and date formatting helpers
  src/components/Common Shared form pieces (labels with tooltips, the two-list picker)
```

Every route under `/backend` (except `/backend/auth`) and the page's own `/webhook` calls require a signed-in browser (see [`backend/auth.js`](backend/auth.js) and [`app.js`](app.js)), so new routes there are protected automatically. In a fresh `dev-config`, the first Plex account you sign in with becomes the owner. To sign in with a different account, delete `ownerId` from `dev-config/settings.js` or start with `DISABLE_AUTH=true`. Settings the browser must never see or change (the Plex token, `ownerId`, `sessionSecret`) are listed in `SERVER_ONLY` in [`backend/load.js`](backend/load.js).

Backend modules log through a tagged logger:

```js
const log = require("./logger").tagged("MYTAG");
log.info("Something happened");
log.debug("Details that help troubleshooting");
log.error("What failed:", error); // pass the error object, not error.message
```

Use **info** for things Preroll Plus did (today's sequence, Plex updated, a file was renamed), **debug** for details and "why" information (how each sequence matched or didn't), **warn** for recoverable problems, and **error** for failures. Do not log tokens or keys. The logger masks the known ones, but don't rely on that.

## Sending test webhooks

Plex sends webhooks as a multipart form with a `payload` field containing JSON. You can imitate one with `curl`:

```bash
curl -F 'payload={
  "event": "media.play",
  "Account": { "id": 1, "title": "testuser" },
  "Player":  { "title": "Test TV", "uuid": "test-player" },
  "Metadata": { "type": "movie", "title": "Test Movie" }
}' http://localhost:4949/webhook
```

Preroll Plus acts on `media.play` for movies: it picks new prerolls from today's sequence and sends them to Plex. Other events are ignored. A `GET` to `/webhook` does the same update without a payload.

> [!CAUTION]
> Each test webhook **really updates the preroll setting** on the Plex server in Settings.

To get real webhooks from Plex, add `http://<your-machine-ip>:4949/webhook` under **Plex > Settings > Webhooks**.

## Logging and troubleshooting

- Logs go to the terminal and to `logs/prerollplus-YYYY-MM-DD.log` in the config folder (`dev-config/logs/` with `npm run dev`).
- Set **Settings > Show Advanced > Logging > Log Level** to **Debug** to see how each sequence matched (or didn't) today's date, which prerolls were picked, every API request, and Plex/holiday lookup details. The change applies as soon as you save.
- Tokens and keys are masked in the logs, but check before pasting logs into an issue anyway.

## Before you open a pull request

### Checks

- [ ] **Lint passes** (no errors; warnings in older code are OK): `npm run lint` for the backend, and `cd frontend && npm run lint`
- [ ] **Code is formatted with Prettier** (format on save, or `npx prettier --write <files>`)
- [ ] **Frontend builds:** `cd frontend && npm run build`
- [ ] **No new vulnerabilities:** `npm audit` in the repo root and in `frontend/`
- [ ] **You tested the change in the app**, including dark mode and a narrow (phone-width) window if you touched the UI
- [ ] **Existing settings still work.** If you change what gets saved in `settings.js`, existing users' files must keep working. Give new fields a sensible default when they are missing.

### Test the Docker image

Preroll Plus is mostly run in Docker, so build and run the image if your change touches the backend, dependencies or the Dockerfile:

```bash
docker build -t prerollplus-dev .
mkdir -p ./docker-config
docker run --rm -p 4949:4949 -e PUID="$(id -u)" -e PGID="$(id -g)" -e TZ="$(cat /etc/timezone 2>/dev/null || echo UTC)" \
  -v "$(pwd)/docker-config:/config" -v /path/to/your/prerolls:/prerolls prerollplus-dev
```

- In Docker the preroll folder is always `/prerolls` inside the container, so mount yours there.
- `docker-config` (ignored by Git) keeps the container's settings separate from your `dev-config`.
- Stop your `npm run dev` backend first, since both use port 4949.
- The container reports `healthy` in `docker ps` once it answers on its port.
- The container may create files in `docker-config` as root, so removing the folder afterwards can need `sudo rm -rf docker-config`.

### Code style

- Formatting is handled by [Prettier](https://prettier.io) using the repo's [`.prettierrc.json`](.prettierrc.json) (Prettier defaults with a 120 character line width). Let your editor format on save rather than formatting by hand.
- Linting uses ESLint: [`eslint.config.mjs`](eslint.config.mjs) for the backend and [`frontend/eslint.config.js`](frontend/eslint.config.js) for the frontend.
- Keep changes focused. Separate refactoring from behavior changes where you can.
- Prefer the shared components in `frontend/src/components/Common` and `SettingsSection` for new form fields.

### history.md

Add a line for your change to [`history.md`](history.md) under the version at the top, in the matching section (**New Features**, **Changes** or **Fixes**). Link the related issue or PR, following the existing entries:

```markdown
1. Short description of what changed for users. [[#123](https://github.com/chadwpalm/PrerollPlus/issues/123)]
```

Don't change `version.json`; the maintainer sets the version when releasing.

## Opening the pull request

1. Bring your branch up to date with `develop`:

   ```bash
   git fetch upstream
   git rebase upstream/develop
   ```

2. Push to your fork and open a pull request **into `develop`** (not `main`).
3. In the description, explain:
   - what the change does and why
   - how you tested it (native and/or Docker, which Plex server and client)
   - screenshots for UI changes (light and dark mode)
   - the related issue, e.g. `Fixes #123`

By contributing you agree that your contribution is licensed under the project's [GNU GPL v3](LICENSE.md) license.
