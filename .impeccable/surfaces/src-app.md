---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: []
---

# Surface brief — whole app (client + admin)

Scope: all routes (/login, /, /projects/[id], /admin/*). Visitor mode: Operate.

Audience & job: mixed/technical client stakeholders checking "is my project on track?" weekly on desktop and mobile; xSingularity team running daily ops (inbox, intake, client CRUD) in /admin. UI language: English.

Chosen direction: Freight Manifest, night-dispatch rendition (dark-only, user-pinned 2026-08-05). A project is a tracked consignment: waybill sheets on a dark desk, route lines kickoff→ETA with checkpoint diamond, rubber status stamps (Delivered/In transit/On hold/Pending), collapsed field-box grids, consignment numbers (XS-0001 from project id). Client surface = "Client Progress · carrier of record"; admin = "Dispatch · operations" (orange header rule).

Memorable moment: the projected-arrival date set huge in condensed caps with the status stamp landing on it (stamp-land animation).

Constraints: behavior, routes, server actions, and data flow untouched; impersonation banner stays hazard-yellow and unmissable; charts remain hand-rolled SVG; no light mode.

Unresolved: none material. Real client data will render more cards/rows than test data shown during build.
