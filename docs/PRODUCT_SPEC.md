# MASTER BUILD PROMPT — RECALLFORGE

## 1. Your role and mission

You are an autonomous principal software engineer, Rust specialist, full-stack developer, AI engineer, database architect, UI/UX designer, and quality assurance engineer.

Your mission is to DESIGN, IMPLEMENT, TEST, and PREPARE FOR DEPLOYMENT a complete, production-quality, personal studying website named **RecallForge**.

RecallForge is inspired by the functionality and learning experience of Gizmo (gizmo.ai), Quizlet, and Anki. It must be an independent implementation with original branding, original interface components, and original source code.

**This is not a prototype, a landing page, or a static demonstration. I want a real application that I can use every day to study for school examinations.**

The application must prioritize:

1. Rust as the primary language for core application logic.
2. Compatibility with ChatGPT Sites hosting.
3. Excellent mobile and desktop usability.
4. Accurate, persistent flashcard and study data.
5. An engaging Gizmo-inspired active-recall experience.
6. AI-assisted creation of high-quality educational materials.
7. Scientifically grounded spaced repetition.
8. Fast, smooth, beautiful user interactions.
9. Low operational cost.
10. Privacy and reliability for personal use.

Do not simply generate an attractive interface with placeholder buttons. Every visible primary feature must perform a meaningful action.

---

## 2. Hosting and architecture requirements

### Primary hosting target

**ChatGPT Sites, using @Sites.**

Before choosing the final application architecture:

- Inspect the actual hosting environment.
- Check supported frameworks, runtimes, database interfaces, persistent storage, and secrets.
- Determine whether browser-side WebAssembly assets are supported.
- Determine whether a Rust-based frontend can compile successfully into assets accepted by Sites.
- Determine whether server-side Rust binaries are supported. Never assume that they are.
- Check whether D1-compatible persistence and R2-compatible object storage are available.
- Use only deployment capabilities actually supported by the environment.

### Rust-first architecture

My preferred architecture is:

**Rust:**
- Main domain logic.
- Flashcard answer evaluation.
- Study-session state machines.
- Spaced-repetition calculations.
- Quiz generation and scoring algorithms.
- Progress and experience-point calculations.
- Card validation and transformation.
- Content organization utilities.
- Import processing where compatible.
- Unit-testable business logic.

Compile Rust into browser-compatible WebAssembly using a suitable toolchain if supported.

**TypeScript:**
- React-based website interface if a Rust-native frontend is unsuitable.
- ChatGPT Sites-compatible server endpoints.
- Database and storage adapters.
- Browser integrations.
- API communication.
- AI provider communication through secured server endpoints.

**Styling:**
- Tailwind CSS or an equivalent compatible styling solution.
- Accessible, reusable UI components.
- Responsive design tokens.
- Carefully controlled animations.

**Data:**
- Sites-provided persistent relational storage, preferably D1 when supported.
- Sites-provided object storage, preferably R2 when supported.
- IndexedDB for carefully designed local caching if appropriate.

### Critical compatibility rule

Do not force an incompatible technology onto ChatGPT Sites.

If native Rust server hosting is unavailable, keep the important study algorithms in Rust, compile them to WebAssembly where supported, and use the supported TypeScript server runtime for hosting-dependent functionality.

If Rust/WASM is also unsupported, explain the limitation explicitly, preserve the standalone Rust study-engine source and its tests, and provide a compatible alternative instead of pretending Rust is running in production.

Do not claim the app is Rust-powered unless Rust code is actually executed as part of its production behavior.

Keep the architecture modular so a future Rust/Axum backend could replace the hosting-specific server layer.

---

## 3. Product identity and design philosophy

**Application name:** RecallForge

**Tagline:** Study smarter. Remember longer.

**Audience:** A senior high school student studying academic subjects and preparing for college entrance examinations.

**Usage:** Personal, single-user-first application.

**Primary language:** English.

**Secondary language:** Filipino, including support for Filipino vocabulary, definitions, and study questions.

**Date and time configuration:** Asia/Manila.

### Visual direction

Create a modern, playful, polished, and premium educational interface.

Take inspiration from the approachable learning experience of Gizmo, the cleanliness of Notion, and the responsiveness of high-quality contemporary SaaS applications.

However, create an original visual identity.

Design characteristics:

- Clean and spacious layouts.
- Rounded cards and containers.
- Soft shadows and subtle borders.
- Comfortable typography.
- Excellent visual hierarchy.
- A distinctive violet/indigo primary accent.
- Subtle gradients used selectively.
- Cheerful, restrained gamification.
- Animated study interactions.
- Minimal visual clutter.
- High readability.
- Consistent controls and spacing.

