import { getChatGPTUser } from "../../chatgpt-auth";
import {
  bootstrap,
  init,
  one,
  run,
  all,
  owned,
  saveCard,
  saveSettings,
  startSession,
  getSession,
  answerSession,
  finishSession,
  shuffleSession,
  db,
  stmt,
  uid,
} from "../../../server/store";
import {
  subjectAction,
  folderAction,
  deckAction,
  mutateDecks,
  mutateCards,
  insertCards,
  sampleAction,
  examAction,
} from "../../../server/library";
import { exportData, restoreData, deleteAll } from "../../../server/backup";
import { aiAction } from "../../../server/ai";
import { check, HttpError } from "../../../server/validation";
import { z } from "zod";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
async function user() {
  const u = await getChatGPTUser();
  check(u, "Sign in with ChatGPT to open your private study library.", 401);
  return u!;
}
function failure(e: any) {
  if (e instanceof z.ZodError)
    return Response.json(
      {
        error: e.issues
          .map((x: any) => x.message)
          .slice(0, 4)
          .join(" "),
      },
      { status: 400, headers },
    );
  if (e instanceof HttpError)
    return Response.json({ error: e.message }, { status: e.status, headers });
  console.error(
    "RecallForge request failed",
    e instanceof Error ? e.name : "Unknown error",
  );
  return Response.json(
    {
      error:
        "The database could not finish this request. Your last saved data is safe. Try again.",
    },
    { status: 500, headers },
  );
}
export async function GET(request: Request) {
  try {
    const u = await user();
    const url = new URL(request.url);
    if (url.searchParams.has("session"))
      return Response.json(
        await getSession(u.userId, url.searchParams.get("session")!),
        { headers },
      );
    if (url.searchParams.has("backup"))
      return Response.json(await exportData(u.userId), {
        headers: {
          ...headers,
          "Content-Disposition":
            'attachment; filename="recallforge-backup.json"',
        },
      });
    if (url.searchParams.has("recovery"))
      return Response.json(
        await all(
          "SELECT id,title FROM decks WHERE user_id=? AND deleted=1",
          u.userId,
        ),
        { headers },
      );
    return Response.json(await bootstrap(u), { headers });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const u = await user();
    const origin = request.headers.get("origin");
    check(
      !origin || origin === new URL(request.url).origin,
      "This request came from another website.",
      403,
    );
    check(
      Number(request.headers.get("content-length") || 0) <= 20_000_000,
      "This request is too large.",
      413,
    );
    const text = await request.text();
    check(text.length <= 20_000_000, "This request is too large.", 413);
    let b: any;
    try {
      b = JSON.parse(text);
    } catch {
      throw new HttpError(400, "Request must contain valid JSON.");
    }
    check(b && typeof b.action === "string", "Choose a valid action.");
    await init(u.userId);
    const id = u.userId;
    let result: any;
    switch (b.action) {
      case "subject":
        result = await subjectAction(id, b.data);
        break;
      case "folder":
        result = await folderAction(id, b.data);
        break;
      case "deck":
        result = await deckAction(id, b.data);
        break;
      case "decks":
        result = await mutateDecks(id, b.data);
        break;
      case "card":
        result = await saveCard(id, b.data);
        break;
      case "cards":
        result = await mutateCards(id, b.data);
        break;
      case "settings":
        result = await saveSettings(id, b.data);
        break;
      case "sample":
        result = await sampleAction(id, b.data);
        break;
      case "start":
        result = await startSession(id, b.data);
        break;
      case "answer":
        result = await answerSession(id, b.data);
        break;
      case "finish":
        result = await finishSession(
          id,
          z.string().min(1).max(100).parse(b.data?.id),
        );
        break;
      case "shuffle":
        result = await shuffleSession(
          id,
          z.string().min(1).max(100).parse(b.data?.id),
        );
        break;
      case "import": {
        const p = z
          .object({
            deckId: z.string().min(1).max(100),
            cards: z.array(z.unknown()).min(1).max(200),
            source: z
              .object({
                name: z.string().max(200),
                format: z.string().max(30),
                excerpt: z.string().max(20000),
              })
              .optional(),
          })
          .parse(b.data);
        result = await insertCards(id, p.deckId, p.cards, p.source);
        break;
      }
      case "exam":
        result = await examAction(id, b.data);
        break;
      case "deleteExam": {
        const e = await owned("exams", b.data.id, id);
        await run("DELETE FROM exams WHERE id=? AND user_id=?", e.id, id);
        result = { deleted: true };
        break;
      }
      case "goal": {
        const p = z
          .object({
            id: z.string().max(100).optional(),
            examId: z.string().max(100).nullable().optional(),
            day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            target: z.number().int().min(1).max(500),
            done: z.boolean().default(false),
          })
          .parse(b.data);
        if (p.examId) await owned("exams", p.examId, id);
        if (p.id)
          check(
            await one(
              "SELECT id FROM study_goals WHERE id=? AND user_id=?",
              p.id,
              id,
            ),
            "Plan item not found.",
            404,
          );
        const key = p.id || uid();
        await run(
          "INSERT INTO study_goals(id,user_id,exam_id,day,target,done) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET day=excluded.day,target=excluded.target,done=excluded.done",
          key,
          id,
          p.examId || null,
          p.day,
          p.target,
          +p.done,
        );
        result = { id: key };
        break;
      }
      case "ai":
        result = await aiAction(id, b.data);
        break;
      case "restore":
        result = await restoreData(id, b.data);
        break;
      case "deleteAll":
        result = await deleteAll(id, b.data.confirmation);
        break;
      default:
        throw new HttpError(400, "This action is not supported.");
    }
    return Response.json(result, { headers });
  } catch (e) {
    return failure(e);
  }
}
