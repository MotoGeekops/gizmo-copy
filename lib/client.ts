export async function request<T = any>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The server returned an unexpected response. Please try again.",
    );
  }
  if (!response.ok)
    throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}
export const api = <T = any>(action: string, data: unknown) =>
  request<T>("/api/app", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
export function download(name: string, value: unknown) {
  const blob = new Blob(
    [typeof value === "string" ? value : JSON.stringify(value, null, 2)],
    {
      type:
        typeof value === "string"
          ? "text/csv;charset=utf-8"
          : "application/json",
    },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