The app should feel alive and enjoyable without resembling an arcade game.

Use an original icon system and original product illustrations when necessary. Do not copy Gizmo logos, mascot artwork, proprietary assets, or protected interface illustrations.

### Theme support

Implement:
- Light mode.
- Dark mode.
- System theme.
- Saved theme preferences.
- Accessible contrast.
- Reduced-motion preferences.

### Responsive design

The interface must work exceptionally well on:

- Desktop browsers.
- Standard laptops.
- Tablets.
- iPhone-sized screens.
- Mobile Safari.
- Mobile Chrome.

On desktop, use a collapsible sidebar.

On mobile, use a thoughtfully designed bottom navigation bar where appropriate.

Avoid horizontal overflow, tiny buttons, or interfaces that require zooming.

---

## 4. Main application navigation

Build the following primary sections:

1. Dashboard
2. My Library
3. Study
4. AI Tutor
5. Exams
6. Statistics
7. Achievements
8. Settings

### Dashboard

The dashboard is the application's home screen.

It should provide an immediately useful overview of the user's learning progress.

Include:

- Personalized greeting.
- Current study streak.
- Total XP.
- Current level.
- Flashcards due for review today.
- Cards mastered.
- Cards still being learned.
- Recommended next study session.
- Upcoming exams.
- Recently studied decks.
- Quick-create flashcard button.
- Import study materials button.
- Daily activity chart.
- Weekly learning goal progress.

A prominent **Study Now** button should start a meaningful review session using due cards.

The dashboard must read actual stored application data.

No fake statistics.

If the user has never studied, show an attractive and helpful onboarding state.

---

## 5. Library and subject organization

Provide a complete personal study library.

### Organizational hierarchy

Support:

Subject → Folder (optional) → Deck → Flashcards

Examples:

- Mathematics
- Filipino
- English
- Science
- Social Sciences
- Media and Information Literacy
- Philippine Politics
- College Entrance Test Review

Each deck must support:

- Title.
- Description.
- Subject.
- Optional cover color or icon.
- Tags.
- Creation date.
- Last studied date.
- Number of cards.
- Mastery percentage.
- Due-card count.
- Optional associated exam.
- Favorite status.
- Archive status.

### Library functionality

Implement:

- Create a subject.
- Rename a subject.
- Create a folder.
- Create a deck.
- Edit a deck.
- Duplicate a deck.
- Merge decks.
- Move cards between decks.
- Archive a deck.
- Restore an archived deck.
- Delete a deck with confirmation.
- Search all cards and decks.
- Filter by subject, tags, mastery, and review status.
- Sort by name, most recent, card count, and due count.
- Select and perform bulk operations.

Ensure destructive actions never happen through accidental taps.

Support undo or recovery where practical.

---

## 6. Advanced flashcard creation

This is one of the most important application features.

Flashcards must be fully editable and persist across browser sessions and devices when authenticated.

### Required card types

**Type A: Question and Answer**

A traditional flashcard containing a question and its answer.

Support front/back flipping and manual self-grading.

**Type B: Fill in the Blank**

Allow users to mark specific answer words as blanks.

Example:

The capital of the Philippines is [Manila].

During studying, hide the designated answer and require the student to recall it.

Support several blanks within one card.

**Type C: Multiple Choice**

Present one question and several answers.

Support:
- One correct answer.
- Randomized option order.
- Explanations.
- Incorrect-answer feedback.

**Type D: Multiple Select**

Allow more than one correct answer.

Clearly indicate whether the question requires one or multiple selections.

**Type E: True or False**

Present a statement and ask the student to evaluate it.

Include an explanation after answering.

**Type F: Matching**

Display two groups of related concepts.

Require the student to correctly match the pairs.

**Type G: Ordering**

Display shuffled steps, events, or concepts.

Require the student to arrange them in the correct sequence.

**Type H: Image Question**

Display a study image with a related question.

Support image-based recall and annotations when technically feasible.

### Card editor

The editor must support:

- Rich text where useful.
- Bold and italic formatting.
- Lists.
- Mathematical formulas using LaTeX.
- Unicode and Filipino characters.
- Optional images.
- Hints.
- Explanations.
- Source references.
- Tags.
- Difficulty labels.
- Multiple acceptable answers.
- Case-insensitive matching where appropriate.
- Save, edit, delete, and duplicate actions.
- Bulk import.
- Bulk editing where practical.

Add autosave with visible save status.

