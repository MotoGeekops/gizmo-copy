import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";
const moduleUrl = (text) =>
  "data:text/javascript;base64," + Buffer.from(text).toString("base64");
const compile = (path) =>
  ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
const types = moduleUrl(compile("lib/types.ts"));
const imports = await import(
  moduleUrl(
    compile("lib/importers.ts").replace(
      /(['"])\.\/types\1/,
      JSON.stringify(types),
    ),
  )
);
const { callEngine } = await import(moduleUrl(compile("lib/engine-abi.ts")));
const wasm = new WebAssembly.Instance(
  new WebAssembly.Module(readFileSync("lib/wasm/study_core.wasm")),
  {},
);
const engine = (v) => callEngine(wasm.exports, v);
let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("PASS " + name);
}
test("actual Rust WASM evaluates configured alternatives", () =>
  assert.equal(
    engine({
      action: "evaluate",
      card: { type: "qa", answer: ["water"], alternatives: ["H2O"] },
      response: [" h2o. "],
    }).correct,
    true,
  ));
test("actual Rust WASM rejects a mathematical sign change", () =>
  assert.equal(
    engine({ action: "evaluate", card: { answer: ["-2"] }, response: ["2"] })
      .correct,
    false,
  ));
test("WASM scheduler advances due dates", () => {
  const r = engine({ action: "schedule", review: {}, rating: 3, now: 100 });
  assert.equal(r.due, 86400100);
  assert.equal(r.state, "reviewing");
});
test("WASM input validation rejects invalid ratings", () =>
  assert.throws(() =>
    engine({ action: "schedule", review: {}, rating: 9, now: 100 }),
  ));
test("WASM ABI safely handles repeated Unicode calls", () => {
  for (let i = 0; i < 3000; i++)
    assert.equal(
      engine({
        action: "evaluate",
        card: { answer: ["niño"] },
        response: ["niño"],
      }).correct,
      true,
    );
  assert.ok(wasm.exports.memory.buffer.byteLength < 16 * 1024 * 1024);
});
test("CSV supports quoted commas and embedded newlines", () =>
  assert.deepEqual(
    imports.parseCSV('front,back\n"A, B","line one\nline two"'),
    [
      ["front", "back"],
      ["A, B", "line one\nline two"],
    ],
  ));
test("CSV preserves escaped quotation marks", () =>
  assert.deepEqual(imports.parseCSV('"Say ""hello""",Hi'), [
    ['Say "hello"', "Hi"],
  ]));
test("CSV rejects unclosed quoted fields", () =>
  assert.throws(() => imports.parseCSV('"Unclosed,answer')));
test("non-AI parser supports explicit definitions and multiple blanks", () => {
  const c = imports.draftFromText("Malaya: Free\n[Pag-asa] means [hope].");
  assert.equal(c.length, 2);
  assert.equal(c[0].answer[0], "Free");
  assert.equal(c[1].type, "cloze");
});
test("non-AI parser rejects unsupported prose instead of inventing cards", () =>
  assert.throws(() =>
    imports.draftFromText("A paragraph without explicit pairs or blanks."),
  ));
test("parser honors count and removes duplicate fronts", () =>
  assert.equal(
    imports.draftFromText("A: one\nA: one\nB: two\nC: three", 2).length,
    2,
  ));
test("JSON deck import resets card identities and review history", () => {
  const c = imports.draftFromFileText(
    JSON.stringify({
      cards: [
        {
          id: "old",
          front: "Capital?",
          answer: ["Manila"],
          review: { reviews: 99 },
        },
      ],
    }),
    "json",
  )[0];
  assert.notEqual(c.id, "old");
  assert.equal(c.review, undefined);
});
test("complete backups are directed to the restore workflow", () =>
  assert.throws(
    () => imports.draftFromFileText('{"format":"recallforge-backup"}', "json"),
    /Settings/,
  ));
test("CSV header mapping accepts Question and Answer", () => {
  const c = imports.draftFromFileText(
    "Question,Answer\nCapital?,Manila",
    "csv",
  );
  assert.equal(c[0].front, "Capital?");
  assert.equal(c[0].answer[0], "Manila");
});
test('PDF page and presentation slide labels stay in source references',()=>{
 const cards=imports.draftFromText('[Page 1]\nGravity: Attraction between masses.\n[Slide 2]\nEnergy: Capacity to do work.');
 assert.equal(cards.length,2);assert.ok(cards.every(c=>c.type==='qa'));assert.match(cards[0].source,/\[Page 1\]/);assert.match(cards[1].source,/\[Slide 2\]/);
});
console.log(`\n${passed} WASM and import checks passed.`);
