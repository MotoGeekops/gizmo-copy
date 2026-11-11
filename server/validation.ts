import { z } from "zod";
const id = z.string().min(1).max(100);
export const cardSchema = z
  .object({
    id: id.optional(),
    deckId: id,
    type: z.enum([
      "qa",
      "cloze",
      "choice",
      "multi",
      "boolean",
      "matching",
      "ordering",
      "image",
    ]),
    front: z.string().trim().min(1).max(10000),
    answer: z.array(z.string().trim().min(1).max(5000)).max(40),
    alternatives: z
      .array(z.string().trim().min(1).max(2000))
      .max(30)
      .default([]),
    options: z.array(z.string().trim().min(1).max(2000)).max(40).default([]),
    hint: z.string().max(4000).default(""),
    explanation: z.string().max(10000).default(""),
    source: z.string().max(10000).default(""),
    difficulty: z.enum(["normal", "hard", "easy"]).default("normal"),
    tags: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    ignorePunctuation: z.boolean().default(true),
    mediaId: id.optional(),
  })
  .superRefine((c, ctx) => {
    const error = (s: string) => ctx.addIssue({ code: "custom", message: s });
    if (c.type === "cloze") {
      if (!/\[[^\]]+\]/.test(c.front))
        error("Mark at least one answer with [square brackets].");
    } else if (!c.answer.length) error("A correct answer is required.");
    if (
      ["qa", "image", "choice", "boolean"].includes(c.type) &&
      c.answer.length !== 1
    )
      error("This format requires one correct answer.");
    if (c.type === "image" && !c.mediaId) error("Upload a study image.");
    if (["choice", "multi"].includes(c.type)) {
      if (
        c.options.length < 2 ||
        new Set(
          c.options.map((s) =>
            s.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim(),
          ),
        ).size !== c.options.length
      )
        error("Use at least two distinct choices.");
      if (c.answer.some((a) => !c.options.includes(a)))
        error("Correct answers must be choices.");
    }
    if (c.type === "boolean" && !["True", "False"].includes(c.answer[0]))
      error("Choose True or False.");
    if (
      c.type === "matching" &&
      (c.options.length < 2 ||
        c.options.length !== c.answer.length ||
        new Set(c.options).size !== c.options.length ||
        new Set(c.answer).size !== c.answer.length)
    )
      error(
        "Matching needs distinct right-hand answers and an answer for every term.",
      );
    if (
      c.type === "ordering" &&
      (c.answer.length < 2 || new Set(c.answer).size !== c.answer.length)
    )
      error("Ordering needs at least two distinct steps.");
    if (new Set(c.answer).size !== c.answer.length && c.type === "multi")
      error("Remove duplicate correct answers.");
  });
export const settingsSchema = z.object({
  displayName: z.string().trim().max(60),
  theme: z.enum(["light", "dark", "system"]),
  dailyGoal: z.number().int().min(1).max(500),
  xpGoal: z.number().int().min(10).max(5000),
  newLimit: z.number().int().min(0).max(200),
  reviewLimit: z.number().int().min(1).max(1000),
  reducedMotion: z.boolean(),
  sound: z.boolean(),
  hideStreak: z.boolean(),
  keyboard: z.boolean(),
  randomize: z.boolean(),
  autoAdvance: z.boolean(),
  aiEnabled: z.boolean(),
  language: z.enum(["English", "Filipino"]),
  onboarded: z.boolean(),
});
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function check(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new HttpError(status, message);
}