Do not silently discard unsaved edits.

### Answer evaluation

Build a robust answer evaluation engine.

For objective answers:
- Normalize safe whitespace differences.
- Apply case-insensitive matching where appropriate.
- Honor punctuation preferences.
- Accept explicitly configured alternatives.
- Avoid treating unrelated answers as correct.
- Handle multiple selections correctly.
- Handle order and matching questions accurately.

For free-text answers:
- Support exact matching and configured synonyms.
- Permit manual grading.
- If AI grading is available, return a confidence score and explanation.
- Never silently mark a semantically questionable answer as correct.

---

## 7. Study engine and spaced repetition

The spaced-repetition system is a CORE FEATURE.

Implement the scheduling logic primarily in Rust.

Use an established, transparent algorithm such as FSRS when a compatible, maintainable implementation is available. Otherwise implement and test a clearly documented SM-2-inspired scheduler.

Do not claim FSRS compatibility unless the implementation is actually correct.

### Study scheduling

Track per card:

- Creation timestamp.
- Last review timestamp.
- Next review timestamp.
- Review count.
- Success count.
- Failure count.
- Current interval.
- Ease or difficulty parameters.
- Learning state.
- Lapse count.
- Review history.
- Mastery estimates where supported.

Support learning states such as:

- New.
- Learning.
- Reviewing.
- Relearning.

### User review ratings

After a manual flashcard response, provide:

- Again.
- Hard.
- Good.
- Easy.

The chosen rating must update the card's future review schedule.

Wrong answers should generally be reviewed sooner.

Correctly remembered cards should gradually move to longer intervals.

### Study session behavior

Implement:

- Review due cards.
- Study new cards.
- Study all cards.
- Review incorrect answers.
- Review difficult cards.
- Random practice.
- Cram mode.
- Custom sessions.
- Resume interrupted sessions.
- End and save a session.

A session must maintain correct state even when the user refreshes the page.

### Study priorities

Provide a sensible default order:

1. Cards already overdue.
2. Cards due today.
3. Previously failed cards needing relearning.
4. New cards within the daily limit.
5. Optional extra practice.

Prevent a newly failed card from disappearing indefinitely.

Use Asia/Manila for daily review boundaries.

### Customization

Allow adjustment of:

- New cards per day.
- Maximum scheduled reviews per day.
- Daily study goal.
- Desired retention, if supported by the chosen scheduler.
- Randomization.
- Sound effects.
- Animations.
- Auto-advance behavior.
- Keyboard shortcuts.

The goal is better retention, not simply making the user repeatedly answer the same card without purpose.

---

## 8. Interactive studying modes

Create distinct, fully functional study modes.

### Mode 1: Memorise

This is the primary Gizmo-inspired active-recall experience.

Present one question at a time, with:

- A clean centered question card.
- Optional answer input.
- Relevant card image.
- Answer confirmation.
- Immediate feedback.
- Clear correct answer.
- Optional explanation.
- XP earned.
- Smooth animated transition.
- Progress indicator.

Use a mixture of available card formats.

When a student gets a question wrong, provide useful corrective feedback and schedule additional practice.

### Mode 2: Classic Flashcards

Implement:

- Tap to flip.
- Swipe to navigate.
- Previous and next.
- Shuffle.
- Mark known/unknown.
- Keyboard shortcuts.
- Responsive animations.

### Mode 3: Practice Test

Generate an examination from a selected deck or combination of decks.

Allow configuration of:

- Number of questions.
- Question types.
- Time limit.
- Difficulty.
- Subjects included.
- Randomized order.
- Whether explanations appear immediately or at the end.

After submission, show:

- Score percentage.
- Correct answers.
- Incorrect answers.
- Time spent.
- Topic breakdown.
- Questions requiring improvement.
- Recommended follow-up study.

### Mode 4: Speed Round

A short, optional, timed quiz mode.

Features:

- Countdown timer.
- Quick questions.
- Score tracking.
- Accuracy tracking.
- Keyboard and mobile input.
- End-of-session summary.

### Mode 5: Weakness Review

Select cards that the user often gets wrong.

Prioritize:

- Low retrieval success.
- Recent errors.
- Repeated lapses.
- Poor mastery.
- Important exam topics.

### Mode 6: Custom Study

Allow a student to combine subjects, choose card types, and create targeted review sessions.

---

## 9. Smart Import and automatic flashcard generation

Create an excellent import system inspired by Gizmo's Magic Import feature.

Call this feature **Smart Import**.

### Import sources

Support these sources, progressively and according to verified platform compatibility:

