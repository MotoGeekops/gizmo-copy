# RecallForge interface direction

The user rejected the initial interface as generic and requested Anthropic's frontend-design skill. The installed skill was read from `C:/Users/gamin/.agents/skills/frontend-design/SKILL.md`.

## Design plan

RecallForge is a daily study desk for a senior high school student. A usable index card is its central visual object. The interface should make reviewing, organizing a deck, and seeing the next useful action feel immediate.

Palette: paper `#F5F7FA`, navy `#29465B`, teal `#22776D`, blue `#406D91`, coral `#A4513E`, and amber `#91601B`. White cards and slate text provide the neutral base. Navy anchors navigation and general actions; teal identifies study and success; blue marks learning; coral marks due work and exams; amber identifies targets, XP, and achievements. Each accent has a quiet surface tint and a separately tuned dark-theme value. User-selected subject colors remain meaningful organizational marks.

Type: Bricolage Grotesque for page titles and the product wordmark; DM Sans for controls, prose, and numbers. Titles are expressive, while the working interface uses readable 13–16 px text. Both fonts are hosted locally.

Layout: left-aligned navigation and content. One real card anchors the study overview. Decks form a working list; the smaller side column holds the daily target, actual activity, and exam information. Sections have different visual treatments according to their role.

```text
navigation | page title                  create / import
           | review summary     | interactive index card
           | actual learning totals
           | recent deck rows   | daily target
           |                    | study activity
           | optional starters  | next exam
```

On mobile, the same hierarchy becomes a single column with bottom navigation and touch-sized study controls.

Principles: use the flashcard itself as product identity; give color a consistent role; make every label informational; show honest activity and empty states; keep study input and review feedback central; animate only in response to actions.

## Review against the brief

The earlier gradient hero, decorative card illustration, tiny pale text, repeated motivational copy, and uniform panel grid weakened the everyday study task. The revised plan uses the actual recall interaction as its distinctive element. Display and body type have different jobs, subject tabs express organization, and the overview varies density by information priority. The layout keeps the existing eight navigation destinations and their working behavior.

This redesign changes presentation and copy. Rust evaluation, scheduling, database ownership, sessions, XP, imports, and backup logic remain the existing verified implementation.

## Palette refinement

The user asked for a clean palette with more than one color. The earlier violet treatment covered most surfaces and secondary details, leaving the other palette colors almost invisible. The revised palette keeps the existing layout and typography. The index-card stack uses mint and peach backing sheets, the daily target has an amber surface, and the four learning totals use labeled accents. Navigation and form borders return to cool neutrals. Charts, study modes, and earned achievements use the same color roles throughout. Saved subject and deck colors are preserved; the picker and new starter decks offer coordinated choices.
