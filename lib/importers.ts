import { blankCard, type Card } from "./types";
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (!field || quoted) quoted = !quoted;
      else field += c;
    } else if (c === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted)
    throw new Error(
      "CSV contains an unclosed quoted field. Check the file and try again.",
    );
  row.push(field);
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function draftFromText(text: string, count = 20): Card[] {
  const cards: Card[] = [];
  const seen = new Set<string>();
  let location='';
  for (const raw of text.split("\n")) {
    const line = raw.replace(/^\s*[-*]\s+/, "").trim();
    if (!line || line.startsWith("#")) continue;
    if(/^\[(Page|Slide) \d+\]$/.test(line)){location=line;continue;}
    let front = "",
      answer = "";
    if (/\[[^\]]+\]/.test(line)) {
      const c = {
        ...blankCard("draft"),
        type: "cloze" as const,
        front: line,
        source: [location,line].filter(Boolean).join(' '),
      };
      if (!seen.has(line.toLowerCase())) {
        cards.push(c);
        seen.add(line.toLowerCase());
      }
      continue;
    }
    const tab = line.indexOf("\t"),
      sep = line.indexOf(" => "),
      colon = line.indexOf(":");
    let pos = tab >= 0 ? tab : sep >= 0 ? sep : colon;
    const length = tab >= 0 ? 1 : sep >= 0 ? 4 : 1;
    if (pos > 0) {
      front = line.slice(0, pos).trim();
      answer = line.slice(pos + length).trim();
    }
    if (front && answer && !seen.has(front.toLowerCase())) {
      cards.push({
        ...blankCard("draft"),
        front: front.endsWith("?") ? front : `What does “${front}” mean?`,
        answer: [answer],
        source: [location,line].filter(Boolean).join(' '),
      });
      seen.add(front.toLowerCase());
    }
    if (cards.length >= count) break;
  }
  if (!cards.length)
    throw new Error(
      "The non-AI parser needs question + tab + answer, term: definition, or a sentence with [blanks]. Reformat a few lines, or use AI generation after configuring a provider.",
    );
  return cards.slice(0, count);
}
export function draftFromFileText(text: string, format: string): Card[] | null {
  if (format === "csv" || format === "tsv") {
    const rows =
      format === "tsv"
        ? text
            .split(/\r?\n/)
            .filter(Boolean)
            .map((r) => r.split("\t"))
        : parseCSV(text);
    if (!rows.length) throw new Error("This file is empty.");
    const header = rows[0].map((x) => x.trim().toLowerCase());
    const fi = header.findIndex((x) =>
        ["front", "question", "term"].includes(x),
      ),
      bi = header.findIndex((x) =>
        ["back", "answer", "definition"].includes(x),
      );
    const skip = fi >= 0 && bi >= 0;
    const typeCol = header.indexOf("type");
    return rows
      .slice(skip ? 1 : 0)
      .filter((r) => r[skip ? fi : 0]?.trim() && r[skip ? bi : 1]?.trim())
      .map(
        (r) =>
          ({
            ...blankCard("draft"),
            front: r[skip ? fi : 0].trim(),
            answer: [r[skip ? bi : 1].trim()],
            source: "Imported text export",
            type:
              skip && typeCol >= 0 && r[typeCol] === "cloze" ? "cloze" : "qa",
          }) as Card,
      );
  }
  if (format === "json") {
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("This JSON file is not valid.");
    }
    if (data.format === "recallforge-backup")
      throw new Error(
        "This is a complete backup. Use Settings → Restore backup to preserve its history and review schedules.",
      );
    const raw = Array.isArray(data) ? data : data.cards;
    if (!Array.isArray(raw))
      throw new Error(
        "JSON must contain a cards array or a RecallForge deck export.",
      );
    if (raw.length > 200) throw new Error("Import up to 200 cards at a time.");
    return raw.map((c: any) => {
      if (c.type === "image")
        throw new Error(
          "Image card exports need the original images. Add these images in the card editor.",
        );
      return {
        ...blankCard("draft"),
        ...c,
        id: crypto.randomUUID(),
        deckId: "draft",
        front: c.front || c.question || "",
        answer: Array.isArray(c.answer) ? c.answer : [c.answer || c.back || ""],
        review: undefined,
        mastery: 0,
        mediaId: undefined,
      };
    });
  }
  return null;
}
export async function extractFile(
  file: File,
): Promise<{ text: string; format: string; cards: Card[] | null }> {
  if (file.size > 12_000_000)
    throw new Error(
      "Choose a file under 12 MB. Split larger documents into smaller sections.",
    );
  const format = file.name.split(".").pop()?.toLowerCase() || "";
  if (["txt", "md", "markdown", "csv", "tsv", "json"].includes(format)) {
    const text = await file.text();
    if (text.length > 300000)
      throw new Error("Import up to 300,000 characters at a time.");
    return { text, format, cards: draftFromFileText(text, format) };
  }
  if (format === "pdf") {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const task = pdfjs.getDocument({
      data: new Uint8Array(await file.arrayBuffer()),
      useSystemFonts: true,
    });
    const pdf = await task.promise;
    try {
      if (pdf.numPages > 100)
        throw new Error("Import up to 100 PDF pages at a time.");
      const pages: string[] = [];
      let length = 0;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        let text = "";
        for (const item of content.items as any[]) {
          if ("str" in item) text += item.str + (item.hasEOL ? "\n" : " ");
        }
        pages.push(`[Page ${i}]\n${text}`);
        length += text.length;
        if (length > 300000)
          throw new Error(
            "This PDF has too much text. Import a smaller section.",
          );
      }
      const text = pages.join("\n\n");
      if (text.replace(/\[Page \d+\]/g, "").trim().length < 10)
        throw new Error(
          "This PDF has no extractable text. Use OCR first, then paste the recognized text.",
        );
      return { text, format, cards: null };
    } finally {
      await task.destroy();
    }
  }
  if (format === "docx" || format === "pptx") {
    const { Unzip, UnzipInflate } = await import("fflate");
    const extracted: { name: string; text: string }[] = [];
    let total = 0,
      failed: Error | undefined;
    const unzip = new Unzip((file) => {
      const accept =
        format === "docx"
          ? file.name === "word/document.xml"
          : /^ppt\/slides\/slide\d+\.xml$/.test(file.name);
      if (!accept) {
        file.terminate();
        return;
      }
      if ((file.originalSize || 0) > 5_000_000) {
        failed = new Error(
          "A document section exceeds the 5 MB extraction limit.",
        );
        file.terminate();
        return;
      }
      const chunks: Uint8Array[] = [];
      file.ondata = (err, data, final) => {
        if (err) {
          failed = err;
          file.terminate();
          return;
        }
        total += data.length;
        if (total > 15_000_000) {
          failed = new Error(
            "The expanded document exceeds the safe extraction limit.",
          );
          file.terminate();
          return;
        }
        chunks.push(data);
        if (final) {
          const length = chunks.reduce((s, c) => s + c.length, 0),
            bytes = new Uint8Array(length);
          let at = 0;
          for (const c of chunks) {
            bytes.set(c, at);
            at += c.length;
          }
          const xml = new DOMParser().parseFromString(
            new TextDecoder().decode(bytes),
            "application/xml",
          );
          if (xml.getElementsByTagName("parsererror").length) {
            failed = new Error("The document contains malformed XML.");
            return;
          }
          const text = Array.from(xml.getElementsByTagNameNS("*", "p"))
            .map((p) =>
              Array.from(p.getElementsByTagNameNS("*", "t"))
                .map((t) => t.textContent || "")
                .join(""),
            )
            .filter(Boolean)
            .join("\n");
          extracted.push({ name: file.name, text });
        }
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    unzip.push(new Uint8Array(await file.arrayBuffer()), true);
    if (failed) throw failed;
    extracted.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    );
    const text = extracted
      .map((e, i) =>
        format === "pptx" ? `[Slide ${i + 1}]\n${e.text}` : e.text,
      )
      .join("\n\n");
    if (!text.trim())
      throw new Error(
        "No readable text was found. Export the document as plain text and try again.",
      );
    if (text.length > 300000)
      throw new Error(
        "The extracted document is too long. Import a smaller section.",
      );
    return { text, format, cards: null };
  }
  throw new Error(
    `.${format || "unknown"} files are not supported. Use TXT, Markdown, CSV, TSV, JSON, a text PDF, DOCX, or PPTX. Image OCR, audio, URLs, and Anki packages are not available.`,
  );
}
