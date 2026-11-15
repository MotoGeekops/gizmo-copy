/**
 * AI provider resolution shared by the AI endpoint and the app bootstrap.
 *
 * Supported runtime variables:
 *   AI_PROVIDER         optional: "gemini" | "openrouter" (forces a provider)
 *   GEMINI_API_KEY      Gemini secret
 *   OPENROUTER_API_KEY  OpenRouter secret
 *   AI_MODEL            optional model override for the active provider
 *   GEMINI_MODEL        optional Gemini-specific model (wins over AI_MODEL)
 *   OPENROUTER_MODEL    optional OpenRouter-specific model (wins over AI_MODEL)
 *   OPENROUTER_SITE_URL optional public URL sent as HTTP-Referer for attribution
 *   OPENROUTER_APP_NAME optional app title sent as X-Title (default RecallForge)
 *
 * Without AI_PROVIDER, Gemini is used when its key is present and OpenRouter
 * otherwise, which keeps the original behavior.
 */
export type AiProviderId = "gemini" | "openrouter";

export interface AiProviderConfig {
  id: AiProviderId;
  name: "Gemini" | "OpenRouter";
  key: string;
  model: string;
}

export const DEFAULT_MODELS: Record<AiProviderId, string> = {
  gemini: "gemini-2.5-flash",
  openrouter: "openrouter/auto",
};

// Gemini model names are inserted into a URL path, so keep them strict.
// OpenRouter slugs look like "vendor/model[:variant]" (e.g.
// "meta-llama/llama-3.3-70b-instruct:free") and are sent in the JSON body.
const MODEL_PATTERNS: Record<AiProviderId, RegExp> = {
  gemini: /^[a-zA-Z0-9._-]+$/,
  openrouter:
    /^~?[a-zA-Z0-9][a-zA-Z0-9._-]*(\/[a-zA-Z0-9][a-zA-Z0-9._-]*)*(:[a-zA-Z0-9._-]+)?$/,
};

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/**
 * Merges Worker bindings with process.env so variables set in the hosting
 * dashboard are found whichever way the platform exposes them.
 */
export function aiEnv(env: unknown): Record<string, unknown> {
  const proc =
    (globalThis as { process?: { env?: Record<string, unknown> } }).process
      ?.env || {};
  const out: Record<string, unknown> = {};
  for (const name of [
    "AI_PROVIDER",
    "AI_MODEL",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL",
    "OPENROUTER_SITE_URL",
    "OPENROUTER_APP_NAME",
  ]) {
    const v = (env as Record<string, unknown> | undefined)?.[name];
    out[name] = str(v) ? v : proc[name];
  }
  return out;
}

export function resolveAiProvider(env: unknown): AiProviderConfig | null {
  const e = aiEnv(env);
  const keys: Record<AiProviderId, string> = {
    gemini: str(e.GEMINI_API_KEY),
    openrouter: str(e.OPENROUTER_API_KEY),
  };
  const forced = str(e.AI_PROVIDER).toLowerCase();
  let id: AiProviderId | null = null;
  if (forced === "gemini" || forced === "openrouter")
    id = keys[forced] ? forced : null;
  else if (keys.gemini) id = "gemini";
  else if (keys.openrouter) id = "openrouter";
  if (!id) return null;
  const model =
    str(id === "gemini" ? e.GEMINI_MODEL : e.OPENROUTER_MODEL) ||
    str(e.AI_MODEL) ||
    DEFAULT_MODELS[id];
  return {
    id,
    name: id === "gemini" ? "Gemini" : "OpenRouter",
    key: keys[id],
    model,
  };
}

export function isValidModel(provider: AiProviderId, model: string) {
  return model.length <= 200 && MODEL_PATTERNS[provider].test(model);
}

/** Optional OpenRouter attribution headers (https://openrouter.ai/docs). */
export function openRouterHeaders(env: unknown): Record<string, string> {
  const e = aiEnv(env);
  const headers: Record<string, string> = {
    "X-Title": str(e.OPENROUTER_APP_NAME).slice(0, 100) || "RecallForge",
  };
  const site = str(e.OPENROUTER_SITE_URL);
  if (/^https?:\/\/[^\s]+$/.test(site)) headers["HTTP-Referer"] = site;
  return headers;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untrusted provider JSON
type Json = any;

/**
 * Pulls the assistant text out of an OpenAI-compatible (OpenRouter) chat
 * completion. Content may be a string or an array of typed parts.
 */
export function openRouterContent(data: Json): string | undefined {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content
      .map((p: Json) => (typeof p === "string" ? p : p?.text || ""))
      .join("");
  return undefined;
}

/** OpenRouter can report upstream failures inside an HTTP 200 body. */
export function openRouterError(data: Json): string | undefined {
  const err = data?.error || data?.choices?.[0]?.error;
  if (!err) return undefined;
  const msg = typeof err === "string" ? err : err.message;
  return typeof msg === "string" && msg ? msg.slice(0, 300) : "Unknown error";
}

/** Strips Markdown code fences / surrounding prose and parses a JSON object. */
export function parseJsonObject(content: string): Json {
  const text = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{"),
      end = text.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("No JSON object found");
    return JSON.parse(text.slice(start, end + 1));
  }
}
