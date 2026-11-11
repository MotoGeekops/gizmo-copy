import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  created: integer("created").notNull(),
});
const owner = () =>
  text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });
export const settings = sqliteTable("user_settings", {
  userId: owner().primaryKey(),
  data: text("data").notNull(),
  version: integer("version").notNull().default(0),
});
export const subjects = sqliteTable(
  "subjects",
  {
    id: text("id").primaryKey(),
    userId: owner(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    created: integer("created").notNull(),
  },
  (t) => [index("subjects_owner").on(t.userId)],
);
export const folders = sqliteTable("folders", {
  id: text("id").primaryKey(),
  userId: owner(),
  subjectId: text("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});
export const decks = sqliteTable(
  "decks",
  {
    id: text("id").primaryKey(),
    userId: owner(),
    subjectId: text("subject_id")
      .notNull()
      .references(() => subjects.id),
    folderId: text("folder_id").references(() => folders.id),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    color: text("color").notNull(),
    favorite: integer("favorite").notNull().default(0),
    archived: integer("archived").notNull().default(0),
    deleted: integer("deleted").notNull().default(0),
    sample: integer("sample").notNull().default(0),
    created: integer("created").notNull(),
    updated: integer("updated").notNull(),
    lastStudied: integer("last_studied"),
  },
  (t) => [index("decks_owner").on(t.userId, t.deleted, t.archived)],
);
export const tags = sqliteTable("deck_tags", {
  id: text("id").primaryKey(),
  deckId: text("deck_id")
    .notNull()
    .references(() => decks.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
});
export const cards = sqliteTable(
  "cards",
  {
    id: text("id").primaryKey(),
    userId: owner(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id),
    type: text("type").notNull(),
    front: text("front").notNull(),
    answer: text("answer").notNull(),
    alternatives: text("alternatives").notNull().default("[]"),
    hint: text("hint").notNull().default(""),
    explanation: text("explanation").notNull().default(""),
    difficulty: text("difficulty").notNull().default("normal"),
    tags: text("tags").notNull().default("[]"),
    ignorePunctuation: integer("ignore_punctuation").notNull().default(1),
    deleted: integer("deleted").notNull().default(0),
    created: integer("created").notNull(),
    updated: integer("updated").notNull(),
  },
  (t) => [
    index("cards_deck").on(t.deckId, t.deleted),
    index("cards_owner").on(t.userId),
  ],
);
export const options = sqliteTable("card_options", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  position: integer("position").notNull(),
});
export const sources = sqliteTable("card_sources", {
  id: text("id").primaryKey(),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "cascade" }),
  reference: text("reference").notNull(),
  excerpt: text("excerpt").notNull().default(""),
});
export const media = sqliteTable("card_media", {
  id: text("id").primaryKey(),
  userId: owner(),
  cardId: text("card_id").references(() => cards.id, { onDelete: "set null" }),
  objectKey: text("object_key").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  alt: text("alt").notNull().default(""),
  created: integer("created").notNull(),
});
export const reviews = sqliteTable(
  "review_states",
  {
    cardId: text("card_id")
      .primaryKey()
      .references(() => cards.id, { onDelete: "cascade" }),
    userId: owner(),
    state: text("state").notNull().default("new"),
    interval: real("interval").notNull().default(0),
    ease: real("ease").notNull().default(2.5),
    reviews: integer("reviews").notNull().default(0),
    successes: integer("successes").notNull().default(0),
    failures: integer("failures").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    due: integer("due").notNull().default(0),
    lastReview: integer("last_review").notNull().default(0),
    version: integer("version").notNull().default(0),
  },
  (t) => [index("reviews_due").on(t.userId, t.due)],
);
export const sessions = sqliteTable(
  "study_sessions",
  {
    id: text("id").primaryKey(),
    userId: owner(),
    mode: text("mode").notNull(),
    selection: text("selection").notNull(),
    queue: text("queue").notNull(),
    cursor: integer("cursor").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    started: integer("started").notNull(),
    ended: integer("ended"),
    timeLimit: integer("time_limit").notNull().default(0),
    duration: integer("duration").notNull().default(0),
  },
  (t) => [index("sessions_owner").on(t.userId, t.ended)],
);
export const answers = sqliteTable(
  "session_answers",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    userId: owner(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id),
    position: integer("position").notNull(),
    response: text("response").notNull(),
    correct: integer("correct").notNull(),
    rating: integer("rating").notNull(),
    manual: integer("manual").notNull().default(0),
    result: text("result").notNull(),
    created: integer("created").notNull(),
  },
  (t) => [uniqueIndex("answer_once").on(t.sessionId, t.position)],
);
export const history = sqliteTable("review_history", {
  id: text("id").primaryKey(),
  userId: owner(),
  cardId: text("card_id")
    .notNull()
    .references(() => cards.id),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  rating: integer("rating").notNull(),
  before: text("before").notNull(),
  after: text("after").notNull(),
  created: integer("created").notNull(),
});
export const xpEvents = sqliteTable(
  "xp_events",
  {
    id: text("id").primaryKey(),
    userId: owner(),
    eventKey: text("event_key").notNull(),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    created: integer("created").notNull(),
  },
  (t) => [uniqueIndex("xp_once").on(t.userId, t.eventKey)],
);
export const activity = sqliteTable(
  "daily_activity",
  {
    id: text("id").primaryKey(),
    userId: owner(),
    day: integer("day").notNull(),
    answers: integer("answers").notNull().default(0),
    correct: integer("correct").notNull().default(0),
    seconds: integer("seconds").notNull().default(0),
  },
  (t) => [uniqueIndex("activity_day").on(t.userId, t.day)],
);
export const exams = sqliteTable("exams", {
  id: text("id").primaryKey(),
  userId: owner(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  topics: text("topics").notNull().default(""),
  notes: text("notes").notNull().default(""),
  priority: text("priority").notNull().default("normal"),
  created: integer("created").notNull(),
});
export const examDecks = sqliteTable("exam_decks", {
  id: text("id").primaryKey(),
  examId: text("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  deckId: text("deck_id")
    .notNull()
    .references(() => decks.id),
});
export const goals = sqliteTable("study_goals", {
  id: text("id").primaryKey(),
  userId: owner(),
  examId: text("exam_id").references(() => exams.id, { onDelete: "cascade" }),
  day: text("day").notNull(),
  target: integer("target").notNull(),
  done: integer("done").notNull().default(0),
});
export const achievements = sqliteTable(
  "achievement_unlocks",
  {
    id: text("id").primaryKey(),
    userId: owner(),
    key: text("key").notNull(),
    created: integer("created").notNull(),
  },
  (t) => [uniqueIndex("achievement_once").on(t.userId, t.key)],
);
export const imports = sqliteTable("imported_sources", {
  id: text("id").primaryKey(),
  userId: owner(),
  name: text("name").notNull(),
  format: text("format").notNull(),
  excerpt: text("excerpt").notNull(),
  created: integer("created").notNull(),
});
export const aiUsage = sqliteTable("ai_generation_jobs", {
  id: text("id").primaryKey(),
  userId: owner(),
  kind: text("kind").notNull(),
  status: text("status").notNull(),
  tokens: integer("tokens").notNull().default(0),
  created: integer("created").notNull(),
});
