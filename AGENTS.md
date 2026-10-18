# Shared AI collaboration rules — preflight

These instructions apply to both Claude and ChatGPT or other coding agents. GitHub is the shared source of truth for **committed** work; chat contexts and uncommitted changes are not automatically shared.

## Safety and development protocol

1. At the start of each task, inspect current `main`, recent commits, open pull requests, and this file. Do not assume another agent's local or unpushed edits are visible.
2. Work on an isolated task branch (prefer `claude/<task>` or `chatgpt/<task>`). Start from current `main`; do not share a writable working tree or force-push over another agent's branch. Never push directly to `main` for AI-initiated changes.
3. If another agent has an open PR touching the same files or feature, stop and explain the overlap to the owner. Coordinate before editing. Rebase/merge updated `main` before proposing a PR, resolving conflicts deliberately.
4. Use PRs to propose changes. The owner reviews/approves merge and production releases; no unattended merges, deployment changes, or production write operations. This is a collaboration policy, **not** an assertion that branch protection is already enforced.
5. Before each PR, run applicable tests and provide results or explain what's untested. Do not invent test results. Include summary, changed files, risks, rollout and rollback notes. No new deployment automation or scheduled code changes without the owner's approval.
6. No production secrets, Microsoft/Stripe keys, customer data, sensitive logs, or tokens in Git commits, PRs, chat handoff files, or examples. Do not edit environment secrets or production databases without explicit authorization.
7. Keep each project's infrastructure isolated. Never reuse the other project's KV namespace, Stripe credentials, deployment configuration, or customer data.
8. Before handing off to the other assistant, commit and push completed work to the task branch, link the PR/commit, and give a concise status: done, pending, tests, blockers, next steps. If unfinished local work is not pushed, state explicitly that the other assistant cannot see it.
9. These instructions are intended for new tasks. Existing scheduled Claude jobs and automation workflows may still push to `main` until separately reconfigured. Audit and migrate those jobs **before** enforcing rulesets or assuming every change follows this policy.

## Repository-specific notes

Cloudflare Worker `preflight`, production at prelaunchcheck.dev. Uses Stripe Payment Link and a different KV namespace from TenantGrade. `npm test` currently is a failing placeholder, so do not claim CI validation until real tests exist. Preserve owner-verification safeguards.

## Collaboration handoff template

- Agent and task:
- Base commit / latest `main` checked:
- Working branch and PR URL:
- Files/features changed:
- Tests run and results:
- Deploy or migration impact:
- Open issues / next action:
- Overlapping active work:

Do not treat this file as granting permission to edit production or to merge. The owner makes those decisions.