**Priority 1 — Required**
- Manually pasted text.
- Plain text files.
- Markdown files.
- CSV files.
- JSON deck files.

**Priority 2 — Strongly preferred**
- PDF documents with extractable text.
- DOCX documents.
- PPTX presentations.
- Common flashcard export formats.
- Compatible Anki text exports.

**Priority 3 — Advanced**
- Images of notes.
- Scanned PDF documents.
- Audio recordings.
- YouTube transcripts when legitimately accessible.
- Public educational webpage URLs.
- Compatible Anki packages.

Do not implement unsupported imports as fake success screens.

If a source cannot be processed, show a specific explanation and a useful alternative.

### Import workflow

1. User chooses a source.
2. App uploads or reads the source safely.
3. App extracts usable text.
4. App displays the extracted material.
5. User selects card count and generation preferences.
6. AI or an explicitly identified non-AI fallback generates draft flashcards.
7. User previews the results.
8. User can edit, delete, or regenerate individual cards.
9. User confirms the import.
10. App saves the cards to a selected deck.

Avoid automatically saving inaccurate AI-generated material.

### AI generation options

Allow the user to select:

- Basic.
- Balanced.
- Detailed.
- Definitions.
- Concepts.
- Important facts.
- Vocabulary.
- Exam-style questions.
- Mixed question types.

Support configurable question counts.

Where appropriate, recommend a number based on the amount of meaningful source content.

### Educational accuracy

AI generation must:

- Prefer information directly supported by source material.
- Avoid inventing dates, names, equations, or factual claims.
- Preserve important terminology.
- Generate clear questions.
- Avoid excessively vague questions.
- Avoid duplicate questions.
- Produce concise correct answers.
- Include explanations when useful.
- Attach source excerpts or page references when available.
- Flag ambiguous or unsupported content.

Use structured output and validate it against a strict schema before inserting cards.

---

## 10. AI Tutor

Build a contextual AI learning assistant.

The tutor should help the student understand information, not merely provide answers.

### AI Tutor capabilities

Provide:

- Explain a concept.
- Simplify an explanation.
- Give an example.
- Ask me questions.
- Create a short lesson.
- Create practice problems.
- Summarize my notes.
- Explain why my answer is wrong.
- Identify what I should study next.
- Generate additional flashcards.
- Create a mini examination.

### Tutor context

Allow the user to choose:

- General topic.
- Specific subject.
- Specific deck.
- Selected flashcards.
- Imported document.

When working from provided educational materials, the tutor should distinguish between information from those materials and additional general knowledge.

### Tutor response quality

The tutor should:

- Use understandable language.
- Explain concepts step by step.
- Adapt explanations to a senior high school student.
- Offer advanced explanations on request.
- Support English and Filipino.
- Use mathematical notation where appropriate.
- Ask short knowledge-check questions.
- Avoid presenting speculation as fact.
- Admit uncertainty.
- Never fabricate document citations.

### AI integration

Investigate whether ChatGPT Sites supplies an appropriate supported AI integration.

If not, implement an optional provider abstraction with a secured server-side API.

Requirements:

- Never expose API keys in browser code.
- Never require a paid AI provider for basic studying.
- Do not assume a ChatGPT subscription automatically provides API access.
- Support configurable model/provider settings where feasible.
- Implement request limits and sensible token budgets.
- Validate model outputs.
- Handle service failures gracefully.
- Display actual errors rather than fake generated results.
- Provide an estimate of API cost when supported.
- Avoid repeated unnecessary calls.
- Cache reusable AI outputs where appropriate.

All non-AI studying features must work without an AI key.

If advanced generation requires a paid service, clearly label that requirement.

---

## 11. Gamification system

Build a motivating, original progression system.

### XP

Award configurable XP for meaningful completed actions.

Suggested defaults:

- Correct answer: +10 XP.
- Difficult correct answer: +15 XP.
- Completed study session: +20 XP.
- Completed daily study target: +30 XP.
- Exam practice completion: +40 XP.

Ensure XP is awarded exactly once per eligible action.

Do not allow refreshing the page to duplicate rewards.

### Levels

Create a progression system in Rust.

Use a documented, gradually increasing XP requirement per level.

Show:

- Current level.
- Total XP.
- XP to next level.
- Animated progress bar.
- Level-up animation.

### Streaks

Track daily studying activity.

Requirements:

- Use Asia/Manila calendar days.
- Do not increment twice on the same day.
- Correctly handle day changes.
- Show current streak.
- Show longest streak.
- Show study calendar.
- Handle missed days predictably.

### Achievements

