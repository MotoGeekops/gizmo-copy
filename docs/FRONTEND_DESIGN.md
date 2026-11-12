# RecallForge interface direction

RecallForge should feel like somewhere to study, with one obvious next action.
The user found the dashboard overwhelming. This revision reduces decisions on
arrival and reserves management and statistics for intentional navigation.

## Plan

Keep the established palette and self-hosted fonts: paper #F5F7FA, white #FFFFFF,
slate #213247, navy #29465B, teal #22776D, and blue #406D91. Teal identifies the
study action. Saved subject colors remain small organizational marks. Bricolage
Grotesque carries the short heading; DM Sans carries questions and controls.

Use a single left-aligned column, generous space, and a plain list of recent decks.
The opening view contains a short invitation and one primary button. Saved
sessions replace Start studying with Continue studying. Automatic sessions use
the existing recall mode, due/new selection, daily session size, and scheduler.

    RecallForge                         Study   Library   More

                  Let's study.
                  One short sentence.
                  [ Start studying ]

                  Your decks             Add material
                  deck title                      Study
                  deck title                      Study

Remove the permanent sidebar, duplicate dashboard destination, search bar,
streak, XP, goals, charts, exam prompts, sample shelf, preview card, and private
workspace footer from the entry point. Library keeps deck organization and
search. More contains study options, exams, statistics, achievements, tutor, and
settings. Preserve old dashboard links as an alias for the study home.

During a session, omit the global header. Keep pause, progress, the current
question, and answer controls. At completion, show the saved result and one
way home; detailed metrics and answer review are a closed disclosure.

## Review against the request

The previous index-card stage still asked the user to interpret too many regions.
A simpler layout serves this request better than adding decoration. The visual
identity now comes from the material itself and restrained deck spines. No
additional gamification, coaching panels, or motivational sections are added.

The installed frontend-design and ui-ux-pro-max skills were read. The generated
minimalism guidance fits; its marketing page pattern does not and is excluded.
The disclosure database query did not produce a verified match. Disclosure and
navigation decisions follow the skill's bundled quick-reference rules for
progressive-disclosure, nav-hierarchy, and overflow-menu. Existing palette and
typography are retained rather than adopting unrelated generated defaults.

This changes navigation and presentation. Rust evaluation, scheduling,
ownership, sessions, XP accounting, imports, backups, and recovery keep their
existing behavior. Desktop, mobile, keyboard, empty states, saved-session resume,
one-click start, and completion require browser verification before delivery.
