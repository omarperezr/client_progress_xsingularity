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
4. Create the tables (run once from your machine, pointing at the production DB):
   ```bash
   DATABASE_URL="<production url>" npm run db:push
   ```
5. Redeploy. Done.

## 3. Create a client company

Each client company logs in with its own username/password. Companies are created from the CLI (run locally against whichever `DATABASE_URL` is in your `.env` — point it at production to manage the live app):

```bash
npm run create-company -- "Acme Corp" acme "a-strong-password"
```

Send the credentials to the client. They log in at the root URL of the deployment.

## 4. Associate a GitHub or GitLab project

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

### 4a. GitHub setup

1. **Create the repository** for the project and set up its Kanban (GitHub Projects board backed by the repo's issues).
2. **Create all issues at kick-off.** Each closed issue advances the client's progress bar.
3. **Put the time estimate inside each issue**, either way works:
   - a line in the issue **body**: `Estimate: 2d 4h` (units: `w`eeks, `d`ays, `h`ours, `m`inutes; 1d = 8h, 1w = 5d), or
   - a **label** named `estimate: 4h` / `estimate::4h`.
4. **Assign issues** — assignees are shown to the client as "who is working on it".
5. **Create a read-only token**: GitHub → *Settings* → *Developer settings* → *Personal access tokens* → *Fine-grained tokens* → *Generate new token*:
   - **Repository access**: only the project's repository
   - **Permissions**: *Issues: Read-only* (plus *Metadata: Read-only*, added automatically)
6. **Register the project**:
   ```bash
   npm run add-project -- acme "Acme Webshop" github xsingularity/acme-webshop github_pat_XXXX
   ```

Note: pull requests are automatically excluded — only real issues count toward progress.

### 4b. GitLab setup

1. **Create the project** and its issue board (Kanban).
2. **Create all issues at kick-off.**
3. **Put the time estimate inside each issue.** Preferred: GitLab's **native time tracking** — comment `/estimate 2d 4h` on the issue (shows up in the sidebar). Fallbacks: an `Estimate: 2d 4h` line in the description, or a label `estimate::4h`.
4. **Log time as you work** with `/spend 3h` — the app subtracts logged time from each open issue's estimate when computing the remaining project time, and shows a "Time spent" column to the client.
5. **Assign issues.**
6. **Create a read-only token**: Project → *Settings* → *Access tokens* → *Add new token*:
   - **Role**: Reporter
   - **Scopes**: `read_api`
7. **Register the project** (repo can be the numeric project ID from the project's *General* settings, or the full path):
   ```bash
   npm run add-project -- acme "Acme Mobile App" gitlab acme-group/mobile-app glpat-XXXX
   # or, with the numeric ID and a self-managed instance:
   npm run add-project -- acme "Acme Mobile App" gitlab 12345678 glpat-XXXX https://gitlab.example.com
   ```

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

- Repo tokens are stored in the database and only ever used server-side; clients never see them. Use **read-only, single-repo** tokens so a leak has minimal blast radius.
- Passwords are hashed with bcrypt (cost 12). Sessions are `HttpOnly` JWT cookies signed with `SESSION_SECRET`, valid 7 days.