Examples:

- First Flashcard.
- First 100 Correct Answers.
- Seven-Day Scholar.
- One Thousand XP.
- Mathematics Master.
- Perfect Practice Test.
- Consistent Learner.
- One Hundred Cards Mastered.

Each achievement must have deterministic unlock conditions.

### Motivation safeguards

Avoid manipulative pressure.

Allow:
- Disabling XP animations.
- Hiding streaks.
- Reducing visual distractions.
- Taking breaks.
- Studying without a timer.

---

## 12. Exam preparation system

Build a dedicated exam preparation center.

### Exam creation

Allow the user to create examinations with:

- Exam name.
- Subject.
- Date.
- Topics.
- Related decks.
- Priority.
- Estimated coverage.
- Optional notes.

### Exam dashboard

Display:

- Days remaining.
- Readiness estimate.
- Total associated cards.
- Mastered cards.
- Weak topics.
- Available study sessions.
- Suggested study priorities.

Readiness must be labeled as an estimate, not a guarantee of an examination result.

### Exam countdown

Provide an attractive exam countdown widget.

### Smart study planner

Create a study plan using:

- Examination date.
- Number of remaining cards.
- Due review workload.
- Historical performance.
- Weak subjects.
- Available study time.
- User-defined study goals.

Balance new learning and reviews.

Allow the user to modify the suggested plan manually.

### College Entrance Test mode

Add a flexible CET review category.

Support:

- Mathematics.
- English.
- Science.
- Reading Comprehension.
- Filipino.
- Abstract Reasoning.
- General Information.

Do not invent a university's actual examination coverage. Let the user enter or import the official coverage.

---

## 13. Statistics and analytics

Build an informative analytics page.

### Core statistics

Track:

- Total cards created.
- Total cards reviewed.
- Correct answers.
- Incorrect answers.
- Overall accuracy.
- Accuracy per subject.
- Review history.
- Time spent studying.
- Cards mastered.
- Cards due.
- XP earned.
- Streak history.
- Exam practice results.

### Visualizations

Include:

- Daily activity calendar.
- Weekly study-time chart.
- Monthly XP chart.
- Accuracy trend.
- Subject mastery breakdown.
- Review workload forecast.
- Recent exam performance.

Use the actual database.

Graphs must correctly handle empty datasets and avoid misleading percentages.

### Study recommendations

Show actionable recommendations such as:

"Review 12 overdue Filipino cards."

"Your accuracy in Algebra is lower than your other topics."

"Your examination is approaching. Prioritize your weakest concepts."

Only generate recommendations supported by actual stored data.

---

## 14. Settings and personalization

Create a fully working settings page.

### General

- Display name.
- Theme.
- Language.
- Time zone.
- Reduced motion.
- Sound preferences.
- Notification preferences.

### Studying

- Daily card target.
- Daily XP target.
- New card limit.
- Session defaults.
- Spaced repetition preferences.
- Preferred question formats.
- Keyboard shortcuts.

### AI

- AI feature enable/disable.
- Provider selection when available.
- Model configuration.
- Usage safeguards.
- Cost limits when supported.

### Data

- Export all decks.
- Import backed-up decks.
- Export study history.
- Download a complete personal data backup.
- Delete selected decks.
- Delete all study data with explicit confirmation.

### Privacy

Keep the app private by default.

No advertising, subscriptions, leaderboards, or third-party analytics are necessary.

---

## 15. Data model and persistence

Design a normalized relational database.

At minimum, include entities for:

- users
- user_settings
- subjects
- folders
- decks
- deck_tags
- cards
- card_options
- card_media
- card_sources
- study_sessions
- session_answers
- review_states
- review_history
- exams
- exam_decks
- study_goals
- daily_activity
- xp_events
- achievement_definitions
- achievement_unlocks
- imported_sources
- ai_generation_jobs, if necessary

Use stable unique identifiers.

Persist all important timestamps in UTC and convert to Asia/Manila for user-facing daily logic.

Use constraints, indexes, and migrations.

Make review-record insertion and scheduling updates atomic wherever possible.

Implement data integrity protections and database transactions for multi-step updates.

### Persistence requirements

The following must survive a refresh or returning on another day:

- Subjects.
- Decks.
- Cards.
- Images.
- Study history.
- Review schedules.
- XP.
- Levels.
- Achievements.
- Streaks.
- Exams.
- User settings.

Do not use localStorage as the sole source of truth for important records.

### Data backups

Implement export to a documented JSON format.

Include enough metadata to restore review scheduling and learning history.

Provide a basic restore workflow.

