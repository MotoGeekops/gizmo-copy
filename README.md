# RecallForge

**Study smarter. Remember longer.**

RecallForge is a private personal study application with a React/Vinext interface, a real Rust WebAssembly study engine, Cloudflare D1 persistence, and R2 images. It targets ChatGPT Sites hosting.

This version provides a working online study workflow. Updates are prepared for review; publication requires the approval requested in the build brief. The [feature report](docs/FEATURE_VERIFICATION.md) distinguishes verified, partial, and deferred capabilities.

## Start locally

Open this directory in a terminal and run:

```powershell
npm ci
npm run build:rust
npm run build
```

On a fresh local database, apply `drizzle/0000_round_thor.sql` using the command in [deployment instructions](docs/DEPLOYMENT.md), then run:

```powershell
npm run dev -- --port 5173
```

Open the printed local URL and use the loopback development sign-in. Hosted and local study data are separate. The prepared checkout already has its local schema applied.

## What works

- Subjects, folders, editable decks, tags, favorites, archive/recovery, duplication, merge, bulk card movement/deletion, and search.
- Eight flashcard formats, explicit acceptable answers, hints, explanations, source references, image uploads, safe Markdown, LaTeX, autosave, and device drafts.
- Memorise, Classic flashcards, practice tests, speed rounds, weakness review, custom study, and cram practice; sessions survive refresh.
- Rust answer evaluation, a documented SM-2-inspired scheduler, bounded wrong-answer retries, XP deduplication, Manila streaks, levels, and mastery.
- Real dashboard/statistics, deterministic achievements, exam decks, readiness estimates, and editable study targets.
- Reviewed Smart Import for text, Markdown, CSV/TSV, JSON, text PDFs, DOCX, and PPTX. A clearly identified non-AI parser works without a provider.
- Optional secured Gemini/OpenRouter tutor and grounded QA generation adapters. No AI key is configured; no fake AI output is shown.
- Versioned data backup and validated transactional restore. Image bytes require separate originals.
- Light/dark/system themes, reduced motion, keyboard controls, and mobile bottom navigation.

There is no FSRS claim, offline synchronization, PWA, OCR, audio/URL import, advertising, leaderboard, subscription, or background reminder system.

## Verification

```powershell
cargo test
cargo fmt --check
cargo clippy --all-targets -- -D warnings
npm run check
npm run test:wasm
npm run build
```

Preview the build with `npm start -- --port 5180`, then run `npm run test:integration` in another terminal. Tests refuse non-loopback URLs and use synthetic accounts. Stop the built preview before rebuilding on Windows.

Latest automated results: 35 Rust tests, 15 Wasm/import checks, and 37 integration checks pass. TypeScript, Rust formatting/Clippy, and the production-format build pass. Browser checks and remaining verification limits are recorded in [FEATURE_VERIFICATION.md](docs/FEATURE_VERIFICATION.md).

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for the domain/storage boundary and [DEPLOYMENT.md](docs/DEPLOYMENT.md) for migrations, secrets, backups, and the saved-version publishing workflow. The complete target specification is preserved in [PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md).

## Source layout

`crates/study_core` contains the reusable Rust engine. `server` contains Sites-specific persistence and provider adapters. `db` and `drizzle` contain schema/migrations. `app`, `components`, and `lib` contain the interface and browser integrations. Runtime state, secrets, local databases, test exports, and publication archives are ignored.

The root application is an independent implementation. The Sites starter and third-party packages retain their own licenses; dependency versions are locked in `package-lock.json` and `Cargo.lock`.
