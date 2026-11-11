import { env } from "cloudflare:workers";
import { getChatGPTUser } from "../../chatgpt-auth";
import { one, run, uid, init } from "../../../server/store";
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  const m = await one(
    "SELECT * FROM card_media WHERE id=? AND user_id=?",
    id,
    user.userId,
  );
  if (!m || !env.BUCKET)
    return new Response("Image unavailable", { status: 404 });
  const object = await env.BUCKET.get(m.object_key);
  if (!object)
    return new Response(
      "Image was not included in this backup. Upload the original again.",
      { status: 404 },
    );
  return new Response(object.body, {
    headers: {
      "Content-Type": m.mime,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user)
    return Response.json({ error: "Sign in required" }, { status: 401 });
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  )
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  if (!env.BUCKET)
    return Response.json(
      { error: "Image storage is unavailable." },
      { status: 503 },
    );
  if (Number(request.headers.get("content-length") || 0) > 5_500_000)
    return Response.json(
      { error: "Choose an image under 5 MB." },
      { status: 413 },
    );
  const form = await request.formData();
  const file = form.get("file");
  if (
    !(file instanceof File) ||
    file.size > 5_000_000 ||
    !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)
  )
    return Response.json(
      { error: "Use a PNG, JPEG, WebP, or GIF under 5 MB." },
      { status: 400 },
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPng =
    bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const isGif = new TextDecoder().decode(bytes.slice(0, 6)).startsWith("GIF8");
  const isWebp =
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (
    !(
      {
        "image/png": isPng,
        "image/jpeg": isJpeg,
        "image/gif": isGif,
        "image/webp": isWebp,
      } as any
    )[file.type]
  )
    return Response.json(
      { error: "The image does not match its file type." },
      { status: 400 },
    );
  await init(user.userId);
  const id = uid(),
    key = `${user.userId}/${id}`;
  await env.BUCKET.put(key, bytes, {
    httpMetadata: { contentType: file.type },
  });
  try {
    await run(
      "INSERT INTO card_media(id,user_id,object_key,mime,size,created) VALUES (?,?,?,?,?,?)",
      id,
      user.userId,
      key,
      file.type,
      file.size,
      Date.now(),
    );
  } catch {
    await env.BUCKET.delete(key);
    return Response.json(
      { error: "Image could not be saved. Try again." },
      { status: 500 },
    );
  }
  return Response.json({ id });
}