Use a format that can be migrated to future versions.

Do not claim backups include binary attachments unless they actually do.

---

## 16. API and application structure

Separate the system into clear modules.

Suggested project structure:

- `apps/web` — Website interface.
- `crates/study_core` — Rust domain models.
- `crates/scheduler` — Rust spaced repetition.
- `crates/quiz_engine` — Rust quiz logic.
- `crates/progress` — Rust statistics and XP.
- `crates/content` — Rust content utilities.
- `packages/shared` — Shared schemas and types.
- `server` — Sites-compatible server adapters.
- `database` — Schemas and migrations.
- `tests` — Integration and end-to-end tests.
- `docs` — Architecture and deployment documentation.

Adapt this structure if the hosting environment requires a different layout.

### Suggested API actions

Build routes or equivalent server operations for:

- Listing subjects.
- Creating and updating decks.
- Listing cards.
- Creating and updating cards.
- Deleting cards.
- Fetching due cards.
- Starting a study session.
- Submitting an answer.
- Updating review state.
- Completing sessions.
- Fetching study statistics.
- Importing materials.
- Generating flashcards.
- Communicating with the AI Tutor.
- Creating exams.
- Recording practice test results.
- Exporting personal data.

Validate every server input.

Never trust browser-submitted XP, review history, or ownership identifiers without server-side checks.

Use explicit error responses and meaningful feedback.

---

## 17. Privacy and security

Because this is a personal learning application, privacy is essential.

### Access

Configure ChatGPT Sites so that the application is private to the owner by default.

Use supported platform authentication or another properly implemented authentication approach.

Avoid unnecessary custom password systems.

Do not treat a hidden link as sufficient authentication.

Every server-side data operation must respect authenticated ownership.

### Security protections

Implement:

- Input validation.
- File size limits.
- File type validation.
- Safe document processing.
- Protection against cross-site scripting.
- Safe rich-text rendering.
- Parameterized database queries.
- Secret management.
- Appropriate authorization checks.
- Controlled external API access.
- Rate limits for expensive endpoints.
- Secure error handling.
- Protection against accidental destructive actions.

Treat imported documents and website content as untrusted data, not instructions to the AI or application.

### Operational security

Never embed API credentials in frontend code.

Never commit secrets.

Never log sensitive document contents unnecessarily.

Do not transmit private study files to an AI provider without making that behavior clear to the user.

---

## 18. Performance and offline functionality

Target a fast and responsive user experience.

### Performance goals

- Fast navigation.
- Minimal unnecessary re-renders.
- Lazy loading for heavy modules.
- Efficient deck searches.
- Efficient review queues.
- Optimized asset sizes.
- Optimized WebAssembly bundles.
- Smooth study transitions.
- Good performance on midrange smartphones.

Use virtualization when rendering very large card lists.

### Progressive Web App

If compatible with ChatGPT Sites, implement an installable PWA.

Desired functionality:

- Add to home screen.
- Mobile-friendly app icons.
- Standalone app appearance.
- Cached application shell.
- Offline reading of previously cached cards.
- Offline study sessions where practical.
- Safe synchronization when connectivity returns.

Do not claim offline synchronization is functional without actually testing conflict handling and data integrity.

If a PWA feature is unsupported, document the limitation rather than creating broken behavior.

---

## 19. Accessibility requirements

Aim for WCAG 2.2 AA-compatible interactions where practical.

Implement:

- Semantic controls.
- Clear input labels.
- Keyboard navigation.
- Visible focus states.
- Appropriate color contrast.
- Screen-reader-friendly quiz feedback.
- Accessible dialogs.
- Reduced motion support.
- Touch targets large enough for mobile.
- Clear form errors.
- No color-only indicators of correctness.

Test both dark and light themes.

---

## 20. Rust engineering standards

Rust must be used meaningfully, not added merely to satisfy a language requirement.

### Core Rust modules

Implement as pure, testable Rust code wherever practical:

- Review scheduler.
- Quiz evaluation.
- Study session transitions.
- XP calculations.
- Streak calculations.
- Mastery aggregation.
- Study-priority ranking.
- Content validation.

Prefer stable Rust and actively maintained dependencies.

Use `serde` for serialization where appropriate.

Use `wasm-bindgen` or an equivalent compatible interface when compiling to WebAssembly.

Avoid unnecessary complex dependencies.

Document the boundary between Rust and TypeScript.

### Testing

Provide Rust unit tests for:

