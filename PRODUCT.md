# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Client-company stakeholders (mixed technical level, includes client-side PMs/devs who understand issues and estimates). They log in occasionally to check how their commissioned project is going. UI language: English.
- xSingularity team members using `/admin` daily: create clients/projects, triage client messages, run the intake pipeline (upload call recording → transcript → AI-drafted issues → push to GitLab), impersonate clients to verify what they see.

## Product Purpose

Shows each client, in real time, how their xSingularity project is going. Every project is backed by one GitHub or GitLab repository; the app turns that repo's issues into progress bars, a task list with assignees and estimates, forecasts, and charts. Success: a client understands project status in seconds without asking the team; the team runs intake and support without leaving the panel.

## Positioning

Zero extra data entry: the dashboard is derived entirely from the repo's issues (estimates, assignees, labels, time tracking). The intake pipeline turns a recorded sales call into reviewed GitLab issues, so the client watches the project from day one.

## Operating Context

- Clients: occasional visits (weekly-ish), desktop and mobile, checking status and commenting on tasks ("Discuss" posts back to the issue; "Ask the team" emails privately).
- Team: daily admin work — overview, inbox of unanswered client messages, needs-attention list (stalled projects), client/project CRUD, meeting transcription and draft-issue review.

## Capabilities and Constraints

- Next.js 16 App Router + RSC + Server Actions, Tailwind CSS 4, Prisma 7 + Postgres, serverless (Vercel). Read `node_modules/next/dist/docs/` before nontrivial Next.js changes (breaking changes vs training data).
- Routes: `/login`, `/` (project cards), `/projects/[id]` (dashboard: progress bars, burnup, throughput, task status, workstreams, per-member, task list with comments), `/admin/login`, `/admin`, `/admin/inbox`, `/admin/companies/[id]`, `/admin/projects/[id]`, `/admin/meetings/[id]`.
- Charts are hand-rolled SVG (src/components/Charts.tsx). No chart library.
- Progress math, provider integrations, auth, and all behavior are settled; redesign is visual only.
- Impersonation banner (amber) must remain clearly visible when active.

## Brand Commitments

None binding. Name "xSingularity" and product name "Client Progress" stay; otherwise free rein (confirmed 2026-08-05). No logo/colors/fonts exist.

## Evidence on Hand

- Real feature set as in README.md. No testimonials, pricing, or marketing claims anywhere in the app (it is a logged-in tool; no public marketing surface).
- Public assets: only Next.js starter SVGs — no brand assets to preserve.

## Product Principles

- Status legible in seconds: progress, forecast, and blockers first; detail on demand.
- Everything derives from repo truth; never invent or re-enter data.
- Client trust through transparency: who is working, on what, how long, what's stalled.
- Team efficiency: the panel replaces the CLI; fewest clicks from signal (message, stalled project) to action.

## Accessibility & Inclusion

No product-specific requirement established; meet standard web accessibility (WCAG AA contrast, keyboard operability).
