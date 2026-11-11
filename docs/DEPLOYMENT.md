# Local development and Sites deployment

## Prerequisites

Node.js 22.13 or newer, npm, Git, stable Rust, and the `wasm32-unknown-unknown` target. The Windows checkout was tested with Node 24.19.0. Native Rust server hosting is not required.

From the project directory:

```powershell
npm ci
rustup target add wasm32-unknown-unknown
npm run build:rust
npm run build
```

`prebuild` prepares the local PDF worker and KaTeX fonts. Compiled Wasm is committed under `lib/wasm/` and `public/engine/` so a Sites build does not require a Rust toolchain; rebuild it when Rust sources change.

For the first local database only, after building:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_round_thor.sql
```

Do not replay an already-applied migration. Later schema changes belong in `db/schema.ts`; generate a new migration with `npm run db:generate`, inspect it, and apply only pending files. Request handlers never create or alter migration-owned tables.

```powershell
npm run dev -- --port 5173
```

Open the printed loopback URL and use the local sign-in link. The starter signs in as `local_seedy`; it is a simulated development identity and does not provide access to production data. The local database is under `.wrangler/state`. Keep it out of Git.

`npm start -- --port 5180` previews the built Worker, with the same local bindings. Stop the built Worker before rebuilding on Windows because it can hold output files open.

## Checks

```powershell
cargo test
cargo fmt --check
cargo clippy --all-targets -- -D warnings
npm run check
npm run test:wasm
npm run build
npm start -- --port 5180
```

In another terminal, run `npm run test:integration`. The integration suite refuses non-loopback targets, uses freshly generated synthetic account IDs, and cleans their records afterward. It must not be pointed at a deployed Site. Browser QA is recorded in the feature report.

## Optional AI environment

No secret is needed for normal study features. Supported runtime values:

| Variable             | Purpose                                          |
| -------------------- | ------------------------------------------------ |
| `GEMINI_API_KEY`     | Gemini provider secret; chosen when present      |
| `OPENROUTER_API_KEY` | OpenRouter provider secret when Gemini is absent |
| `AI_MODEL`           | Provider-specific model identifier               |

Defaults are `gemini-2.5-flash` and `openrouter/auto`; model availability and charges are provider-controlled. This release has not verified a live call. Enable AI in the application's Settings only when ready to send the chosen material to the configured provider.

For local development, put values in an ignored `.dev.vars` file. For production, use Sites runtime environment variables through the native Sites tools. Never put keys in the browser, hosting manifest, Git, or chat. No OpenAI key is required by this application.

## Source and build packaging

The stable Site ID is in `.openai/hosting.json`. Reuse it; do not create a second Site for this checkout. Preserve `DB` and `BUCKET` and the current owner-private audience.

The Sites source workflow helper accepts short-lived repository credentials on hidden stdin, synchronizes the exact source commit, runs remaining build commands, and produces the deployment archive. Keep credentials in memory and never save them to a file or shell command.

Save the archive with the exact pushed `commit_sha` using `save_site_version`. **Saving is permitted; final deployment requires the user's approval in this project.** A saved version is not a deployed website and its expected origin is not proof that it is live.

After explicit publication approval, deploy the saved version using `deploy_private_site_version`, retaining owner-only access. The Sites platform provisions D1/R2 and applies the committed schema migrations. Poll only a nonterminal deployment. Verify hosted sign-in, CRUD, a complete study session, export/restore, and access from a second device after deployment.

No test database or preview study records are part of the build. Hosted storage starts separately. If real local study data should move to the hosted account, use a complete backup and restore after sign-in; keep image originals separately.

## Backups

Settings → Complete data backup downloads `recallforge-backup` version 1. It contains relational data, preferences, schedules, sessions, answers, history, XP, achievements, exams, source excerpts, and image metadata. It does not contain image bytes. A deck-only export intentionally starts fresh learning history when imported.

Keep backups and source images in a private location. Restore requires typing `RESTORE`, validates the complete input graph, remaps record IDs, and transactionally replaces the current account's records. The interface explicitly warns about missing image attachments. Erasing all data requires `DELETE ALL` and also removes objects under that account's R2 prefix.