- Correct answer handling.
- Incorrect answer handling.
- Review interval progression.
- Lapse behavior.
- Due-date calculations.
- Study-session transitions.
- XP calculation.
- Streak calculation.
- Midnight boundaries.
- Duplicate XP prevention.
- Edge cases and invalid data.

Run formatting, linting, and compilation checks when available.

Avoid unsafe Rust unless clearly justified.

---

## 21. UI details and interaction polish

This application should look and feel like a finished commercial-quality educational product.

### Components

Build reusable components including:

- Navigation sidebar.
- Mobile bottom navigation.
- Deck cards.
- Subject cards.
- Flashcard viewer.
- Quiz answer buttons.
- Multiple-selection controls.
- Study progress bar.
- XP progress bar.
- Streak indicator.
- Calendar heatmap.
- Search input.
- Filter controls.
- Modal dialogs.
- Toast notifications.
- Loading skeletons.
- Empty states.
- Error states.
- Confirmation dialogs.

### Interaction expectations

Add subtle animations for:

- Flipping flashcards.
- Selecting an answer.
- Revealing correctness.
- Advancing to the next question.
- Earning XP.
- Leveling up.
- Finishing a session.
- Opening and closing dialogs.

Animations should be brief and responsive.

Never delay studying unnecessarily with prolonged animations.

### Mobile experience

Optimize the main study interface for one-handed use.

Important controls should remain accessible near the lower part of the screen when appropriate.

The interface must accommodate mobile safe areas and software keyboards.

Make the primary study experience excellent in iPhone Safari.

---

## 22. Initial content and onboarding

Create a useful first-run experience.

### Onboarding

Guide the user through:

1. Welcome to RecallForge.
2. Choose subjects.
3. Create or import a deck.
4. Set a daily study goal.
5. Begin the first study session.

Include clear options to skip onboarding.

### Starter content

Provide optional sample decks with real educational content:

- Filipino vocabulary.
- English vocabulary.
- Basic mathematics.
- General science.
- Philippine history.
- Reading comprehension.

Label all sample content clearly.

The user must be able to remove sample decks.

Do not populate real study statistics with fabricated activity.

---

## 23. Reliability and error handling

The app must handle:

- Slow internet.
- Failed uploads.
- Invalid documents.
- Empty decks.
- Interrupted sessions.
- Duplicate submissions.
- Browser refreshes.
- Database errors.
- Unavailable AI providers.
- Incorrect AI output formats.
- Large imported files.
- Unsupported file types.
- Expired sessions.
- Unexpected server responses.

Provide specific, friendly errors and recovery actions.

Never display success when persistence has failed.

Prevent duplicate cards or submissions caused by retries.

Use idempotency where necessary.

---

## 24. Testing and validation

Do not stop after writing code.

Build and test the application.

### Functional tests

Verify:

- Subjects can be created.
- Decks can be created.
- Cards can be added and edited.
- Cards persist after refresh.
- Quiz answers are correctly evaluated.
- Review schedules change appropriately.
- Study sessions can be resumed.
- XP remains correct.
- Streaks use the proper time zone.
- Exam tests can be completed.
- Statistics reflect actual activity.
- Imports produce reviewable cards.
- Data exports can be restored.

### Integration tests

Verify connections between:

- Frontend and server.
- Server and database.
- Rust/WASM and frontend.
- Quiz engine and scheduling engine.
- AI generation and card editor.
- Session completion and statistics.
- Authentication and data ownership.

### Browser tests

Test desktop and mobile layouts.

Use a compatible end-to-end testing framework if supported.

Check:

- Navigation.
- Forms.
- Study flows.
- Dialogs.
- Import workflows.
- Responsive layouts.
- Keyboard interaction.
- Dark mode.
- Refresh persistence.

### Acceptance scenario

Use the following complete scenario as a final functional test:

1. Open RecallForge.
2. Create a subject named Filipino.
3. Create a deck named Vocabulary.
4. Add five question-and-answer cards.
5. Add two fill-in-the-blank cards.
6. Start a study session.
7. Answer several questions correctly.
8. Answer one question incorrectly.
9. Finish the session.
10. Verify that XP and statistics updated.
11. Verify that the incorrect card received an appropriate review schedule.
12. Refresh the application.
13. Confirm all records remain present.
14. Start another review session.
15. Export the study deck.
16. Verify the exported data is valid.
17. Restore the export into a clean test environment.
18. Verify data integrity.

Also validate at least one actual document import and an AI generation flow if those features are available.

---

## 25. Implementation strategy

Work in well-defined phases.

### Phase 1 — Technical feasibility

Inspect ChatGPT Sites compatibility.

Establish the Rust-first architecture.

