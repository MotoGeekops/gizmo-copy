# RecallForge architecture

RecallForge is a working personal study application built from the Sites Vinext starter. The complete product brief is retained in [PRODUCT_SPEC.md](PRODUCT_SPEC.md). The current release prioritizes a reliable online study workflow; the feature report records its remaining limits.

## Verified hosting boundary

- Sites accepts a Cloudflare Worker ES module with a default `fetch` handler. This release builds `dist/server/index.js` and static client assets.
- D1 is declared as `DB`; R2 is declared as `BUCKET` in `.openai/hosting.json`. Both bindings were exercised through local workerd/Miniflare, including actual persisted SQLite records and image objects.
- The maintained Sites/Vinext build integration is preserved. Drizzle schema and generated migrations are committed. Sites applies pending migrations when a version is deployed.
- Native Rust executables are not assumed to run on Sites. Rust is compiled to `wasm32-unknown-unknown`.
- The Cloudflare Vite plugin imports `.wasm?module` as a `WebAssembly.Module`. The production Worker instantiates the compiled Rust module; the same bytes are available to the browser under `/engine/study_core.wasm`.
- A complete production-format build and local Worker execution succeeded. Hosted authentication, storage provisioning, and execution have **not** been verified by deployment because the user explicitly reserved publication approval.

