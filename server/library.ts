import { z } from "zod";
import {
  all,
  one,
  stmt,
  db,
  run,
  uid,
  owned,
  saveCard,
  loadCards,
  parse,
} from "./store";
import { check, cardSchema } from "./validation";
import { samples } from "../lib/samples";
const text = z.string().trim().min(1).max(200),
  id = z.string().min(1).max(100),
  color = z.string().regex(/^#[0-9a-f]{6}$/i);
export async function subjectAction(userId: string, body: any) {
  const p = z
    .object({ id: id.optional(), name: text, color: color.default("#7765ed") })
    .parse(body);
  const key = p.id || uid();
  if (p.id) await owned("subjects", p.id, userId);
  await run(
    "INSERT INTO subjects(id,user_id,name,color,created) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,color=excluded.color",
    key,
    userId,
    p.name,
    p.color,
    Date.now(),
  );
  return { id: key };
}
export async function folderAction(userId: string, body: any) {
  const p = z.object({ name: text, subjectId: id }).parse(body);
  await owned("subjects", p.subjectId, userId);
  const key = uid();
  await run(
    "INSERT INTO folders(id,user_id,subject_id,name) VALUES (?,?,?,?)",
    key,
    userId,
    p.subjectId,
    p.name,
  );
  return { id: key };
}
export async function deckAction(userId: string, body: any) {
  const p = z
    .object({
      id: id.optional(),
      title: text,
      description: z.string().max(4000).default(""),
      subjectId: id,
      folderId: id.nullable().optional(),
      color: color.default("#7765ed"),
      tags: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    })
    .parse(body);
  await owned("subjects", p.subjectId, userId);
  if (p.id) await owned("decks", p.id, userId);
  if (p.folderId) {
    const f = await owned("folders", p.folderId, userId);
    check(f.subject_id === p.subjectId, "Choose a folder in the same subject.");
  }
  const key = p.id || uid(),
    now = Date.now();
  await db().batch([
    stmt(
      "INSERT INTO decks(id,user_id,subject_id,folder_id,title,description,color,created,updated) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,subject_id=excluded.subject_id,folder_id=excluded.folder_id,color=excluded.color,updated=excluded.updated",
      key,
      userId,
      p.subjectId,
      p.folderId || null,
      p.title,
      p.description,
      p.color,
      now,
      now,
    ),
    stmt("DELETE FROM deck_tags WHERE deck_id=?", key),
    ...p.tags.map((t) =>
      stmt(
        "INSERT INTO deck_tags(id,deck_id,tag) VALUES (?,?,?)",
        uid(),
        key,
        t,
      ),
    ),
  ]);
  return { id: key };
}
export async function insertCards(
  userId: string,
  deckId: string,
  raw: unknown[],
  source?: { name: string; format: string; excerpt: string },
) {
  check(
    raw.length > 0 && raw.length <= 200,
    "Import between 1 and 200 cards at a time.",
  );
  await owned("decks", deckId, userId);
  const cards = raw.map((c) => cardSchema.parse({ ...(c as any), deckId }));
  check(
    new Set(cards.map((c) => c.id)).size === cards.length,
    "Each imported card needs a distinct identifier.",
  );
  const existing = await all("SELECT id FROM cards WHERE user_id=?", userId);
  const ids = new Set(existing.map((c) => c.id));
  const items: D1PreparedStatement[] = [];
  const now = Date.now();
  let added = 0;
  for (const c of cards) {
    const key = c.id || uid();
    if (ids.has(key)) continue;
    check(!c.mediaId, "Import images separately after importing these cards.");
    added++;
    items.push(
      stmt(
        "INSERT INTO cards(id,user_id,deck_id,type,front,answer,alternatives,hint,explanation,difficulty,tags,ignore_punctuation,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        key,
        userId,
        deckId,
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
        "INSERT INTO review_states(card_id,user_id) VALUES (?,?)",
        key,
        userId,
      ),
    );
    c.options.forEach((o, i) =>
      items.push(
        stmt(
          "INSERT INTO card_options(id,card_id,text,position) VALUES (?,?,?,?)",
          uid(),
          key,
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
          key,
          c.source,
        ),
      );
  }
  if (source)
    items.push(
      stmt(
        "INSERT INTO imported_sources(id,user_id,name,format,excerpt,created) VALUES (?,?,?,?,?,?)",
        uid(),
        userId,
        source.name.slice(0, 200),
        source.format.slice(0, 30),
        source.excerpt.slice(0, 20000),
        now,
      ),
    );
  items.push(stmt("UPDATE decks SET updated=? WHERE id=?", now, deckId));
  await db().batch(items);
  return { added };
}
export async function mutateDecks(userId: string, body: any) {
  const input = z.object({
    ids: z.array(id).min(1).max(100),
    confirmation: z.string().optional(),
  });
  // Older clients send an empty destination on delete; only merge uses it.
  const p = z
    .discriminatedUnion("operation", [
      input.extend({
        operation: z.literal("merge"),
        targetId: z.string().min(1, "Choose a destination deck.").max(100),
      }),
      input.extend({
        operation: z.enum([
          "favorite",
          "archive",
          "restore",
          "delete",
          "recover",
          "duplicate",
        ]),
      }),
    ])
    .parse(body);
  const decks = await Promise.all(
    p.ids.map((key) => owned("decks", key, userId)),
  );
  const now = Date.now();
  if (p.operation === "delete")
    check(
      p.confirmation === "DELETE",
      "Type DELETE to move these decks to recovery.",
    );
  if (p.operation === "merge") {
    check(p.targetId, "Choose a destination deck.");
    const target = await owned("decks", p.targetId, userId);
    check(!target.deleted && !target.archived, "Choose an active destination.");
    check(
      !p.ids.includes(target.id),
      "The destination must be outside your selection.",
    );
    await db().batch(
      decks.flatMap((d) => [
        stmt(
          "UPDATE cards SET deck_id=?,updated=? WHERE deck_id=? AND user_id=?",
          target.id,
          now,
          d.id,
          userId,
        ),
        stmt(
          "UPDATE decks SET archived=1,updated=? WHERE id=? AND user_id=?",
          now,
          d.id,
          userId,
        ),
      ]),
    );
    return { merged: true };
  }
  if (p.operation === "duplicate") {
    check(decks.length === 1, "Duplicate one deck at a time.");
    const d = decks[0],
      key = uid();
    const old = (await loadCards(userId)).filter((c) => c.deckId === d.id);
    check(
      old.length <= 200,
      "Duplicate up to 200 cards at a time. Export larger decks instead.",
    );
    const items = [
      stmt(
        "INSERT INTO decks(id,user_id,subject_id,folder_id,title,description,color,sample,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?)",
        key,
        userId,
        d.subject_id,
        d.folder_id,
        `${d.title.slice(0, 190)} (copy)`,
        d.description,
        d.color,
        d.sample,
        now,
        now,
      ),
    ];
    const tags = await all("SELECT tag FROM deck_tags WHERE deck_id=?", d.id);
    for (const t of tags)
      items.push(
        stmt(
          "INSERT INTO deck_tags(id,deck_id,tag) VALUES (?,?,?)",
          uid(),
          key,
          t.tag,
        ),
      );
    for (const c of old)
      items.push(...cloneCardStatements(userId, c, key, now));
    await db().batch(items);
    return { duplicated: true, id: key };
  }
  const sql: Record<string, string> = {
    favorite: "favorite=1-favorite",
    archive: "archived=1",
    restore: "archived=0",
    delete: "deleted=1",
    recover: "deleted=0",
  };
  await db().batch(
    p.ids.map((key) =>
      stmt(
        `UPDATE decks SET ${sql[p.operation]},updated=? WHERE id=? AND user_id=?`,
        now,
        key,
        userId,
      ),
    ),
  );
  return { saved: true };
}
export async function mutateCards(userId: string, body: any) {
  const input = z.object({
    ids: z.array(id).min(1).max(200),
    confirmation: z.string().optional(),
  });
  const p = z
    .discriminatedUnion("operation", [
      input.extend({
        operation: z.literal("move"),
        deckId: z.string().min(1, "Choose a destination deck.").max(100),
      }),
      input.extend({ operation: z.enum(["delete", "duplicate"]) }),
    ])
    .parse(body);
  const raw = await Promise.all(
    p.ids.map((key) => owned("cards", key, userId)),
  );
  if (p.operation === "delete") {
    check(p.confirmation === "DELETE", "Confirm deletion first.");
    await db().batch(
      raw.map((c) =>
        stmt(
          "UPDATE cards SET deleted=1 WHERE id=? AND user_id=?",
          c.id,
          userId,
        ),
      ),
    );
  }
  if (p.operation === "move") {
    check(p.deckId, "Choose a destination deck.");
    await owned("decks", p.deckId, userId);
    await db().batch(
      raw.map((c) =>
        stmt(
          "UPDATE cards SET deck_id=?,updated=? WHERE id=? AND user_id=?",
          p.deckId!,
          Date.now(),
          c.id,
          userId,
        ),
      ),
    );
  }
  if (p.operation === "duplicate") {
    const cards = await loadCards(userId);
    const items = cards
      .filter((c) => p.ids.includes(c.id))
      .flatMap((c) => cloneCardStatements(userId, c, c.deckId, Date.now()));
    if (items.length) await db().batch(items);
  }
  return { saved: true };
}
function cloneCardStatements(
  userId: string,
  c: any,
  deckId: string,
  now: number,
) {
  const key = uid(),
    items = [
      stmt(
        "INSERT INTO cards(id,user_id,deck_id,type,front,answer,alternatives,hint,explanation,difficulty,tags,ignore_punctuation,created,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        key,
        userId,
        deckId,
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
        "INSERT INTO review_states(card_id,user_id) VALUES (?,?)",
        key,
        userId,
      ),
    ];
  c.options.forEach((o: string, i: number) =>
    items.push(
      stmt(
        "INSERT INTO card_options(id,card_id,text,position) VALUES (?,?,?,?)",
        uid(),
        key,
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
        key,
        c.source,
      ),
    );
  if (c.mediaId)
    items.push(
      stmt(
        "INSERT INTO card_media(id,user_id,card_id,object_key,mime,size,alt,created) SELECT ?,user_id,?,object_key,mime,size,alt,? FROM card_media WHERE id=? AND user_id=?",
        uid(),
        key,
        now,
        c.mediaId,
        userId,
      ),
    );
  return items;
}
export async function sampleAction(userId: string, body: any) {
  const p = z
    .object({
      index: z
        .number()
        .int()
        .min(0)
        .max(samples.length - 1),
    })
    .parse(body);
  const s = samples[p.index];
  const existing = await one(
    "SELECT id FROM decks WHERE user_id=? AND sample=1 AND title=? AND deleted=0",
    userId,
    s.name,
  );
  if (existing) return { id: existing.id, existing: true };
  let sub = await one(
    "SELECT id FROM subjects WHERE user_id=? AND name=?",
    userId,
    s.subject,
  );
  if (!sub)
    sub = await subjectAction(userId, { name: s.subject, color: s.color });
  const deck = await deckAction(userId, {
    title: s.name,
    description: s.description,
    subjectId: sub.id,
    color: s.color,
  });
  await run("UPDATE decks SET sample=1 WHERE id=?", deck.id);
  await insertCards(
    userId,
    deck.id,
    s.cards.map(([front, answer]) => ({
      id: uid(),
      deckId: deck.id,
      type: "qa",
      front,
      answer: [answer],
      source:
        "RecallForge optional sample deck. Verify against your class materials.",
    })),
  );
  return deck;
}
export async function examAction(userId: string, body: any) {
  const p = z
    .object({
      id: id.optional(),
      name: text,
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      topics: z.string().max(4000).default(""),
      notes: z.string().max(4000).default(""),
      priority: z.enum(["normal", "high", "low"]).default("normal"),
      deckIds: z.array(id).max(100),
    })
    .parse(body);
  check(
    !Number.isNaN(Date.parse(p.date)) &&
      new Date(p.date).toISOString().startsWith(p.date),
    "Choose a real calendar date.",
  );
  if (p.id) await owned("exams", p.id, userId);
  await Promise.all(p.deckIds.map((key) => owned("decks", key, userId)));
  const key = p.id || uid();
  await db().batch([
    stmt(
      "INSERT INTO exams(id,user_id,name,date,topics,notes,priority,created) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,date=excluded.date,topics=excluded.topics,notes=excluded.notes,priority=excluded.priority",
      key,
      userId,
      p.name,
      p.date,
      p.topics,
      p.notes,
      p.priority,
      Date.now(),
    ),
    stmt("DELETE FROM exam_decks WHERE exam_id=?", key),
    ...p.deckIds.map((deck) =>
      stmt(
        "INSERT INTO exam_decks(id,exam_id,deck_id) VALUES (?,?,?)",
        uid(),
        key,
        deck,
      ),
    ),
  ]);
  return { id: key };
}
