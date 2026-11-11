import { getTableColumns, getTableName } from "drizzle-orm";
import * as schema from "../db/schema";
import { env } from "cloudflare:workers";
import { all, db, stmt, uid } from "./store";
import { check, settingsSchema, cardSchema, HttpError } from "./validation";
function parseJSON(text:string,label:string){try{return JSON.parse(text);}catch{throw new HttpError(400,`Invalid JSON in backup ${label}.`);}}
const tables = [
  schema.settings,
  schema.subjects,
  schema.folders,
  schema.decks,
  schema.tags,
  schema.cards,
  schema.options,
  schema.sources,
  schema.media,
  schema.reviews,
  schema.sessions,
  schema.answers,
  schema.history,
  schema.xpEvents,
  schema.activity,
  schema.exams,
  schema.examDecks,
  schema.goals,
  schema.achievements,
  schema.imports,
  schema.aiUsage,
];
const foreign: Record<string, string> = {
  subject_id: "subjects",
  folder_id: "folders",
  deck_id: "decks",
  card_id: "cards",
  session_id: "study_sessions",
  exam_id: "exams",
};
function scope(table: string) {
  if (["deck_tags"].includes(table))
    return "deck_id IN (SELECT id FROM decks WHERE user_id=?)";
  if (["card_options", "card_sources"].includes(table))
    return "card_id IN (SELECT id FROM cards WHERE user_id=?)";
  if (table === "exam_decks")
    return "exam_id IN (SELECT id FROM exams WHERE user_id=?)";
  return "user_id=?";
}
export async function exportData(userId: string) {
  const data: Record<string, any[]> = {};
  const results = await Promise.all(
    tables.map((t) =>
      all(
        `SELECT * FROM "${getTableName(t)}" WHERE ${scope(getTableName(t))}`,
        userId,
      ),
    ),
  );
  tables.forEach((t, i) => (data[getTableName(t)] = results[i]));
  return {
    format: "recallforge-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    attachmentsIncluded: false,
    attachmentNote:
      "Image metadata is included. R2 image bytes are not included; keep a separate copy of your study images.",
    tables: data,
  };
}
export async function restoreData(userId: string, input: any) {
  check(
    input.confirmation === "RESTORE",
    "Type RESTORE to replace your current data.",
  );
  const b = input.backup;
  check(
    b?.format === "recallforge-backup" &&
      b.version === 1 &&
      b.tables &&
      typeof b.tables === "object",
    "This is not a supported RecallForge backup.",
  );
  const total = Object.values(b.tables).reduce(
    (s: number, a: any) => s + (Array.isArray(a) ? a.length : 0),
    0,
  );
  check(
    total <= 10000,
    "Restore supports up to 10,000 database records per backup.",
  );
  const data: Record<string, any[]> = {},
    maps = new Map<string, string>();
  for (const table of tables) {
    const name = getTableName(table),
      columns = Object.values(getTableColumns(table));
    const rows = b.tables[name];
    check(Array.isArray(rows), `Backup is missing ${name}.`);
    check(rows.length <= 5000, `Too many rows in ${name}.`);
    const known = new Set(columns.map((c) => c.name));
    const seen = new Set<string>();
    data[name] = rows.map((raw: any) => {
      check(
        raw && typeof raw === "object" && !Array.isArray(raw),
        "A backup record is malformed.",
      );
      check(
        Object.keys(raw).every((k) => known.has(k)),
        `Unrecognized fields in ${name}.`,
      );
      const row: Record<string, any> = {};
      for (const c of columns) {
        const val = raw[c.name];
        check(val !== undefined, `Missing ${c.name} in ${name}.`);
        if (val === null) {
          check(!c.notNull, `${name}.${c.name} cannot be empty.`);
        } else if (c.dataType === "number") {
          check(
            typeof val === "number" &&
              Number.isFinite(val) &&
              Math.abs(val) < Number.MAX_SAFE_INTEGER,
            "Invalid numeric value in backup.",
          );
        } else {
          check(
            typeof val === "string" && val.length < 2_000_000,
            "Invalid text in backup.",
          );
        }
        row[c.name] = val;
      }
      const key = row.id || row.card_id || row.user_id;
      check(!seen.has(key), `Duplicate record in ${name}.`);
      seen.add(key);
      if (row.id && !maps.has(row.id)) maps.set(row.id, uid());
      return row;
    });
  }
  check(
    data.user_settings.length === 1,
    "Backup must include exactly one settings record.",
  );
  settingsSchema.parse(parseJSON(data.user_settings[0].data,'preferences'));
  for (const r of data.review_states) {
    check(
      ["new", "learning", "reviewing", "relearning"].includes(r.state) &&
        r.interval >= 0 &&
        r.interval <= 3650 &&
        r.ease >= 1.3 &&
        r.ease <= 3 &&
        r.reviews >= 0 &&
        [r.reviews,r.successes,r.failures,r.lapses,r.due,r.last_review,r.version].every(n=>Number.isInteger(n)&&n>=0) &&
        r.reviews === r.successes + r.failures &&
        r.due >= 0,
      "A review schedule in this backup is invalid.",
    );
  }
  for (const m of data.card_media)
    if (!m.object_key.startsWith(`${userId}/`))
      m.object_key = `${userId}/missing/${uid()}`;
  const reviewIds = new Set(data.review_states.map((r) => r.card_id));
  for (const c of data.cards) {
    check(reviewIds.has(c.id), "A flashcard is missing its review schedule.");
    cardSchema.parse({
      id: c.id,
      deckId: c.deck_id,
      type: c.type,
      front: c.front,
      answer: parseJSON(c.answer,'card answers'),
      alternatives: parseJSON(c.alternatives,'card alternatives'),
      hint:c.hint,explanation:c.explanation,tags:parseJSON(c.tags,'card tags'),ignorePunctuation:!!c.ignore_punctuation,
      options: data.card_options
        .filter((o) => o.card_id === c.id)
        .sort((a, b) => a.position - b.position)
        .map((o) => o.text),
      difficulty: c.difficulty,
      mediaId:
        c.type === "image"
          ? data.card_media.find((m) => m.card_id === c.id)?.id ||
            "missing-image"
          : undefined,
    });
  }
  for (const e of data.xp_events)
    check(
      Number.isInteger(e.amount) && e.amount >= 0 && e.amount <= 1000,
      "An XP event in this backup is invalid.",
    );
  for(const e of data.exams)check(/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&!Number.isNaN(Date.parse(e.date))&&new Date(e.date).toISOString().startsWith(e.date),'An exam date in this backup is invalid.');
  for(const a of data.daily_activity)check([a.answers,a.correct,a.seconds].every(n=>Number.isInteger(n)&&n>=0)&&a.correct<=a.answers&&Number.isInteger(a.day),'Daily activity in this backup is invalid.');
  for(const s of data.study_sessions){const queue=parseJSON(s.queue,'session queue');check(Array.isArray(queue)&&queue.length<=600&&Number.isInteger(s.cursor)&&s.cursor>=0&&s.cursor<=queue.length,'A session in this backup is invalid.');for(const c of queue)cardSchema.parse(c);}
  const sets = Object.fromEntries(
    Object.entries(data).map(([k, rows]) => [
      k,
      new Set(rows.map((r) => r.id)),
    ]),
  );
  for (const [name, rows] of Object.entries(data))
    for (const row of rows)
      for (const [col, target] of Object.entries(foreign))
        if (row[col] != null)
          check(
            sets[target]?.has(row[col]),
            `${name} refers to a missing ${target} record.`,
          );
  const replace = (value: any): any => {
    if (Array.isArray(value)) return value.map(replace);
    if (value && typeof value === "object")
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, replace(v)]),
      );
    return typeof value === "string" ? maps.get(value) || value : value;
  };
  const deletion = [
    schema.answers,
    schema.history,
    schema.options,
    schema.sources,
    schema.tags,
    schema.examDecks,
    schema.goals,
    schema.media,
    schema.reviews,
    schema.sessions,
    schema.cards,
    schema.decks,
    schema.folders,
    schema.subjects,
    schema.exams,
    schema.xpEvents,
    schema.activity,
    schema.achievements,
    schema.imports,
    schema.aiUsage,
    schema.settings,
  ];
  const items = deletion.map((t) =>
    stmt(
      `DELETE FROM "${getTableName(t)}" WHERE ${scope(getTableName(t))}`,
      userId,
    ),
  );
  // Insert parents before dependent rows; all changes are one D1 transaction.
  const ordered = [
    schema.settings,
    schema.subjects,
    schema.folders,
    schema.decks,
    schema.tags,
    schema.cards,
    schema.options,
    schema.sources,
    schema.media,
    schema.reviews,
    schema.sessions,
    schema.answers,
    schema.history,
    schema.xpEvents,
    schema.activity,
    schema.exams,
    schema.examDecks,
    schema.goals,
    schema.achievements,
    schema.imports,
    schema.aiUsage,
  ];
  for (const table of ordered) {
    const name = getTableName(table),
      columns = Object.values(getTableColumns(table)).map((c) => c.name);
    const rows = data[name].map((raw) => {
      const row = { ...raw };
      for (const col of columns) {
        if (col === "user_id") row[col] = userId;
        else if (col === "id" || foreign[col])
          row[col] = maps.get(row[col]) || row[col];
        else if (typeof row[col] === "string") {
          try {
            row[col] = JSON.stringify(replace(JSON.parse(row[col])));
          } catch {
            if (col === "event_key")
              for (const [old, next] of maps)
                row[col] = row[col].replace(old, next);
          }
        }
      }
      return row;
    });
    const per = Math.max(1, Math.floor(96 / columns.length));
    for (let i = 0; i < rows.length; i += per) {
      const chunk = rows.slice(i, i + per);
      items.push(
        stmt(
          `INSERT INTO "${name}" (${columns.map((c) => `"${c}"`).join(",")}) VALUES ${chunk.map(() => `(${columns.map(() => "?").join(",")})`).join(",")}`,
          ...chunk.flatMap((r) => columns.map((c) => r[c])),
        ),
      );
    }
  }
  await db().batch(items);
  return { restored: true, attachmentsIncluded: false };
}
export async function deleteAll(userId: string, confirmation: string) {
  check(
    confirmation === "DELETE ALL",
    "Type DELETE ALL to erase your study data.",
  );
  const current = await exportData(userId);
  for (const k of Object.keys(current.tables))
    if (k !== "user_settings") current.tables[k] = [];
  const result = await restoreData(userId, {
    confirmation: "RESTORE",
    backup: current,
  });
  if (env.BUCKET) {
    let cursor: string | undefined;
    do {
      const objects = await env.BUCKET.list({
        prefix: `${userId}/`,
        limit: 1000,
        cursor,
      });
      if (objects.objects.length)
        await env.BUCKET.delete(objects.objects.map((o) => o.key));
      cursor = objects.truncated ? objects.cursor : undefined;
    } while (cursor);
  }
  return result;
}
