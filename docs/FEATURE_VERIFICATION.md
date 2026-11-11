# Feature verification

This release is a working online study application and a foundation for the complete product brief. It is not a claim that every long-term requirement is finished.

## Implemented and verified

- Production-format Sites/Vinext build, TypeScript check, real Rust Wasm execution in a local Cloudflare Worker and browser.
- Thirty-five Rust unit tests; fifteen Wasm/import checks; thirty-two database integration checks, including a clean-account restore. All 82 automated checks passed.
- Private-account API authorization, cross-account denial, cross-origin write denial, parameterized persistence, and R2 image ownership.
- Subject creation, deck creation, card creation/editing, refresh persistence, real due dates, resumable sessions, XP deduplication, daily goals, Manila streaks, and deterministic achievements.
- Five QA plus two cloze cards; correct and incorrect responses; wrong-card retry; completion; statistics; refresh; valid export; clean-account backup restore with equal schedules and history.
- Multiple choice, multiple select, true/false, matching, ordering, and image records exercised through the server API.
- Browser creation of Filipino → Vocabulary, autosaved QA card, a real TXT file import with review, a full memorise session, a wrong-answer retry, and a mid-session refresh. Results showed 7 correct out of 8 attempts and 90 actual recall/session XP.
- DOCX and text-PDF extraction checked in the browser using real, minimal documents. The PDF produced two editable drafts with page references.
- Light and dark desktop layouts, 390 × 844 mobile layout, mobile bottom navigation, and no document-level horizontal overflow at the tested mobile size.
- Complete backup format, validation before replacement, schedule/history preservation, and malformed-restore rejection.
- Missing AI configuration returns an actual error and the interface explains the required configuration.

The generated `outputs/integration-results.json` records the latest integration count and checks. Synthetic API accounts are cleaned after the suite. Browser acceptance data belongs only to the starter's local preview identity and is not deployed.

## Implemented with limited verification

- All eight card editors and their study interactions. Objective server grading is covered; every card format has not been manually exercised on physical iOS Safari.
- Classic flashcard browsing, self-rating, shuffle, and keyboard controls; practice tests, speed rounds, weakness review, custom sessions, and cram practice.
- Deck favorites, archive/recovery, duplicate, merge, bulk card movement/deletion, subjects, folders, tags, search, and sort. Core archive/move/recovery and duplicate behavior are integration tested; every UI combination is not covered by a persistent browser automation suite.
- PDF, DOCX, and PPTX extraction. TXT, DOCX, and text-PDF browser checks are recorded above. Broad real-world document compatibility is not established. Scanned or encrypted documents can require an alternative extraction workflow.
- Images persist in local R2; image backup restoration requires retained objects or original uploads. Newly cloned image cards share the same owner's immutable object bytes.
- Exam editing, connected decks, readiness estimates, editable daily targets, and practice test generation. The planner uses remaining cards, current due load, and days available; it does not optimize around a detailed available-time calendar.
- Optional Gemini/OpenRouter tutor and source-grounded QA generation adapters. No live AI call has been made because no provider key is configured.
- Reduced motion, theme persistence, semantic forms, dialog focus containment, keyboard input, and non-color-only feedback. No formal WCAG conformance certification or full assistive-technology audit is claimed.

## Frontend redesign verification

On November 11, the interface was redesigned around an interactive index card, locally hosted Bricolage Grotesque and DM Sans, a restrained violet palette, deck spines, and a quieter navigation system. The dashboard, library, card editor, study screen, imports, and supporting pages share the revised type and spacing system.

The browser check covered the dashboard card reveal, library and card-editor navigation, starting a real seven-card session from the dashboard, saving and pausing, theme changes, and the phone dashboard and study screen. The tested phone viewport reported equal document and viewport widths, with no horizontal overflow. No browser console errors were recorded during the final check. Temporary dark-theme changes were restored to the local account's light preference.

Screenshots are saved locally under `outputs/RecallForge-Redesign.jpg`, `outputs/RecallForge-Redesign-Mobile.jpg`, and `outputs/RecallForge-Redesign-Dark.jpg`. They show local acceptance data, not a deployed account. The final TypeScript check passed; source packaging runs a fresh production build after this redesign. The backend and Rust implementation did not change during this visual pass.

## Partial or deferred

- Onboarding is an inline first-run path with optional starters, subject/deck creation, and editable goals; no multi-step onboarding wizard.
- Rich text supports safe bold, italic, lists, Unicode, and LaTeX. There is no WYSIWYG toolbar or image annotation editor.
- AI generation currently creates grounded QA drafts; mixed AI-generated interactive formats and per-card AI regeneration are deferred. Each draft is editable and removable.
- Tutor messages stay in the current page visit. Conversation history is not persisted and prior conversation turns are not sent as hidden context. Deck context and the current question are sent explicitly.
- Statistics include activity, accuracy, time, mastery, subject aggregates, and recommendations. Advanced trend modeling and per-topic graphs are deferred. Complete history is in the backup; the on-page activity summary includes the most recent 50 sessions.
- No OCR, scanned-PDF recognition, audio transcription, YouTube/webpage fetching, or Anki package reader. Anki-compatible plain text/TSV exports are supported.
- No PWA installation, offline writes, background reminders, notification delivery, conflict-tested offline sync, or large-library virtualization.
- No FSRS, fitted retention estimate, AI semantic confidence grading, request-cost estimate, or dollar-based AI budget enforcement.
- Production authentication, hosted D1/R2 provisioning, cross-device synchronization, and real iPhone Safari have not been verified through deployment.

## Publication state

The Site is private and unpublished. A saved source/build version is prepared for review. The user explicitly requested approval before final publication, so there is no claimed live hosted preview URL. The local preview uses loopback access and a separate local database.
