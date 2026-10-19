# FreezeMan

Freezer management system for tracking biological samples in a lab. License: LGPL v3.

## Layout

- `backend/`: Django project (Python 3.14, Postgres 15+).
  - `dependencies/pg_fzy`: git submodule, Postgres `fzy` extension (needs `make`; not in migrations). See the `freezeman` skill, "Database" section.
- `frontend/`: Node 24.x.
- `VERSION` holds the release version.
- `fms.log*` files are git-ignored: do not read or commit them.
- Ignore root `package.json`

## Git

- Never commit on master and qc branches

## Skill

- Before backend, database, migration, frontend build/verify or deployment work, read `.agents/skills/freezeman/SKILL.md`.

<!-- BEGIN shared dev-conventions -->
## Dev Conventions

### Sync
- The section between the `BEGIN` and `END` markers is identical in `freezeman/AGENTS.md` and `data-delivery-monitor/AGENTS.md`. Ideally, the two repos are siblings in the same parent folder.
- When you change it, make the same change in the other file.
- If the other repo is not at the sibling path, tell the user.

### Safety
- Ask before destructive git commands: `git reset --hard`, `git clean`, etc.
- Ask before long or expensive tasks: whole projects, full test suites, large containers, etc.
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
  5. Do not rebase. The team squash-merges on GitHub. Exception: the local squash in "Squash merge" below, only on user request.
- Skip this step for read-only work.
- Write commit messages for a reader with no session context (a person or a later AI agent session):
  - Subject: imperative, max 72 characters, state the result.
  - Body, in ASD-STE100 style with bullet/numbered points:
    1. Goal: why the change is necessary (problem, ticket, or request).
    2. Changes: what changed, grouped by intent. Do not repeat the diff line by line.
    3. Notes (if applicable): non-obvious decisions, rejected alternatives, known limits, follow-up work.
- After your actual commit message, add a haiku that describes the commit. Put the haiku above the Co-Authored-By line, so the Co-Authored-By line stays last.
- If the commit has no Co-Authored-By line but you wrote the haiku, add `Haiku by <your model name>` on the last line, as plain text and not a trailer, so GitHub does not list you as co-author.

### Squash merge
- GitHub squashes each PR into one commit on the default branch. The PR title becomes the subject and the PR description becomes the body. Per-commit messages must not pile up in that commit.
- When you open or update a PR, write the PR title and description as the final squash commit message:
  - Title: same rules as a commit subject.
  - Description: Goal, Changes, Notes for the whole branch, not per commit. Do not list merge commits from the default branch.
  - Add one haiku for the whole branch.
  - End with one `Co-Authored-By` line per distinct co-author found in the branch commits (`git log origin/<default>..HEAD --format='%(trailers:key=Co-Authored-By,valueonly)' | sort -u`).
- Local squash: only when the user asks. Show each command and wait for approval before you run it:
  1. If the working tree has uncommitted changes, stop and ask the user.
  2. Merge the remote default branch first (see "Git" above).
  3. Run `git branch backup/<branch>` to keep the old history.
  4. Run `git reset --soft $(git merge-base HEAD origin/<default>)`.
  5. Commit once with the final squash message.
  6. Compare `git diff backup/<branch> HEAD`. If it is not empty, stop and tell the user.
  7. Run `git push --force-with-lease`. Tell the user that this rewrites the remote branch.
  8. After the PR merges, tell the user that they can delete `backup/<branch>`.

### Local notes
- `AGENTS.local.md` holds private notes for one developer. Git ignores it.
- If `AGENTS.local.md` exists and is not already loaded, read it at session start.
- Do not commit `AGENTS.local.md` or `CLAUDE.local.md`.
<!-- END shared dev-conventions -->
