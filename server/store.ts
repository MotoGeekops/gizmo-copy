import { env } from "cloudflare:workers";
import { engine } from "./engine";
import { check, HttpError, cardSchema, settingsSchema } from "./validation";
import {
  defaults,
  dayIndex,
  type Card,
  type Review,
  type Session,
} from "../lib/types";
import { z } from "zod";
export function db() {
  check(env.DB, "The study database is not configured.", 503);
  return env.DB!;
}
export const stmt = (sql: string, ...args: any[]) =>
  db()
    .prepare(sql)
    .bind(...args);
export async function all(sql: string, ...args: any[]): Promise<any[]> {
  return (await stmt(sql, ...args).all()).results;
}
export async function one(sql: string, ...args: any[]): Promise<any> {
  return stmt(sql, ...args).first();
}
export const run = (sql: string, ...args: any[]) => stmt(sql, ...args).run();
export const uid = () => crypto.randomUUID();
export const parse = (s: string, fallback: any = []) => {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
};
export async function init(userId: string) {
  await db().batch([
    stmt(
      "INSERT OR IGNORE INTO users(id,created) VALUES (?,?)",
      userId,
      Date.now(),
    ),
    stmt(
      "INSERT OR IGNORE INTO user_settings(user_id,data) VALUES (?,?)",
      userId,
      JSON.stringify(defaults),
    ),
  ]);
}
export async function owned(
  table:
    "decks" | "cards" | "subjects" | "study_sessions" | "exams" | "folders",
  id: string,
  userId: string,
) {
  const row = await one(
    `SELECT * FROM ${table} WHERE id=? AND user_id=?`,
    id,
    userId,
  );
  check(row, "This item is unavailable or belongs to another account.", 404);
  return row;
}
export async function loadCards(userId: string): Promise<Card[]> {
  const [raw, options, sources, media, reviews] = await Promise.all([
    all(
      "SELECT c.* FROM cards c JOIN decks d ON d.id=c.deck_id WHERE c.user_id=? AND c.deleted=0 AND d.deleted=0",
      userId,
    ),
    all(
      "SELECT o.* FROM card_options o JOIN cards c ON c.id=o.card_id WHERE c.user_id=? ORDER BY o.position",
      userId,
    ),
    all(
      "SELECT s.* FROM card_sources s JOIN cards c ON c.id=s.card_id WHERE c.user_id=?",
      userId,
    ),
    all("SELECT id,card_id FROM card_media WHERE user_id=?", userId),
    all("SELECT * FROM review_states WHERE user_id=?", userId),
  ]);
  const rm = new Map(reviews.map((r) => [r.card_id, r]));
  return raw.map((c) => {
    const r = rm.get(c.id);
    const review = r ? reviewObject(r) : undefined;
    return {
      id: c.id,
      deckId: c.deck_id,
      type: c.type,
      front: c.front,
      answer: parse(c.answer),
      alternatives: parse(c.alternatives),
      hint: c.hint,
      explanation: c.explanation,
      difficulty: c.difficulty,
      tags: parse(c.tags),
      ignorePunctuation: !!c.ignore_punctuation,
      options: options.filter((o) => o.card_id === c.id).map((o) => o.text),
      source: sources.find((s) => s.card_id === c.id)?.reference || "",
      mediaId: media.find((m) => m.card_id === c.id)?.id,
      created: c.created,
      updated: c.updated,
      review,
      mastery: review ? engine({ action: "mastery", review }).mastery : 0,
    };
  });
}
export function reviewObject(r: any): Review {
  return {
    state: r.state,
    interval: r.interval,
    ease: r.ease,
    reviews: r.reviews,
    successes: r.successes,
    failures: r.failures,
    lapses: r.lapses,
    due: r.due,
    last_review: r.last_review,
    version: r.version,
  };
}
export async function bootstrap(user: {
  userId: string;
  name?: string;
  email?: string;
}) {
  const id = user.userId;
  await init(id);
  const [
    s,
    subjects,
    folders,
    decks,
    cards,
    tags,
    exams,
    links,
    activity,
    sessions,
    xp,
    unlocks,
    goals,
  ] = await Promise.all([
    one("SELECT * FROM user_settings WHERE user_id=?", id),
    all("SELECT * FROM subjects WHERE user_id=? ORDER BY created", id),
    all("SELECT * FROM folders WHERE user_id=?", id),
    all(
      "SELECT * FROM decks WHERE user_id=? AND deleted=0 ORDER BY updated DESC",
      id,
    ),
    loadCards(id),
    all(
      "SELECT t.* FROM deck_tags t JOIN decks d ON d.id=t.deck_id WHERE d.user_id=?",
      id,
    ),
    all("SELECT * FROM exams WHERE user_id=? ORDER BY date", id),
    all(
      "SELECT l.* FROM exam_decks l JOIN exams e ON e.id=l.exam_id WHERE e.user_id=?",
      id,
    ),
    all("SELECT * FROM daily_activity WHERE user_id=? ORDER BY day", id),
    all(
      "SELECT id,mode,cursor,correct,started,ended,time_limit,duration,json_array_length(queue) AS total FROM study_sessions WHERE user_id=? ORDER BY started DESC LIMIT 50",
      id,
    ),
    one(
      "SELECT COALESCE(SUM(amount),0) AS xp,COALESCE(SUM(CASE WHEN created>=? THEN amount ELSE 0 END),0) AS today_xp FROM xp_events WHERE user_id=?",
      dayIndex() * 86400000 - 28800000,
      id,
    ),
    all("SELECT * FROM achievement_unlocks WHERE user_id=?", id),
    all("SELECT * FROM study_goals WHERE user_id=?", id),
  ]);
  const settings = { ...defaults, ...parse(s.data, {}) };
  const now = Date.now(),
    today = dayIndex(now);
  const activeIds = new Set(decks.filter((d) => !d.archived).map((d) => d.id));
  const active = cards.filter((c) => activeIds.has(c.deckId));
  const correct = activity.reduce((a, r) => a + r.correct, 0),
    answerCount = activity.reduce((a, r) => a + r.answers, 0);
  const streak = engine({
    action: "streak",
    days: activity.filter((a) => a.answers > 0).map((a) => a.day),
    today,
  });
  const stats = {
    xp: xp.xp,
    todayXp: xp.today_xp,
    level: engine({ action: "level", xp: xp.xp }),
    streak,
    due: active.filter(
      (c) => c.review && c.review.state !== "new" && c.review.due <= now,
    ).length,
    mastered: active.filter((c) => c.mastery >= 80).length,
    learning: active.filter(
      (c) => c.review && c.review.reviews > 0 && c.mastery < 80,
    ).length,
    total: active.length,
    today: activity.find((a) => a.day === today)?.answers || 0,
    correct,
    answers: answerCount,
    accuracy: answerCount ? Math.round((correct / answerCount) * 100) : 0,
    minutes: Math.floor(activity.reduce((a, r) => a + r.seconds, 0) / 60),
  };
  const achievements = [
    ["first-card", cards.length > 0],
    ["first-session", sessions.some((s) => s.ended && s.cursor > 0)],
    ["hundred-correct", correct >= 100],
    ["seven-days", streak.longest >= 7],
    ["thousand-xp", xp.xp >= 1000],
    ["hundred-mastered", stats.mastered >= 100],
    [
      "perfect-test",
      sessions.some(
        (s) =>
          s.ended &&
          s.mode === "test" &&
          s.cursor >= 5 &&
          s.correct === s.cursor,
      ),
    ],
  ];
  const earned = achievements.filter(
    ([key, yes]) => yes && !unlocks.some((u) => u.key === key),
  );
  if (earned.length) {
    await db().batch(
      earned.map(([key]) =>
        stmt(
          "INSERT OR IGNORE INTO achievement_unlocks(id,user_id,key,created) VALUES (?,?,?,?)",
          uid(),
          id,
          key,
          now,
        ),
      ),
    );
    unlocks.push(...earned.map(([key]) => ({ key, created: now })));
  }
  return {
    user: { id, name: settings.displayName || user.name || "Scholar" },
    settings,
    settingsVersion: s.version,
    subjects,
    folders: folders.map((f) => ({
      id: f.id,
      subjectId: f.subject_id,
      name: f.name,
    })),
    decks: decks.map((d) => {
      const dc = cards.filter((c) => c.deckId === d.id);
      return {
        id: d.id,
        subjectId: d.subject_id,
        folderId: d.folder_id,
        title: d.title,
        description: d.description,
        color: d.color,
        favorite: !!d.favorite,
        archived: !!d.archived,
        sample: !!d.sample,
        created: d.created,
        lastStudied: d.last_studied,
        tags: tags.filter((t) => t.deck_id === d.id).map((t) => t.tag),
        count: dc.length,
        due: dc.filter(
          (c) => c.review && c.review.state !== "new" && c.review.due <= now,
        ).length,
        mastery: dc.length
          ? Math.round(dc.reduce((s, c) => s + c.mastery, 0) / dc.length)
          : 0,
      };
    }),
    cards,
    exams: exams.map((e) => ({
      ...e,
      deckIds: links.filter((l) => l.exam_id === e.id).map((l) => l.deck_id),
    })),
    activity,
    sessions: sessions.map((s) => ({ ...s, timeLimit: s.time_limit })),
    unlocks,
    stats,
    goals,
    ai: {
      available: !!(
        (env as any).OPENROUTER_API_KEY || (env as any).GEMINI_API_KEY
      ),
      provider: (env as any).GEMINI_API_KEY ? "Gemini" : "OpenRouter",
      model:
        (env as any).AI_MODEL ||
        ((env as any).GEMINI_API_KEY ? "gemini-2.5-flash" : "openrouter/auto"),
    },
    engine: "Rust · SM-2 inspired",
  };
}
export async function saveCard(userId: string, input: unknown) {
  const c = cardSchema.parse(input);
  const deck = await owned("decks", c.deckId, userId);
  check(!deck.deleted, "Restore this deck before editing.");
  check(
    engine({ action: "validate", card: c }).valid,
    "The card is incomplete.",
  );
  const id = c.id || uid(),
    existing = await one("SELECT * FROM cards WHERE id=?", id);
  check(
    !existing || existing.user_id === userId,
    "This card belongs to another account.",
    403,
  );
  if (c.mediaId) {
    const m = await one(
      "SELECT * FROM card_media WHERE id=? AND user_id=?",
      c.mediaId,
      userId,
    );
    check(m, "The selected image is unavailable.");
    check(
      !m.card_id || m.card_id === id,
      "This image is already attached to another card.",
    );
  }
  const now = Date.now();
  const items = [
    stmt(
      `INSERT INTO cards(id,user_id,deck_id,type,front,answer,alternatives,hint,explanation,difficulty,tags,ignore_punctuation,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET deck_id=excluded.deck_id,type=excluded.type,front=excluded.front,answer=excluded.answer,alternatives=excluded.alternatives,hint=excluded.hint,explanation=excluded.explanation,difficulty=excluded.difficulty,tags=excluded.tags,ignore_punctuation=excluded.ignore_punctuation,updated=excluded.updated`,
      id,
      userId,
      c.deckId,
      c.type,
      c.front,
      JSON.stringify(c.answer),
      JSON.stringify(c.alternatives),
      c.hint,
      c.explanation,
      c.difficulty,
      JSON.stringify(c.tags),
      +c.ignorePunctuation,
      now,
      now,
    ),
    stmt(
      "INSERT OR IGNORE INTO review_states(card_id,user_id) VALUES (?,?)",
      id,
      userId,
    ),
    stmt("DELETE FROM card_options WHERE card_id=?", id),
    stmt("DELETE FROM card_sources WHERE card_id=?", id),
    stmt(
      "UPDATE card_media SET card_id=NULL WHERE card_id=? AND user_id=?",
      id,
      userId,
    ),
  ];
  c.options.forEach((o, i) =>
    items.push(
      stmt(
        "INSERT INTO card_options(id,card_id,text,position) VALUES (?,?,?,?)",
        uid(),
        id,
        o,
        i,
      ),
    ),
  );
  if (c.source)
    items.push(
      stmt(
        "INSERT INTO card_sources(id,card_id,reference) VALUES (?,?,?)",
        uid(),
        id,
        c.source,
      ),
    );
  if (c.mediaId)
    items.push(
      stmt(
        "UPDATE card_media SET card_id=? WHERE id=? AND user_id=?",
        id,
        c.mediaId,
        userId,
      ),
    );
  items.push(stmt("UPDATE decks SET updated=? WHERE id=?", now, c.deckId));
  await db().batch(items);
  return { id };
}
function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [a[i], a[n]] = [a[n], a[i]];
  }
  return a;
}
export async function startSession(userId: string, input: unknown) {
  const p = z
    .object({
      id: z.string().min(1).max(100),
      mode: z.enum([
        "memorise",
        "classic",
        "test",
        "speed",
        "weakness",
        "custom",
        "cram",
      ]),
      deckIds: z.array(z.string().max(100)).max(100).default([]),
      filter: z.enum(["due", "new", "all", "weak"]).default("due"),
      count: z.number().int().min(1).max(200).default(20),
      timeLimit: z.number().int().min(0).max(10800).default(0),
      types: z.array(z.string()).max(8).default([]),
      difficulty: z.string().default("all"),
    })
    .parse(input);
  const existing = await one(
    "SELECT id,user_id FROM study_sessions WHERE id=?",
    p.id,
  );
  if (existing) {
    check(
      existing.user_id === userId,
      "Session belongs to another account.",
      403,
    );
    return getSession(userId, p.id);
  }
  const data = await bootstrap({ userId });
  const active = new Set(
    data.decks.filter((d) => !d.archived).map((d) => d.id),
  );
  check(
    p.deckIds.every((id) => active.has(id)),
    "Choose active decks from your library.",
  );
  let cards = data.cards.filter(
    (c) =>
      active.has(c.deckId) &&
      (!p.deckIds.length || p.deckIds.includes(c.deckId)) &&
      (!p.types.length || p.types.includes(c.type)) &&
      (p.difficulty === "all" || c.difficulty === p.difficulty),
  );
  const now = Date.now(),
    today = dayIndex(now);
  const newToday = await one(
    "SELECT COUNT(DISTINCT card_id) AS n FROM review_history WHERE user_id=? AND created>=? AND json_extract(before,'$.reviews')=0",
    userId,
    today * 86400000 - 28800000,
  );
  const reviewedToday = await one(
    "SELECT COUNT(*) AS n FROM review_history WHERE user_id=? AND created>=? AND json_extract(before,'$.reviews')>0",
    userId,
    today * 86400000 - 28800000,
  );
  if (p.filter === "due") {
    const due = cards
      .filter(
        (c) => c.review && c.review.state !== "new" && c.review.due <= now,
      )
      .sort((a, b) => a.review!.due - b.review!.due)
      .slice(0, Math.max(0, data.settings.reviewLimit - reviewedToday.n));
    const fresh = cards
      .filter((c) => !c.review || c.review.state === "new")
      .slice(0, Math.max(0, data.settings.newLimit - newToday.n));
    cards = [...due, ...fresh];
  } else if (p.filter === "new") {
    cards = cards
      .filter((c) => !c.review || c.review.state === "new")
      .slice(0, Math.max(0, data.settings.newLimit - newToday.n));
  } else if (p.filter === "weak" || p.mode === "weakness") {
    cards = cards
      .filter((c) => (c.review?.failures || 0) > 0)
      .sort(
        (a, b) =>
          b.review!.failures / b.review!.reviews -
          a.review!.failures / a.review!.reviews,
      );
  } else if (data.settings.randomize || p.mode === "test" || p.mode === "speed")
    cards = shuffle(cards);
  cards = cards.slice(0, p.count).map((c) => ({
    ...c,
    options: ["choice", "multi"].includes(c.type)
      ? shuffle(c.options)
      : c.options,
  }));
  check(
    cards.length,
    "No cards match this session. Add cards, choose All cards, or raise your daily limits.",
  );
  const limit = p.mode === "speed" ? p.timeLimit || 60 : p.timeLimit;
  await run(
    "INSERT INTO study_sessions(id,user_id,mode,selection,queue,started,time_limit) VALUES (?,?,?,?,?,?,?)",
    p.id,
    userId,
    p.mode,
    JSON.stringify(p),
    JSON.stringify(cards),
    now,
    limit,
  );
  return getSession(userId, p.id);
}
export async function getSession(userId: string, id: string): Promise<Session> {
  const s = await owned("study_sessions", id, userId);
  const queue: Card[] = parse(s.queue);
  return {
    id: s.id,
    mode: s.mode,
    cursor: s.cursor,
    correct: s.correct,
    started: s.started,
    ended: s.ended,
    timeLimit: s.time_limit,
    duration: s.duration,
    total: queue.length,
    card: s.ended ? null : queue[s.cursor] || null,
    browse: s.mode === "classic" ? queue : undefined,
    answers: s.ended
      ? (
          await all(
            "SELECT a.*,c.front,c.answer,c.explanation FROM session_answers a JOIN cards c ON c.id=a.card_id WHERE a.session_id=? AND a.user_id=? ORDER BY a.position",
            id,
            userId,
          )
        ).map((a) => ({
          ...a,
          result: parse(a.result, {}),
          response: parse(a.response),
        }))
      : undefined,
  };
}
export async function answerSession(userId: string, input: unknown) {
  const p = z
    .object({
      id: z.string().min(1).max(100),
      sessionId: z.string().min(1).max(100),
      position: z.number().int().min(0).max(600),
      response: z.array(z.string().max(10000)).max(40),
      rating: z.number().int().min(1).max(4).optional(),
      manual: z.boolean().default(false),
      seconds: z.number().int().min(0).max(600).default(0),
    })
    .parse(input);
  const duplicate = await one(
    "SELECT * FROM session_answers WHERE id=? AND user_id=?",
    p.id,
    userId,
  );
  if (duplicate) {
    check(
      duplicate.session_id === p.sessionId &&
        duplicate.position === p.position &&
        duplicate.response === JSON.stringify(p.response) &&
        !!duplicate.manual === p.manual,
      "Request identifier already used with a different answer.",
      409,
    );
    return {
      ...parse(duplicate.result, {}),
      session: await getSession(userId, p.sessionId),
    };
  }
  const s = await owned("study_sessions", p.sessionId, userId);
  check(!s.ended, "This session has finished.", 409);
  check(
    s.cursor === p.position,
    "The session changed in another tab. Resume it to continue.",
    409,
  );
  const now = Date.now();
  check(
    !s.time_limit || now <= s.started + s.time_limit * 1000 + 2000,
    "Time is up. Finish the session to see your results.",
    409,
  );
  const queue: Card[] = parse(s.queue),
    card = queue[s.cursor];
  check(card, "No question is pending.", 409);
  check(
    !p.manual ||
      ["classic", "memorise", "custom", "cram", "weakness"].includes(s.mode),
    "Self grading is unavailable in a timed test.",
  );
  check(!p.manual || p.rating, "Choose a self-assessment rating.");
  const correct = p.manual
    ? p.rating !== 1
    : engine({ action: "evaluate", card, response: p.response }).correct;
  const rating = correct ? p.rating || 3 : 1;
  const raw = await one(
    "SELECT * FROM review_states WHERE card_id=? AND user_id=?",
    card.id,
    userId,
  );
  check(raw, "This card no longer has a review schedule.", 409);
  const before = reviewObject(raw),
    after = engine<Review>({ action: "schedule", review: before, rating, now });
  const practice = ["test", "speed", "cram"].includes(s.mode);
  const transition = engine({
    action: "transition",
    cursor: s.cursor,
    length: queue.length,
    wrong: !correct,
    occurrences: queue.filter((c) => c.id === card.id).length,
    practice,
  });
  if (transition.append) queue.push(card);
  const day = dayIndex(now),
    xpKey = `correct:${day}:${card.id}`;
  const already = await one(
    "SELECT id FROM xp_events WHERE user_id=? AND event_key=?",
    userId,
    xpKey,
  );
  const xp = engine({
    action: "xp",
    correct,
    difficult: card.difficulty === "hard",
    alreadyAwarded: !!already,
  }).xp;
  const result = {
    correct,
    rating,
    xp,
    manual: p.manual,
    answer:
      card.type === "cloze"
        ? [...card.front.matchAll(/\[([^\]]+)\]/g)].map((x) => x[1])
        : card.answer,
    explanation: card.explanation,
    nextReview: after.due,
    interval: after.interval,
  };
  const guard = "EXISTS (SELECT 1 FROM session_answers WHERE id=?)";
  const items = [
    stmt(
      `INSERT INTO session_answers(id,session_id,user_id,card_id,position,response,correct,rating,manual,result,created) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM study_sessions WHERE id=? AND user_id=? AND cursor=? AND ended IS NULL) AND EXISTS(SELECT 1 FROM review_states WHERE card_id=? AND version=?)`,
      p.id,
      s.id,
      userId,
      card.id,
      s.cursor,
      JSON.stringify(p.response),
      +correct,
      rating,
      +p.manual,
      JSON.stringify(result),
      now,
      s.id,
      userId,
      s.cursor,
      card.id,
      raw.version,
    ),
    stmt(
      `UPDATE review_states SET state=?,interval=?,ease=?,reviews=?,successes=?,failures=?,lapses=?,due=?,last_review=?,version=version+1 WHERE card_id=? AND ${guard}`,
      after.state,
      after.interval,
      after.ease,
      after.reviews,
      after.successes,
      after.failures,
      after.lapses,
      after.due,
      after.last_review,
      card.id,
      p.id,
    ),
    stmt(
      `INSERT INTO review_history(id,user_id,card_id,session_id,rating,before,after,created) SELECT ?,?,?,?,?,?,?,? WHERE ${guard}`,
      p.id,
      userId,
      card.id,
      s.id,
      rating,
      JSON.stringify(before),
      JSON.stringify(after),
      now,
      p.id,
    ),
    stmt(
      `UPDATE study_sessions SET cursor=?,correct=correct+?,queue=?,duration=duration+? WHERE id=? AND ${guard}`,
      transition.cursor,
      +correct,
      JSON.stringify(queue),
      p.seconds,
      s.id,
      p.id,
    ),
    stmt(
      `UPDATE decks SET last_studied=? WHERE id=? AND user_id=? AND ${guard}`,
      now,
      card.deckId,
      userId,
      p.id,
    ),
    stmt(
      `INSERT INTO daily_activity(id,user_id,day,answers,correct,seconds) SELECT ?,?,?,1,?,? WHERE ${guard} ON CONFLICT(user_id,day) DO UPDATE SET answers=answers+1,correct=correct+excluded.correct,seconds=seconds+excluded.seconds`,
      uid(),
      userId,
      day,
      +correct,
      p.seconds,
      p.id,
    ),
  ];
  if (xp)
    items.push(
      stmt(
        `INSERT OR IGNORE INTO xp_events(id,user_id,event_key,amount,reason,created) SELECT ?,?,?,?,?,? WHERE ${guard}`,
        uid(),
        userId,
        xpKey,
        xp,
        "Correct recall",
        now,
        p.id,
      ),
    );
  items.push(
    stmt(
      `INSERT OR IGNORE INTO xp_events(id,user_id,event_key,amount,reason,created) SELECT ?,?,?,30,'Daily goal',? WHERE ${guard} AND (SELECT answers FROM daily_activity WHERE user_id=? AND day=?) >= CAST(json_extract((SELECT data FROM user_settings WHERE user_id=?),'$.dailyGoal') AS INTEGER)`,
      uid(),
      userId,
      `goal:${day}`,
      now,
      p.id,
      userId,
      day,
      userId,
    ),
  );
  try {
    await db().batch(items);
  } catch (e) {
    const saved = await one(
      "SELECT * FROM session_answers WHERE id=? AND user_id=?",
      p.id,
      userId,
    );
    if (!saved)
      throw new HttpError(
        409,
        "The session changed during submission. Resume and try again.",
      );
    return {
      ...parse(saved.result, {}),
      session: await getSession(userId, s.id),
    };
  }
  check(
    await one(
      "SELECT id FROM session_answers WHERE id=? AND user_id=?",
      p.id,
      userId,
    ),
    "A concurrent review changed this card. Please retry.",
    409,
  );
  return { ...result, session: await getSession(userId, s.id) };
}
export async function finishSession(userId: string, id: string) {
  const s = await owned("study_sessions", id, userId);
  if (s.ended) return getSession(userId, id);
  const now = Date.now();
  const items = [
    stmt(
      "UPDATE study_sessions SET ended=? WHERE id=? AND user_id=? AND ended IS NULL",
      now,
      id,
      userId,
    ),
  ];
  if (s.cursor > 0)
    items.push(
      stmt(
        "INSERT OR IGNORE INTO xp_events(id,user_id,event_key,amount,reason,created) VALUES (?,?,?,?,?,?)",
        uid(),
        userId,
        `session:${id}`,
        s.mode === "test" ? 40 : 20,
        "Completed session",
        now,
      ),
    );
  await db().batch(items);
  return getSession(userId, id);
}
export async function shuffleSession(userId: string, id: string) {
  const s = await owned("study_sessions", id, userId);
  check(!s.ended, "This session has finished.", 409);
  check(s.mode === "classic", "Shuffle is available in Classic flashcards.");
  const queue: Card[] = parse(s.queue),
    next = [...queue.slice(0, s.cursor), ...shuffle(queue.slice(s.cursor))];
  const result = await run(
    "UPDATE study_sessions SET queue=? WHERE id=? AND user_id=? AND cursor=? AND queue=? AND ended IS NULL",
    JSON.stringify(next),
    id,
    userId,
    s.cursor,
    s.queue,
  );
  check(
    result.meta.changes,
    "The session changed in another tab. Resume it before shuffling.",
    409,
  );
  return getSession(userId, id);
}
export async function saveSettings(userId: string, input: unknown) {
  const p = z
    .object({ data: settingsSchema, version: z.number().int().min(0) })
    .parse(input);
  const result = await run(
    "UPDATE user_settings SET data=?,version=version+1 WHERE user_id=? AND version=?",
    JSON.stringify(p.data),
    userId,
    p.version,
  );
  check(
    result.meta.changes,
    "Settings changed in another tab. Reload before saving.",
    409,
  );
  return { saved: true };
}
