import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const base = process.env.RECALLFORGE_TEST_URL || "http://127.0.0.1:5180";
assert.ok(
  /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base),
  "Integration tests may run only on a loopback test server.",
);
const account = `test-${crypto.randomUUID()}`,
  other = `test-${crypto.randomUUID()}`;
let passed = 0;
const log = [];
function ok(label, fn) {
  fn();
  passed++;
  console.log(`PASS ${label}`);
  log.push(label);
}
async function call(action, data, user = account, expected = 200) {
  const r = await fetch(base + "/api/app", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "oai-authenticated-user-id": user,
      "oai-authenticated-user-email": `${user}@example.test`,
    },
    body: JSON.stringify({ action, data }),
  });
  const j = await r.json();
  assert.equal(r.status, expected, `${action}: ${JSON.stringify(j)}`);
  return j;
}
async function get(query = "", user = account) {
  const r = await fetch(base + "/api/app" + query, {
    headers: {
      "oai-authenticated-user-id": user,
      "oai-authenticated-user-email": `${user}@example.test`,
    },
  });
  assert.equal(r.status, 200, await r.clone().text());
  return r.json();
}
const defaults = (await get()).settings;
try {
  const anonymous = await fetch(base + "/api/app");
  ok("anonymous API access is rejected", () =>
    assert.equal(anonymous.status, 401),
  );
  let data = await get();
  ok("new accounts have no fabricated activity", () =>
    assert.equal(data.stats.xp + data.stats.answers + data.cards.length, 0),
  );
  const sub = await call("subject", { name: "Filipino", color: "#7765ed" });
  const deck = await call("deck", {
    title: "Vocabulary",
    subjectId: sub.id,
    color: "#7765ed",
  });
  const qa = [
    ["What does malaya mean?", "Free"],
    ["What does pag-asa mean?", "Hope"],
    ["What does kaalaman mean?", "Knowledge"],
    ["What does matapat mean?", "Honest"],
    ["What does bukas mean?", "Tomorrow"],
  ];
  const cards = qa.map(([front, answer]) => ({
    id: crypto.randomUUID(),
    deckId: deck.id,
    type: "qa",
    front,
    answer: [answer],
  }));
  cards.push(
    {
      id: crypto.randomUUID(),
      deckId: deck.id,
      type: "cloze",
      front: "The capital of the Philippines is [Manila].",
      answer: [],
    },
    {
      id: crypto.randomUUID(),
      deckId: deck.id,
      type: "cloze",
      front: "[Pag-asa] means [hope].",
      answer: [],
    },
  );
  for (const card of cards) await call("card", card);
  data = await get();
  ok("acceptance: subject, deck, five QA and two cloze cards persist", () => {
    assert.equal(data.subjects[0].name, "Filipino");
    assert.equal(data.decks[0].title, "Vocabulary");
    assert.equal(data.cards.length, 7);
  });
  await call(
    "card",
    { deckId: deck.id, type: "qa", front: "", answer: [] },
    account,
    400,
  );
  await call("deck", { title: "Forbidden", subjectId: sub.id }, other, 404);
  ok("validation and ownership are enforced", () =>
    assert.equal(data.cards.length, 7),
  );
  await call("settings", {
    data: { ...defaults, dailyGoal: 7, randomize: false },
    version: data.settingsVersion,
  });
  const sid = crypto.randomUUID();
  let session = await call("start", {
    id: sid,
    mode: "memorise",
    filter: "all",
    deckIds: [deck.id],
    count: 7,
  });
  ok("study queue contains real stored cards", () =>
    assert.equal(session.total, 7),
  );
  let wrongVerified = false;
  let firstPayload;
  while (session.cursor < session.total) {
    const c = session.card;
    const expected =
      c.type === "cloze"
        ? [...c.front.matchAll(/\[([^\]]+)\]/g)].map((x) => x[1])
        : c.answer;
    const wrong = session.cursor === 2;
    const p = {
      id: crypto.randomUUID(),
      sessionId: sid,
      position: session.cursor,
      response: wrong ? ["unrelated answer"] : expected,
      seconds: 4,
    };
    let result;
    if (session.cursor === 0) {
      firstPayload = p;
      const pair = await Promise.all([call("answer", p), call("answer", p)]);
      result = pair[0];
      ok("concurrent retries are idempotent", () =>
        assert.equal(pair[0].session.cursor, pair[1].session.cursor),
      );
      const after = await get();
      ok("duplicate answers do not duplicate reviews or XP", () => {
        assert.equal(after.stats.answers, 1);
        assert.equal(after.stats.xp, 10);
        assert.equal(after.cards.find((x) => x.id === c.id).review.reviews, 1);
      });
    } else result = await call("answer", p);
    if (wrong) {
      const after = await get(),
        review = after.cards.find((x) => x.id === c.id).review;
      ok(
        "incorrect answers schedule a one-minute review and extra practice",
        () => {
          assert.equal(result.correct, false);
          assert.ok(
            review.due > Date.now() + 50000 && review.due < Date.now() + 70000,
          );
          assert.equal(result.session.total, 8);
        },
      );
      wrongVerified = true;
    }
    session = result.session;
    if (session.cursor === 4) {
      const resumed = await get("?session=" + sid);
      ok("interrupted sessions resume from the server", () => {
        assert.equal(resumed.cursor, 4);
        assert.equal(resumed.card.id, session.card.id);
      });
    }
  }
  session = await call("finish", { id: sid });
  let after = await get();
  const xp = after.stats.xp;
  await call("finish", { id: sid });
  ok("session completion and daily-goal XP are awarded exactly once", () => {
    assert.equal(xp, 120);
    assert.equal(after.stats.answers, 8);
    assert.equal(after.stats.correct, 7);
  });
  after = await get();
  ok("refresh preserves progress, XP and Manila streak", () => {
    assert.equal(after.stats.xp, xp);
    assert.equal(after.stats.streak.current, 1);
    assert.equal(after.stats.today, 8);
    assert.equal(after.cards.length, 7);
  });
  await call(
    "answer",
    { ...firstPayload, id: crypto.randomUUID() },
    account,
    409,
  );
  ok("stale submissions cannot overwrite a finished session", () =>
    assert.ok(session.ended),
  );
  const importDeck = await call("deck", {
    title: "Imported notes",
    subjectId: sub.id,
  });
  const importCards = [
    {
      id: crypto.randomUUID(),
      type: "qa",
      front: "What does araw mean?",
      answer: ["Day"],
      source: "Araw: Day",
    },
    {
      id: crypto.randomUUID(),
      type: "qa",
      front: "What does gabi mean?",
      answer: ["Night"],
      source: "Gabi: Night",
    },
  ];
  const imported = await call("import", {
    deckId: importDeck.id,
    cards: importCards,
    source: {
      name: "vocabulary.txt",
      format: "txt",
      excerpt: "Araw: Day\nGabi: Night",
    },
  });
  const repeated = await call("import", {
    deckId: importDeck.id,
    cards: importCards,
  });
  ok("reviewed imports persist and retries do not duplicate cards", () => {
    assert.equal(imported.added, 2);
    assert.equal(repeated.added, 0);
  });
  const invalidBatch = importCards.map((c, i) => ({
    ...c,
    id: crypto.randomUUID(),
    front: i ? "" : c.front,
  }));
  await call(
    "import",
    { deckId: importDeck.id, cards: invalidBatch },
    account,
    400,
  );
  data = await get();
  ok("invalid bulk imports save no partial cards", () =>
    assert.equal(
      data.cards.filter((c) => c.deckId === importDeck.id).length,
      2,
    ),
  );
  const special = await call("deck", {
    title: "Question format validation",
    subjectId: sub.id,
  });
  const formats = [
    {
      type: "choice",
      front: "Choose the even number.",
      options: ["2", "3", "5"],
      answer: ["2"],
      response: ["2"],
    },
    {
      type: "multi",
      front: "Select every even number.",
      options: ["2", "4", "5"],
      answer: ["2", "4"],
      response: ["4", "2"],
    },
    {
      type: "boolean",
      front: "Two plus two is four.",
      answer: ["True"],
      response: ["true"],
    },
    {
      type: "matching",
      front: "Match each word.",
      options: ["Malaya", "Pag-asa"],
      answer: ["Free", "Hope"],
      response: ["Free", "Hope"],
    },
    {
      type: "ordering",
      front: "Order these numbers.",
      answer: ["1", "2", "3"],
      response: ["1", "2", "3"],
    },
  ];
  for (const c of formats) {
    await call("card", { ...c, id: crypto.randomUUID(), deckId: special.id });
  }
  let test = await call("start", {
    id: crypto.randomUUID(),
    mode: "test",
    filter: "all",
    count: 5,
    deckIds: [special.id],
  });
  while (test.cursor < test.total) {
    const c = test.card;
    const resp = c.type === "multi" ? [...c.answer].reverse() : c.answer;
    const r = await call("answer", {
      id: crypto.randomUUID(),
      sessionId: test.id,
      position: test.cursor,
      response: resp,
      seconds: 1,
    });
    assert.equal(r.correct, true);
    test = r.session;
  }
  test = await call("finish", { id: test.id });
  ok(
    "choice, multiple-select, boolean, matching and ordering grade correctly",
    () => assert.equal(test.correct, 5),
  );
  data = await get();
  ok("deterministic perfect-test achievement unlocks", () =>
    assert.ok(data.unlocks.some((u) => u.key === "perfect-test")),
  );
  const image = new Uint8Array(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  const form = new FormData();
  form.append("file", new Blob([image], { type: "image/png" }), "study.png");
  const mediaResponse = await fetch(base + "/api/media", {
    method: "POST",
    headers: {
      "oai-authenticated-user-id": account,
      "oai-authenticated-user-email": "test@example.test",
    },
    body: form,
  });
  assert.equal(mediaResponse.status, 200);
  const media = await mediaResponse.json();
  await call("card", {
    id: crypto.randomUUID(),
    deckId: special.id,
    type: "image",
    front: "What is shown?",
    answer: ["A test image"],
    mediaId: media.id,
  });
  const readImage = await fetch(base + `/api/media?id=${media.id}`, {
    headers: {
      "oai-authenticated-user-id": account,
      "oai-authenticated-user-email": "test@example.test",
    },
  });
  ok("R2 images upload, persist and download", () => {
    assert.equal(readImage.status, 200);
    assert.equal(readImage.headers.get("content-type"), "image/png");
  });
  const forbiddenImage = await fetch(base + `/api/media?id=${media.id}`, {
    headers: {
      "oai-authenticated-user-id": other,
      "oai-authenticated-user-email": "other@example.test",
    },
  });
  ok("images respect account ownership", () =>
    assert.equal(forbiddenImage.status, 404),
  );
  const exam = await call("exam", {
    name: "Filipino examination",
    date: "2026-12-10",
    deckIds: [deck.id],
    topics: "Vocabulary",
  });
  await call("goal", { examId: exam.id, day: "2026-11-10", target: 7 });
  data = await get();
  ok("exam coverage, deck links and editable plan persist", () => {
    assert.equal(data.exams[0].deckIds[0], deck.id);
    assert.equal(data.goals.length, 1);
  });
  const beforeMove = data.cards.find((c) => c.deckId === deck.id);
  await call("cards", {
    ids: [beforeMove.id],
    operation: "move",
    deckId: importDeck.id,
  });
  data = await get();
  ok("moving cards preserves their review state", () =>
    assert.deepEqual(
      data.cards.find((c) => c.id === beforeMove.id).review,
      beforeMove.review,
    ),
  );
  await call("decks", { ids: [importDeck.id], operation: "archive" });
  data = await get();
  ok("archiving preserves the deck and cards", () => {
    assert.equal(data.decks.find((x) => x.id === importDeck.id).archived, true);
    assert.ok(data.cards.some((x) => x.deckId === importDeck.id));
  });
  await call("decks", { ids: [importDeck.id], operation: "restore" });
  const blockedDelete = await call("decks", {
    ids: [importDeck.id], operation: "delete", targetId: "", confirmation: "",
  }, account, 400);
  await call("decks", {
    ids: [importDeck.id], operation: "delete", targetId: "", confirmation: "DELETE",
  }, other, 404);
  const beforeDelete = await get();
  ok("deck deletion still requires confirmation and account ownership", () => {
    assert.match(blockedDelete.error, /Type DELETE/);
    assert.ok(beforeDelete.decks.some((d) => d.id === importDeck.id));
  });
  await call("decks", {
    ids: [importDeck.id],
    operation: "delete",
    targetId: "",
    confirmation: "DELETE",
  });
  let deleted = await get("?recovery=1");
  data = await get();
  ok("the prior UI delete payload succeeds and moves the deck to recovery", () => {
    assert.ok(deleted.some((x) => x.id === importDeck.id));
    assert.ok(!data.decks.some((d) => d.id === importDeck.id));
    assert.ok(!data.cards.some((c) => c.deckId === importDeck.id));
  });
  await call("decks", { ids: [importDeck.id], operation: "recover" });
  data = await get();
  ok("recovering a deleted deck preserves cards, schedules, and progress", () => {
    const reviews = d => d.cards.filter(c => c.deckId === importDeck.id)
      .map(c => ({id:c.id,review:c.review})).sort((a,b) => a.id.localeCompare(b.id));
    assert.deepEqual(reviews(data), reviews(beforeDelete));
    assert.equal(data.stats.xp, beforeDelete.stats.xp);
    assert.equal(data.stats.answers, beforeDelete.stats.answers);
  });
  const deletionCard = await call("card", {
    deckId: importDeck.id, type: "qa", front: "Deletion regression test", answer: ["Temporary test card"],
  });
  const blockedCardDelete = await call("cards", {
    ids:[deletionCard.id], operation:"delete", deckId:"", confirmation:"",
  }, account, 400);
  const beforeCardDelete = await get();
  await call("cards", {
    ids:[deletionCard.id], operation:"delete", deckId:"", confirmation:"DELETE",
  });
  data = await get();
  ok("card deletion accepts the prior empty-destination payload and requires confirmation", () => {
    assert.match(blockedCardDelete.error, /Confirm deletion/);
    assert.ok(beforeCardDelete.cards.some(c => c.id === deletionCard.id));
    assert.ok(!data.cards.some(c => c.id === deletionCard.id));
  });
  const invalidMerge = await call("decks", {
    ids:[importDeck.id], operation:"merge", targetId:"",
  }, account, 400);
  const invalidMove = await call("cards", {
    ids:[beforeMove.id], operation:"move", deckId:"",
  }, account, 400);
  data = await get();
  ok("merge and move still require a valid destination without changing records", () => {
    assert.match(invalidMerge.error, /Choose a destination deck/);
    assert.match(invalidMove.error, /Choose a destination deck/);
    assert.equal(data.decks.find(d => d.id === importDeck.id).archived, false);
    assert.equal(data.cards.find(c => c.id === beforeMove.id).deckId, importDeck.id);
  });
  const mergeSource = await call("deck", {title:"Merge regression source",subjectId:sub.id});
  const mergeCard = await call("card", {
    deckId:mergeSource.id,type:"qa",front:"Merge regression card",answer:["Preserved"],
  });
  await call("decks", {ids:[mergeSource.id],operation:"merge",targetId:importDeck.id});
  data = await get();
  ok("a valid merge moves cards and archives its source deck", () => {
    assert.equal(data.cards.find(c => c.id === mergeCard.id).deckId, importDeck.id);
    assert.equal(data.decks.find(d => d.id === mergeSource.id).archived, true);
  });
  await call("settings", {
    data: { ...data.settings, aiEnabled: true },
    version: data.settingsVersion,
  });
  await call(
    "ai",
    { kind: "generate", source: "Araw: Day", count: 1 },
    account,
    503,
  );
  ok("missing AI configuration returns a real error", () => assert.ok(true));
  await call(
    "answer",
    { ...firstPayload, response: ["A different answer"] },
    account,
    409,
  );
  ok("an idempotency key cannot be reused for a different answer", () =>
    assert.ok(true),
  );
  const empty = await call("deck", { title: "Empty deck", subjectId: sub.id });
  const emptyCopy = await call("decks", {
    ids: [empty.id],
    operation: "duplicate",
  });
  const imageCopy = await call("decks", {
    ids: [special.id],
    operation: "duplicate",
  });
  data = await get();
  ok("empty decks and image decks duplicate with complete content", () => {
    assert.equal(data.decks.find((d) => d.id === emptyCopy.id).count, 0);
    const copied = data.cards.filter((c) => c.deckId === imageCopy.id);
    assert.equal(copied.length, 6);
    assert.ok(copied.find((c) => c.type === "image").mediaId);
    assert.ok(copied.every((c) => c.review.reviews === 0));
  });
  let classic = await call("start", {
    id: crypto.randomUUID(),
    mode: "classic",
    deckIds: [special.id],
    filter: "all",
    count: 6,
  });
  const shuffled = await call("shuffle", { id: classic.id });
  ok("Classic shuffle preserves the queue and saved progress", () => {
    assert.deepEqual(
      new Set(shuffled.browse.map((c) => c.id)),
      new Set(classic.browse.map((c) => c.id)),
    );
    assert.equal(shuffled.cursor, 0);
  });
  await call("finish", { id: classic.id });
  let cram = await call("start", {
    id: crypto.randomUUID(),
    mode: "cram",
    deckIds: [special.id],
    filter: "all",
    count: 1,
  });
  const cr = await call("answer", {
    id: crypto.randomUUID(),
    sessionId: cram.id,
    position: 0,
    response: ["Incorrect"],
  });
  ok("Cram mode records attempts without growing its practice queue", () => {
    assert.equal(cr.correct, false);
    assert.equal(cr.session.total, 1);
  });
  await call("finish", { id: cram.id });
  let timed = await call("start", {
    id: crypto.randomUUID(),
    mode: "test",
    deckIds: [special.id],
    filter: "all",
    count: 1,
    timeLimit: 1,
  });
  await new Promise((resolve) => setTimeout(resolve, 3200));
  await call(
    "answer",
    {
      id: crypto.randomUUID(),
      sessionId: timed.id,
      position: 0,
      response: timed.card.answer,
    },
    account,
    409,
  );
  await call("finish", { id: timed.id });
  ok("expired test deadlines are enforced by the server", () =>
    assert.ok(true),
  );
  const backup = await get("?backup=1");
  ok("complete versioned backup includes history and review schedules", () => {
    assert.equal(backup.version, 1);
    assert.ok(backup.tables.review_history.length >= 13);
    assert.equal(backup.attachmentsIncluded, false);
  });
  await call("restore", { backup, confirmation: "RESTORE" }, other);
  const restored = await get("", other),
    original = await get();
  const canonical = (d) =>
    d.cards
      .map((c) => ({
        front: c.front,
        answer: c.answer,
        review: { ...c.review, version: c.review?.version },
      }))
      .sort((a, b) => a.front.localeCompare(b.front));
  ok(
    "backup restores into a clean account with schedule and history integrity",
    () => {
      assert.deepEqual(canonical(restored), canonical(original));
      assert.equal(restored.stats.xp, original.stats.xp);
      assert.equal(restored.stats.answers, original.stats.answers);
      assert.equal(restored.exams.length, original.exams.length);
    },
  );
  const bad = structuredClone(backup);
  bad.tables.cards[0].deck_id = "unknown";
  await call("restore", { backup: bad, confirmation: "RESTORE" }, other, 400);
  const intact = await get("", other);
  ok("malformed restore cannot erase existing data", () =>
    assert.equal(intact.cards.length, restored.cards.length),
  );
  const cors = await fetch(base + "/api/app", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example",
      "oai-authenticated-user-id": account,
      "oai-authenticated-user-email": "test@example.test",
    },
    body: JSON.stringify({ action: "subject", data: { name: "No" } }),
  });
  ok("cross-origin writes are rejected", () => assert.equal(cors.status, 403));
  mkdirSync("outputs", { recursive: true });
  writeFileSync(
    "outputs/integration-results.json",
    JSON.stringify(
      { passed, checks: log, time: new Date().toISOString() },
      null,
      2,
    ),
  );
  writeFileSync(
    "outputs/acceptance-backup.json",
    JSON.stringify(backup, null, 2),
  );
  console.log(
    `\n${passed} integration checks passed. Synthetic test accounts: ${account}, ${other}`,
  );
} finally {
  // Only these freshly generated synthetic accounts can be removed by this test.
  for (const user of [account, other])
    try {
      await call("deleteAll", { confirmation: "DELETE ALL" }, user);
    } catch (e) {
      console.error("Synthetic cleanup failed:", e.message);
    }
}
