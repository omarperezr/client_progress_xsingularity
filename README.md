# Client Progress · xSingularity

Internal tool that shows each client, in real time, how their project is going. Every xSingularity project is backed by **one GitHub or GitLab repository**: the team creates the full set of issues at project kick-off, and the app turns those issues into:

- an **overall progress bar** (closed issues / total issues, plus a second bar weighted by estimated time),
- a **task list** showing *who* is assigned, *what* the task is, and *how long* it is estimated to take,
- an **approximate total time** for the whole project, plus completed and remaining time.

Each client company gets its own username and password and only sees its own projects.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, React Server Components, Server Actions) + Tailwind CSS
- [Prisma 7](https://www.prisma.io) + PostgreSQL (Neon, Supabase, or any Postgres)
- Stateless JWT session cookies — no server state, fully serverless-friendly
- Deploys to [Vercel](https://vercel.com)

## 1. Local setup

```bash
git clone <this repo>
cd client_progress_xsingularity
npm install

cp .env.example .env
# Edit .env:
#   DATABASE_URL   — Postgres connection string
#   SESSION_SECRET — generate with: openssl rand -hex 32
#   ADMIN_USERNAME / ADMIN_PASSWORD — login for the admin panel at /admin

npm run db:push   # create the tables
npm run dev       # http://localhost:3000
```

## 2. Deploy to Vercel

1. Push this repository to GitHub/GitLab and import it in [Vercel](https://vercel.com/new). The defaults work — `npm run build` already runs `prisma generate`.
2. Create a Postgres database. Easiest options, both with free tiers and first-class Vercel integration:
   - **Neon**: Vercel dashboard → *Storage* → *Create Database* → *Neon Postgres*. This injects `DATABASE_URL` automatically.
   - **Supabase**: create a project, then copy the **pooled** connection string (*Connect* → *Transaction pooler*, port 6543) — serverless functions need pooling.
3. In Vercel → *Project* → *Settings* → *Environment Variables*, set:
   - `DATABASE_URL` — the pooled Postgres connection string (if not injected already)
   - `SESSION_SECRET` — output of `openssl rand -hex 32`
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` — credentials for the `/admin` panel

   Use `sslmode=verify-full` in the connection string. `sslmode=require` still behaves the same today, but `pg` warns about it and will weaken it to libpq semantics (no certificate verification) in `pg` v9.
4. Create the tables (run once from your machine, pointing at the production DB):
   ```bash
   DATABASE_URL="<production url>" npm run db:push
   ```
5. Redeploy. Done.

## 3. Admin panel

Everything below can be done from the browser at **`/admin`** instead of the CLI. The admin login is **not** in the database — it comes from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in the environment, so it is independent of client logins and can be rotated by changing the env vars (which invalidates existing admin sessions).

| Page | What you can do |
|---|---|
| `/admin` | Global overview: clients, projects, tasks done, remaining time, and **unanswered client messages**. Per-project progress bar + forecast, a **needs-attention** list (stalled/idle projects), a preview of the message inbox, and **View as** to open any client's dashboard. Create a client. |
| `/admin/inbox` | Every comment clients left on their tasks through the app, split into **Awaiting reply** (no team response since the client's last message) and **Answered**, each linking straight to the issue. |
| `/admin/companies/<id>` | Rename a client, change its username, reset its password, add projects, **View as** the client, delete the client (cascades to its projects). |
| `/admin/projects/<id>` | Edit name, provider, repo, base URL, replace the token, move the project to another client, delete it. Also shows the live issue list exactly as the app reads it — the fastest way to debug a bad repo path or token. |

**View as (impersonation).** "View as" starts a client session for that company *alongside* your admin session, so you land on their exact dashboard. An amber banner at the top shows you're impersonating and offers **Return to admin**, which clears only the client session. The client-facing login (`/login`) and the admin login (`/admin/login`) link to each other, so it's one click to switch between signing in as a client or as an xSingularity team member.

Admin sessions are `HttpOnly` JWT cookies (`admin_session`), signed with `SESSION_SECRET` and valid 24 h. Every admin page and every admin server action re-checks the session, so the panel cannot be reached with a client login.

## 4. Create a client company

Each client company logs in with its own username/password. Companies are created from the CLI (run locally against whichever `DATABASE_URL` is in your `.env` — point it at production to manage the live app):

```bash
npm run create-company -- "Acme Corp" acme "a-strong-password"
```

Send the credentials to the client. They log in at the root URL of the deployment.

## 5. Associate a GitHub or GitLab project

One tool project ↔ one repository. You register the association from the CLI:

```bash
npm run add-project -- <company-username> "<Project Name>" <github|gitlab> <repo> <token> [baseUrl]
```

| Argument | GitHub | GitLab |
|---|---|---|
| `repo` | `owner/repo` (e.g. `xsingularity/acme-webshop`) | numeric project ID **or** `group/project` path |
| `token` | fine-grained PAT (read-only, see below) | project access token (read-only, see below) |
| `baseUrl` | only for GitHub Enterprise (e.g. `https://ghe.example.com/api/v3`) | only for self-managed GitLab (e.g. `https://gitlab.example.com`) |

List everything that is configured:

```bash
npm run list
```

### 5a. GitHub setup

1. **Create the repository** for the project and set up its Kanban (GitHub Projects board backed by the repo's issues).
2. **Create all issues at kick-off.** Each closed issue advances the client's progress bar.
3. **Put the time estimate inside each issue**, either way works:
   - a line in the issue **body**: `Estimate: 2d 4h` (units: `w`eeks, `d`ays, `h`ours, `m`inutes; 1d = 8h, 1w = 5d), or
   - a **label** named `estimate: 4h` / `estimate::4h`.
4. **Assign issues** — assignees are shown to the client as "who is working on it".
5. **Create a token**: GitHub → *Settings* → *Developer settings* → *Personal access tokens* → *Fine-grained tokens* → *Generate new token*:
   - **Repository access**: only the project's repository
   - **Permissions**: *Issues: **Read & write*** (plus *Metadata: Read-only*, added automatically). Read-only still powers the dashboard, but the client can only **post comments** with a read-write token; without it, the comment box shows a clear "read-only" message.
6. **Register the project**:
   ```bash
   npm run add-project -- acme "Acme Webshop" github xsingularity/acme-webshop github_pat_XXXX
   ```

Note: pull requests are automatically excluded — only real issues count toward progress.

### 5b. GitLab setup

1. **Create the project** and its issue board (Kanban).
2. **Create all issues at kick-off.**
3. **Put the time estimate inside each issue.** Preferred: GitLab's **native time tracking** — comment `/estimate 2d 4h` on the issue (shows up in the sidebar). Fallbacks: an `Estimate: 2d 4h` line in the description, or a label `estimate::4h`.
4. **Log time as you work** with `/spend 3h` — the app subtracts logged time from each open issue's estimate when computing the remaining project time, and shows a "Time spent" column to the client.
5. **Assign issues.**
6. **Create a token**: Project → *Settings* → *Access tokens* → *Add new token*:
   - **Role**: **Developer** (Reporter is enough for a read-only dashboard, but the client can only **post comments** with Developer)
   - **Scopes**: `api` (or `read_api` for a read-only, dashboard-only token)
7. **Register the project** (repo can be the numeric project ID from the project's *General* settings, or the full path):
   ```bash
   npm run add-project -- acme "Acme Mobile App" gitlab acme-group/mobile-app glpat-XXXX
   # or, with the numeric ID and a self-managed instance:
   npm run add-project -- acme "Acme Mobile App" gitlab 12345678 glpat-XXXX https://gitlab.example.com
   ```

## 6. What the client sees

Each project opens a **dashboard** (`/projects/<id>`) built entirely from the repo's issues — no extra data entry:

- **Projected completion** — a forecast finish date from the team's throughput over the last 6 weeks (`remaining work ÷ recent pace`). Falls back to "getting started" / "paused" when there isn't enough recent history. Also shown as a one-liner on each project card.
- **Progress over time** — a burnup chart of cumulative % complete per week, with a dashed projection to 100% at the forecast date.
- **Weekly throughput** — tasks completed each week (velocity), from issue close dates.
- **Task status** — done / in progress (open + assigned) / not started (open + unassigned).
- **By workstream** — progress per label (e.g. `frontend`, `backend`); `estimate:*` labels are ignored.
- **By team member** — workload and progress per assignee; when GitLab time tracking is used, also how close completed tasks landed to their estimates.
- **Recently completed** and **Needs attention** (open tasks untouched for 2+ weeks).

### Comments & email per task

Expand any task ("Discuss") to see its issue comments and reply. Replies **post back to the GitHub/GitLab issue** under the project token's identity, prefixed with the client's company name (`**Acme Corp (via Client Progress):** …`), so the team sees who wrote what. This needs the read-write token described in the setup above.

If email is configured, each task also gets a private **"Ask the xSingularity team"** box that emails your team inbox (with the task title + link and the client's message) instead of posting publicly. Configure it with three env vars — leave `RESEND_API_KEY` empty to hide the button:

- `RESEND_API_KEY` — from [resend.com](https://resend.com) after verifying a sending domain
- `MAIL_FROM` — e.g. `Client Progress <progress@yourdomain.com>` (must be on the verified domain)
- `TEAM_EMAIL` — where task questions land

## How progress is calculated

- **Progress bar (by tasks)**: `closed issues / all issues`.
- **Progress bar (by time)**: `completed estimated minutes / total estimated minutes` (shown when estimates exist).
- **Project total estimate**: sum of every issue's estimate.
- **Remaining time**: per issue — `0` once closed; otherwise `estimate − time spent` (never below 0), summed. *Time spent* comes from GitLab's time tracking (`/spend 3h` quick action); GitHub has no equivalent, so there remaining = estimate of open issues.
- Estimates are parsed from (first match wins): GitLab native time tracking → `Estimate:` line in the issue body/description → `estimate:` label.

## CLI reference

| Command | Purpose |
|---|---|
| `npm run create-company -- "<Name>" <username> <password>` | create a client login |
| `npm run add-project -- <company> "<Name>" <github\|gitlab> <repo> <token> [baseUrl]` | link a repo to a client project |
| `npm run list` | show all companies and projects |
| `npm run db:push` | sync the Prisma schema to the database |

## Security notes

- Repo tokens are stored in the database and only ever used server-side; clients never see them. Keep them **single-repo** so a leak has minimal blast radius. Enabling two-way comments requires a **read-write** token (Issues R/W on GitHub, `api` on GitLab) — still single-repo, still server-only; the client never gets the token, only the ability to trigger a comment through an ownership-checked server action.
- Every client action re-checks the session **and** that the project belongs to that client before touching a token, so one client can't read or post to another's repo. "Ask the team" emails resolve the issue title/link server-side, so the message body can't be spoofed.
- Passwords are hashed with bcrypt (cost 12). Sessions are `HttpOnly` JWT cookies signed with `SESSION_SECRET`, valid 7 days.
- `ADMIN_PASSWORD` is compared in constant time and never leaves the server, but it is stored in plain text in the environment — keep `.env` out of git (it already is) and use a password you do not reuse elsewhere.
