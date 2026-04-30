# Plan — Remove `typings@2.1.1` from devDependencies

- **Date:** 2026-04-30
- **Author:** Claude (under Jules's direction)
- **Status:** Draft — awaiting approval before execution
- **Effort estimate:** 15–30 min including verification
- **Blast radius:** local-only at runtime; build/test pipeline unchanged

## 1. Goal

Drop the deprecated `typings` package from `devDependencies`. It is the root cause of 3 of the 10 `pnpm.overrides` we shipped in PR #4 and is no longer used by any code or script in this repo.

## 2. Why now

| Fact | Source |
|------|--------|
| `typings` deprecated 2017 in favor of `npm @types`, with a `pnpm install` warning each run | pnpm's deprecation banner |
| Referenced **only** in `package.json:38`. No `import "typings"`, no `require("typings")`, no script invocation, no CI step | `grep -rE "from ['\"]typings['\"]\|require\\(['\"]typings['\"]\\)" src rollup.config.js tsconfig.json package.json .github` returns one hit — the `package.json` declaration itself |
| Pulls in 7 transitive packages that exist for no other consumer in our tree: `typings-core`, `popsicle`, `popsicle-proxy-agent`, `rimraf@2`, `glob@7` (one of two parents), `https-proxy-agent@1`, `got` (sole consumer), `tough-cookie` (sole consumer) | `pnpm why <pkg>` output — see § 7 verification table |
| Without `typings`, three pnpm overrides become dead code we can drop: `https-proxy-agent`, `got`, `tough-cookie` | Same chain analysis |

## 3. Non-goals

- Do **not** remove the rollup-plugin-styles / cssnano chain or its overrides (`braces`, `minimatch`, `picomatch`, `postcss`, `serialize-javascript`, `svgo`). That's a separate, larger PR.
- Do **not** bump the plugin version in `manifest.json` or `package.json`. Per `~/brain/plugins/CLAUDE.md`: Jules controls bumps; fork-sync rule says no version edits.
- Do **not** open a PR upstream against `PKM-er/obsidian-editing-toolbar`. Origin push only.

## 4. Pre-flight checks (must pass before edits)

```bash
# A. typings has no source-code consumer
grep -rE "from ['\"]typings['\"]|require\(['\"]typings['\"]\)" \
  --include="*.ts" --include="*.js" \
  src rollup.config.js
# Expect: no output

# B. typings is not invoked by any script or CI step
grep -rE "\btypings\b" \
  --include="*.json" --include="*.yml" --include="*.yaml" \
  --include="*.sh" --include="Makefile" \
  package.json .github scripts/ 2>/dev/null \
  | grep -v "@types\|@typescript-eslint\|^_docs/"
# Expect: only the `package.json` `"typings": "^2.1.1"` line itself

# C. Confirm the override chains we plan to drop are typings-exclusive
for p in https-proxy-agent got tough-cookie; do
  echo "=== $p ==="
  pnpm why "$p"
done
# Expect: each chain reaches typings as its only top-level parent
```

If any check shows additional consumers, **stop** and revisit scope before proceeding.

## 5. Implementation steps

1. **Branch.** From current `master`:
   ```bash
   git checkout master && git pull --ff-only
   git checkout -b chore/remove-typings
   ```

2. **Edit `package.json`** in two places:
   - **Drop** `"typings": "^2.1.1"` from `devDependencies` (currently the last entry).
   - **Drop** the now-redundant overrides from `pnpm.overrides`:
     - `"https-proxy-agent": ">=2.2.3"`
     - `"got": ">=11.8.5"`
     - `"tough-cookie": ">=4.1.3 <5"`

   Keep these overrides — they have non-typings parents:
   - `node-fetch` (consumed by jsdom via vitest)
   - `braces`, `minimatch`, `picomatch`, `postcss`, `serialize-javascript`, `svgo` (consumed by rollup-plugin-styles → cssnano + rollup-plugin-terser chains)

3. **Regenerate lockfile:**
   ```bash
   pnpm install
   ```
   Expect: 8–12 packages removed (`typings`, `typings-core`, `popsicle`, `popsicle-proxy-agent`, `rimraf@2`, the `glob@7` instance fed by rimraf, `https-proxy-agent@9`, `got@15`, `tough-cookie@4`). No new packages added.

4. **Verify build still passes:**
   ```bash
   pnpm build && pnpm test
   ```
   Expect: rollup output unchanged (no typings code is bundled — it's a build-time-only tool that we don't actually run); 91/91 tests still pass.

5. **Verify Dependabot stays at 0 open alerts:**
   ```bash
   gh api repos/yepjules/obsidian-editing-toolbar/dependabot/alerts \
     --paginate -q '[.[] | select(.state=="open")] | length'
   ```
   Expect: `0`. (We're not opening new exposure — just dropping a package and its compensating overrides simultaneously.)

6. **Commit and push:**
   ```bash
   git add package.json pnpm-lock.yaml
   git commit -m "chore: remove deprecated typings@2.1.1 and its compensating overrides"
   git push -u origin chore/remove-typings
   ```

7. **Open PR** to `yepjules/obsidian-editing-toolbar` (NOT upstream):
   ```bash
   gh pr create --repo yepjules/obsidian-editing-toolbar \
     --base master --head yepjules:chore/remove-typings \
     --title "chore: remove deprecated typings@2.1.1" \
     --body-file _docs/plans/2026-04-30-remove-typings.md
   ```
   (Or paste a summary; this plan file as PR body works fine.)

## 6. Test plan

- [ ] Pre-flight checks A, B, C in § 4 all pass before any edit.
- [ ] After edits, `pnpm install` removes ≥8 packages and adds 0.
- [ ] `pnpm build` produces a `main.js` whose SHA-256 matches the pre-change SHA-256 (typings is not bundled, so output should be byte-identical).
  ```bash
  shasum -a 256 Editing-Toolbar-Test-Vault/.obsidian/plugins/editing-toolbar/main.js
  # before vs after
  ```
- [ ] `pnpm test` reports 91/91 passing.
- [ ] `pnpm install --frozen-lockfile` succeeds on the new lockfile (CI hygiene check).
- [ ] Open Dependabot alerts remain at 0 after merge.

## 7. Verification — chain analysis (already done)

Run on `master` at `21ca0cb` with `pnpm@9.15.9`:

| Package | Reachable via typings | Other parents | Override status after typings removal |
|---|---|---|---|
| `https-proxy-agent` | ✅ (only path: typings → typings-core → popsicle-proxy-agent) | none | drop override |
| `got` | ✅ (only path) | none | drop override |
| `tough-cookie` | ✅ (only path) | none | drop override |
| `popsicle` / `popsicle-proxy-agent` / `typings-core` | ✅ | none | gone with typings |
| `rimraf@2` | ✅ | none | gone with typings |
| `node-fetch` | ❌ (non-typings parent: jsdom via vitest) | jsdom | **keep override** |
| `braces` / `minimatch` / `picomatch` / `postcss` / `serialize-javascript` / `svgo` | ❌ | rollup-plugin-styles → cssnano, rollup-plugin-terser | **keep all six overrides** |

## 8. Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Hidden script invokes `typings` (e.g., a postinstall in some plugin's CI we forgot) | Low — pre-flight check B catches this | Run check B; if any hit, stop and triage |
| Removing override re-introduces a vulnerable transitive on a path we missed | Low — chain analysis shows 1:1 parent relationship | Pre-flight check C confirms typings is sole parent; post-merge Dependabot probe catches regressions |
| Lockfile churn destabilizes `pnpm install --frozen-lockfile` in CI | Low — this is a clean removal, not a re-resolution | Run frozen-lockfile install in test plan step 4 |
| Future fork-sync from upstream re-introduces `typings` (upstream still has it) | Medium — every cherry-pick from `PKM-er/master` could touch `package.json` | Document in `_docs/hardening/` so the next sync operator knows to drop the line again, OR file an issue against upstream |

## 9. Rollback

```bash
git revert <commit-sha-of-removal>
pnpm install
git push
```

Or `gh pr revert` on the merged PR if it's already in `master`.

Reverting reintroduces 9 packages and 3 vulnerable transitive chains; expect Dependabot to re-fire those 3 alerts (`https-proxy-agent` critical+moderate, `got` moderate, `tough-cookie` moderate). At that point: re-add the 3 overrides to suppress them.

## 10. Open questions for Jules before execution

1. **Upstream coordination?** Should we also propose this removal to `PKM-er/obsidian-editing-toolbar` (separate concern from this fork's hardening), or treat it as fork-only?
2. **Bundle the rollup-plugin-styles modernization?** That would knock out 6 more overrides but is a much bigger change (potential CSS extraction behavior changes). Recommend a separate PR after this one lands.
3. **Branch name preference?** `chore/remove-typings`, `harden/2026-04-XX-remove-typings`, or fold into the next `harden/<date>` cycle?

## 11. Estimated diff

```
package.json    | -1 (devDeps line) + -3 (overrides lines) ≈ 4 deletions, 0 additions
pnpm-lock.yaml  | ≈ -200 / +0 lines (8–12 packages and their resolution metadata)
```
