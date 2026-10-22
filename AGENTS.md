# FreezeMan

Freezer management system for tracking biological samples in a lab. License: LGPL v3.

## Layout

- `VERSION`: release version.
- `DEPLOYMENT.md`: production server reference. Never run its steps locally.
- `fms.log*`: git-ignored. Do not read or commit them.
- Ignore the root `package.json`.

## Backend (`backend/`)

Django project, Python 3.14, PostgreSQL 15+ with the `fzy` extension. Production runs it on uwsgi behind nginx (`example.uwsgi.ini`, `example.nginx.conf`).

- `manage.py`, `requirements.txt` (venv in `backend/env`).
- `fms/`: Django project (settings, URLs). `fms_core/`: main app (models, API, templates). `fms_report/`: report app.
- `dependencies/pg_fzy`: git submodule, source of the `fzy` extension.
- `templates/`, `static/`, `media/`, `docs/`, `README.md`.

Commands (run in `backend/`):
- `env/bin/python manage.py runserver` (port 8000).
- `env/bin/python manage.py migrate`. Ask first.
- `env/bin/python manage.py test <path>`. Ask before the full suite.

## Frontend (`frontend/`)

React app, Node 24.x, webpack. Source in `src/`.

Commands (run in `frontend/`):
- `npm ci` (or `npm install` to change dependencies).
- `npm start`: dev server, port 9000, proxies `/api` to port 8000.
- `npm run build`: production build.

Run servers in the background.

## Git

- Never commit on master and qc branches

## Skills

Load `freezeman-backend` or `freezeman-frontend` only to change code in its directory or to research that code in depth. To run, build or package the app, the "Backend" and "Frontend" sections above are sufficient. To run the container stack, `oci/README.md` is sufficient. This rule applies only to these three skills.

- Backend code (`backend/`), venv or database setup, migrations, users: read `.agents/skills/freezeman-backend/SKILL.md`.
- Frontend code (`frontend/src`): read `.agents/skills/freezeman-frontend/SKILL.md`.
- Containers (`oci/`, Containerfiles, compose files, `.containerignore`), container deployment plans: read `.agents/skills/freezeman-oci/SKILL.md`.

<!-- BEGIN shared dev-conventions -->
## Dev Conventions

### Sync
- The section between the `BEGIN` and `END` markers is identical in `freezeman/AGENTS.md` and `data-delivery-monitor/AGENTS.md`. Ideally, the two repos are siblings in the same parent folder.
- When you change it, make the same change in the other file.
- If the other repo is not at the sibling path, tell the user.

### Safety
- Ask before destructive git commands: `git reset --hard`, `git clean`, etc.
- Ask before long or expensive tasks: whole projects, full test suites, large containers, etc.
- Do not send requests to `*.genome.mcgill.ca` hosts without user approval. These hosts are production and QC servers. The rule applies to `curl`, web fetch tools, scripts, tests and app runs that use configs with these hosts. Ask first, and name the host and the endpoint.
- Remove small temporary tests and containers afterward.

### Coding
- Fix the root cause of errors. Do not suppress them or add workarounds without approval. If the fix is large, ask first.
- Do not refactor unrelated code.
- Comment only the "why".

### Tooling
- Containers: prefer `podman` over Docker.

### Git
- Before you change a branch, merge the remote default branch into it:
  1. Run `git fetch origin`.
  2. If the working tree has uncommitted changes, stop and ask the user. The merge must not mix with current work.
  3. Run `git merge --no-ff origin/<default>` (`origin/main` or `origin/master`). Do this before any other change. Git records the merge as its own commit. Keep its default message.
  4. If the merge has conflicts, stop and ask the user. Do not resolve them without approval.
  5. Do not rebase. The team squash-merges on GitHub.
- Skip this step for read-only work.
- Write commit messages for a reader with no session context (a person or a later AI agent session):
  - Subject: imperative, max 72 characters, state the result.
  - Body, in ASD-STE100 style with bullet/numbered points:
    1. Goal: why the change is necessary (problem, ticket, or request).
    2. Notes (if applicable): non-obvious decisions, rejected alternatives, known limits, follow-up work.
- After your actual commit message, add a haiku that describes the commit. Put the haiku above the Co-Authored-By line, so the Co-Authored-By line stays last.
- If the commit has no Co-Authored-By line but you wrote the haiku, add `Haiku by <your model name>` on the last line, as plain text and not a trailer, so GitHub does not list you as co-author.

### Local notes
- `AGENTS.local.md` holds private notes for one developer. Git ignores it.
- If `AGENTS.local.md` exists and is not already loaded, read it at session start.
- Do not commit `AGENTS.local.md` or `CLAUDE.local.md`.
<!-- END shared dev-conventions -->