Primary runtime reference: [Cloudflare non-JavaScript modules](https://developers.cloudflare.com/workers/vite-plugin/reference/non-javascript-modules/).

## Modules

| Directory               | Responsibility                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `app/`                  | Page entry, layout, CSS, and authenticated API routes                                            |
| `components/`           | React interface, card editor, study interactions, imports, analytics                             |
| `crates/study_core/`    | Rust evaluation, scheduling, transitions, XP, levels, streaks, mastery, basic content validation |
| `lib/engine-abi.ts`     | Synchronous JSON ABI shared by browser and server                                                |
| `lib/browser-engine.ts` | Lazy browser Wasm loading and evaluation                                                         |
| `lib/importers.ts`      | Local text, CSV, JSON, PDF, DOCX, and PPTX processing                                            |
| `server/engine.ts`      | Trusted Worker-side Wasm execution                                                               |
| `server/store.ts`       | Queries, study sessions, review transactions, statistics                                         |
| `server/library.ts`     | Subjects, folders, decks, cards, imports, exams                                                  |
| `server/backup.ts`      | Versioned export, validated transactional restore, data removal                                  |
| `server/ai.ts`          | Optional provider adapter, output validation, daily usage limit                                  |
| `db/`, `drizzle/`       | Relational schema and immutable migration history                                                |
| `tests/`                | Synthetic acceptance integration tests and Wasm/import checks                                    |

The ABI intentionally has no DOM, HTTP, database, or Cloudflare dependencies. A future Axum backend can reuse the Rust crate and replace the storage/API adapters.

## Authentication and ownership

Sites owns sign-in and injects the authenticated user ID. Every API operation rejects anonymous requests and authorizes records against that stable ID. IDs supplied by a browser are never sufficient proof of ownership. Images have the same checks. Local development uses the starter's loopback-only mock sign-in; this is excluded from production builds.

The Site was created private and unpublished. No sharing policy was changed. Do not make the Site public to debug authentication. Direct built-Worker testing is loopback-only and injects synthetic identity headers; production identity depends on Sites dispatch.

Writes check request origin and use parameterized SQL. Zod validates application inputs. The interface renders user prose as React text. Its limited Markdown parser does not accept HTML. KaTeX uses `trust: false` and bounded expansion.

## Study data integrity

Twenty-two relational tables cover users, preferences, subjects, folders, decks, tags, cards, choices, source references, images, sessions, answers, schedules, review history, XP events, daily activity, exams, exam/deck links, plan targets, achievement unlocks, imported source excerpts, and AI usage jobs.

A session stores an ordered snapshot of its question content. Refreshing resumes the database cursor. Answer evaluation, schedule calculation, rewards, and transitions run on the server's Rust module; the browser cannot submit an XP amount or a new schedule.

An answer is identified by a client-generated request UUID and the unique `(session_id, position)` constraint. A single D1 batch inserts the answer, updates the schedule, appends history, advances the cursor, records activity, and awards eligible XP. An optimistic schedule version prevents simultaneous reviews from overwriting each other. A retry returns the saved result. A reused request ID with different answer content is rejected.

Wrong answers append the card for another attempt, with at most three appearances per session. Test, speed, and cram modes do not append retries. A wrong card's due time is still stored even when a session is ended early. Session completion and daily-goal XP use unique event keys. Correct-answer XP is limited to once per card per Manila day.

UTC milliseconds are stored in the database. The Rust day function and TypeScript queue boundaries both use UTC+8, the Asia/Manila calendar. A missed day resets the current streak; yesterday's streak remains active until the current day ends.

## Scheduling and progression

This is a documented **SM-2-inspired** scheduler, not FSRS.

| Rating | New / learning / relearning | Established review card            |
| ------ | --------------------------- | ---------------------------------- |
| Again  | 1 minute                    | 1 minute; lapse recorded           |
| Hard   | 10 minutes                  | max(1 day, interval × 1.2)         |
| Good   | 1 day                       | max(3 days, interval × ease)       |
| Easy   | 4 days                      | max(4 days, interval × ease × 1.3) |

Ease starts at 2.5 and stays between 1.3 and 3.0. Again lowers ease by 0.2, Hard by 0.15, and Easy increases it by 0.15. Intervals are capped at 3,650 days. These are transparent heuristics; no fitted retention model or desired-retention guarantee is claimed.

Mastery is `min(100, ln(1 + interval_days) / ln(31) × 100) × retrieval_accuracy`, rounded. The 80% threshold is a product heuristic. Exam readiness averages associated card mastery and is explicitly labeled as an estimate.

Correct recall earns 10 XP, or 15 for a challenging card, once per card per day. A nonempty completed session earns 20 XP, or 40 for a practice test. The daily answer-attempt goal awards 30 XP once per day. Level `n` requires `100 × n` XP to reach the next level. There is no leaderboard or payment system.

## Imports and AI

Text, Markdown, CSV/TSV, JSON deck files, text PDFs, DOCX, and PPTX are processed on the device. The PDF worker and math fonts are local assets. ZIP extraction selects only expected document/slide XML, limits each accepted section, and bounds expanded output. Files are limited to 12 MB, extracted text to 300,000 characters, and PDF documents to 100 pages.

The non-AI parser recognizes explicit term/definition pairs, tab-separated question/answer lines, and bracketed cloze sentences. It rejects unsupported prose instead of inventing facts. Drafts can be edited or removed; nothing is added until confirmation. Structured imports are limited to 200 cards per transaction.

Optional Gemini and OpenRouter adapters run server-side. They use only configured runtime secrets and a fixed provider endpoint. Requests are opt-in, bounded, and limited to 10 per account per Manila day, including failed requests. Source documents are treated as untrusted data in prompts. Generated cards must pass the card schema and contain a source excerpt found in the supplied material. This is an evidence check, not a proof of factual correctness; human preview remains required.

There is no preconfigured key, assumed subscription entitlement, fake AI response, dollar-based spending cap, or successful live-provider verification.

## Backups and offline behavior

The complete `recallforge-backup` version 1 format contains normalized records, review schedules, history, XP, settings, and image metadata. Binary R2 attachments are not included. Restore validates the full graph before a single transactional replacement, maps identifiers to prevent collisions with other accounts, and preserves schedules and history. Foreign-account attachment paths become missing-image placeholders; originals must be uploaded again.

Browser storage holds only incomplete editor drafts. D1 remains the source of truth. Offline study, queued offline writes, synchronization, service-worker caching, and PWA installation are not implemented. A network error does not show a false save confirmation.
