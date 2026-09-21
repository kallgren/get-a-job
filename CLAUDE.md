## Non-obvious quirks

- Prisma 7 uses `prisma.config.ts` for `DATABASE_URL` (not in `schema.prisma`)
- shadcn/ui `Select` is a combobox (click button → click option), not a native `<select>`
- Clerk e2e: magic code `424242` bypasses real email verification in test/dev

## Preferences

- Keep dependencies minimal; prefer libs with few transitive deps
- Use shadcn CSS variables for colors, not Tailwind's default color utilities
- Keep `README.md` in sync when anything it mentions changes
- Before commit: no TS errors, no lint errors, tests pass

## Agent skills

### Issue tracker

Issues live as GitHub issues in `kallgren/get-a-job`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, used verbatim. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