Verify compilation and hosting support.

Create a minimal persistent-data proof of concept.

### Phase 2 — Functional foundation

Implement:

- App navigation.
- Database.
- Subject management.
- Deck management.
- Card management.
- Settings.
- Private access.

### Phase 3 — Main study system

Implement:

- Rust study engine.
- Quiz interactions.
- Answer evaluation.
- Review scheduling.
- Persistent sessions.
- Session results.

### Phase 4 — Gamification and analytics

Implement:

- XP.
- Levels.
- Streaks.
- Achievements.
- Dashboard statistics.
- Analytics.

### Phase 5 — Smart Import

Implement file processing and the flashcard generation workflow.

Begin with reliable text-based imports and progress to more complex formats.

### Phase 6 — AI Tutor

Implement the provider abstraction, contextual learning assistant, and AI-generated quizzes.

### Phase 7 — Examination tools

Implement practice examinations and exam planning.

### Phase 8 — Polish

Implement:

- Responsive improvements.
- Accessibility.
- Animations.
- Error states.
- PWA functionality if feasible.
- Performance optimization.

### Phase 9 — Verification and deployment

Run available tests.

Resolve build failures.

Inspect the application in preview.

Prepare its ChatGPT Sites deployment.

---

## 26. Non-negotiable engineering rules

Follow these requirements strictly.

1. Build a working application, not a concept.
2. Use Rust for actual executable core functionality.
3. Prioritize compatibility with ChatGPT Sites.
4. Do not use unsupported native server assumptions.
5. Never silently replace required functionality with mock data.
6. All primary navigation destinations must work.
7. All persistent data must actually persist.
8. Use actual review scheduling rather than random intervals.
9. Use actual answer evaluation rather than randomly marking answers correct.
10. Ensure AI calls run securely.
11. Avoid generating fake AI answers when the provider is unavailable.
12. Never expose API keys.
13. Keep the app private by default.
14. Do not implement advertising or monetization.
15. Use original branding and assets.
16. Avoid unnecessarily complicated dependencies.
17. Provide meaningful loading and error states.
18. Test the complete study workflow.
19. Do not describe an incomplete feature as complete.
20. Do not deploy publicly without explicit authorization.

If full implementation is too large for a single working session, preserve a clear plan and prioritize a fully functional vertical slice rather than scattering incomplete features throughout the interface.

Continue implementing according to the phases as execution resources permit.

Do not replace essential features with decorative placeholders merely to claim that the app is finished.

---

## 27. Required deliverables

Deliver:

**A. Complete source code**

Include the full application structure and configuration.

**B. Rust source**

Include real implemented and tested Rust study logic.

**C. Working web interface**

Provide functional desktop and mobile layouts.

**D. Persistent database**

Include schema, migrations, and correct storage integration.

**E. Documentation**

Include:
- README.
- Architecture overview.
- Technology stack explanation.
- Local development instructions.
- Environment variables.
- Deployment instructions.
- Data backup procedures.
- Known limitations.

**F. Test suite**

Include automated tests for critical behavior.

**G. Feature verification report**

Provide a clear distinction among:
- Implemented and verified.
- Implemented but not fully verified.
- Partially implemented.
- Not implemented.

**H. Deployment preparation**

Check compatibility with ChatGPT Sites, resolve supported build issues, and prepare a private preview.

Do not change sharing permissions or publish the final version without my approval.

---

## 28. Final quality standard

I want RecallForge to be something I genuinely prefer using for daily studying.

It should be:

- Fast enough for frequent study sessions.
- Attractive enough to feel professionally designed.
- Reliable enough to trust with my flashcards.
- Intelligent enough to simplify preparing study materials.
- Accurate enough to support examination preparation.
- Enjoyable enough to encourage consistent learning.
- Accessible from both my computer and iPhone.
- Maintainable enough to extend with future features.

Do not sacrifice reliability or actual study functionality for visual polish.

A smaller set of fully working features is better than a massive collection of broken buttons.

However, use the complete specification as the long-term product target.

## 29. Begin execution

Start by doing the following:

1. Inspect the available project environment and ChatGPT Sites capabilities.
2. Explain the architecture choice concisely.
3. Identify any Rust runtime or WebAssembly constraints.
4. Establish the project structure.
5. Implement the persistent database foundation.
6. Build the first fully functional study workflow.
7. Test it.
8. Continue through the implementation phases.
9. Save a working private preview for review.
10. Report actual test results and unresolved limitations.

**Begin building RecallForge now. Do not stop after producing a plan or describing what the application would look like.**