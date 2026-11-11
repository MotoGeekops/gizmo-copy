"use client";
import { useState } from "react";
import {
  Upload,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Plus,
  Check,
  Scissors,
} from "lucide-react";
import type { AppActions } from "./app";
import { Modal, Button, Field, IconButton } from "./ui";
import { api } from "../lib/client";
import { type Card, blankCard } from "../lib/types";
import { extractFile, draftFromText } from "../lib/importers";
import { cardSchema } from "../server/validation";
export default function SmartImport({
  a,
  deckId,
  onClose,
}: {
  a: AppActions;
  deckId?: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1),
    [tab, setTab] = useState("paste"),
    [text, setText] = useState(""),
    [sourceName, setSourceName] = useState("Pasted notes"),
    [format, setFormat] = useState("text"),
    [count, setCount] = useState(10),
    [style, setStyle] = useState("Balanced"),
    [useAI, setUseAI] = useState(false),
    [cards, setCards] = useState<Card[]>([]),
    [parsed, setParsed] = useState<Card[] | null>(null),
    [destination, setDestination] = useState(
      deckId || a.data.decks.find((d) => !d.archived)?.id || "",
    ),
    [newTitle, setNewTitle] = useState(""),
    [subject, setSubject] = useState(a.data.subjects[0]?.id || ""),
    [newSubject, setNewSubject] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const close = () => {
    if (busy) return;
    if (
      (cards.length || text.trim()) &&
      !window.confirm(
        "Close Smart Import? Draft cards have not been added to your library.",
      )
    )
      return;
    onClose();
  };
  const generate = async () => {
    setBusy(true);
    setError("");
    try {
      if (useAI) {
        const r = await api("ai", {
          kind: "generate",
          source: text.slice(0, 50000),
          count,
          style,
          language: a.data.settings.language,
        });
        setCards(r.cards);
      } else
        setCards(parsed ? parsed.slice(0, count) : draftFromText(text, count));
      setStep(3);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      let id = destination;
      if (!id || id === "new") {
        let sid = subject;
        if (!sid) {
          const s = await api("subject", {
            name: newSubject,
            color: "#7765ed",
          });
          sid = s.id;
        }
        const d = await api("deck", {
          title: newTitle,
          subjectId: sid,
          color: "#7765ed",
        });
        id = d.id;
        setDestination(id);
      }
      const valid = cards.map((c) => cardSchema.parse({ ...c, deckId: id }));
      const r = await api("import", {
        deckId: id,
        cards: valid,
        source: { name: sourceName, format, excerpt: text.slice(0, 20000) },
      });
      await a.reload();
      onClose();
      a.go(`deck/${id}`);
      a.toast(`${r.added} reviewed cards added to your library.`);
    } catch (e: any) {
      setError(e.issues?.map((x: any) => x.message).join(" ") || e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title="Smart Import"
      description="Extract your notes, review the draft cards, then save them."
      onClose={close}
      wide
    >
      <p className="import-step">
        {step === 1
          ? "1. Choose material"
          : step === 2
            ? "2. Create draft cards"
            : "3. Review and save"}
      </p>
      {step === 1 && (
        <>
          <div className="import-tabs">
            <Button
              variant={tab === "paste" ? "" : "secondary"}
              onClick={() => setTab("paste")}
            >
              <FileText size={16} /> Paste text
            </Button>
            <Button
              variant={tab === "file" ? "" : "secondary"}
              onClick={() => setTab("file")}
            >
              <Upload size={16} /> Upload a file
            </Button>
          </div>
          {tab === "file" && (
            <label className="import-drop">
              <Upload size={27} />
              <strong>Choose study material</strong>
              <small>
                TXT, Markdown, CSV, TSV, JSON, text PDF, DOCX, or PPTX
                <br />
                Up to 12 MB · Files are extracted on your device.
              </small>
              <input
                aria-label="Study material file"
                type="file"
                accept=".txt,.md,.markdown,.csv,.tsv,.json,.pdf,.docx,.pptx"
                disabled={busy}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBusy(true);
                  setError("");
                  try {
                    const r = await extractFile(f);
                    setText(r.text);
                    setFormat(r.format);
                    setParsed(r.cards);
                    setSourceName(f.name);
                    if (r.cards) setCount(r.cards.length);
                    a.toast(
                      `Extracted ${r.text.length.toLocaleString()} characters from ${f.name}.`,
                    );
                  } catch (e: any) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </label>
          )}
          <Field
            label={
              tab === "file"
                ? "Extracted text · check and edit before continuing"
                : "Your study notes"
            }
            hint="The non-AI parser reads term: definition, question + tab + answer, and sentences with [blanks]."
          >
            <textarea
              rows={9}
              placeholder={
                "Malaya: Free\nPag-asa: Hope\nThe capital of the Philippines is [Manila]."
              }
              value={text}
              maxLength={300000}
              onChange={(e) => {
                setText(e.target.value);
                setParsed(null);
              }}
            />
          </Field>
          <p className="data-warning">
            {text.length.toLocaleString()} characters · No material is sent to
            an AI provider unless you choose AI generation in the next step.
          </p>
        </>
      )}
      {step === 2 && (
        <>
          <div className="import-source-label">
            <span>{sourceName}</span>
            <span>{text.length.toLocaleString()} characters</span>
          </div>
          <div className="import-source">{text}</div>
          <div className="import-options">
            <Field label="How would you like to make cards?">
              <select
                value={useAI ? "ai" : "parser"}
                onChange={(e) => setUseAI(e.target.value === "ai")}
              >
                <option value="parser">
                  Non-AI parser · explicit definitions & blanks
                </option>
                <option
                  value="ai"
                  disabled={!a.data.ai.available || !a.data.settings.aiEnabled}
                >
                  AI generation
                  {!a.data.ai.available
                    ? " · provider not configured"
                    : !a.data.settings.aiEnabled
                      ? " · enable in Settings"
                      : ""}
                </option>
              </select>
            </Field>
            <div className="form-grid">
              <Field label="Maximum draft cards">
                <input
                  type="number"
                  value={count}
                  min={1}
                  max={useAI ? 40 : 200}
                  onChange={(e) => setCount(+e.target.value)}
                />
              </Field>
              <Field label="Generation style">
                <select
                  value={style}
                  disabled={!useAI}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  {[
                    "Basic",
                    "Balanced",
                    "Detailed",
                    "Definitions",
                    "Concepts",
                    "Important facts",
                    "Vocabulary",
                    "Exam-style questions",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="data-warning">
              {useAI
                ? `Your notes will be sent to ${a.data.ai.provider}. Provider usage may cost money. Up to 10 requests per day. Every card needs your review.`
                : parsed
                  ? `${parsed.length} structured cards were found. The parser preserves your supplied questions and answers.`
                  : "This parser only uses explicit content from your notes. It does not invent new facts or infer definitions."}
            </p>
          </div>
        </>
      )}
      {step === 3 && (
        <>
          <div className="info-note">
            <Check size={14} style={{ display: "inline", marginRight: 7 }} />
            {cards.length} drafts ·{" "}
            {useAI
              ? "AI generated. Check each answer against the source."
              : "Created by the non-AI parser. Check each card before saving."}
          </div>
          {cards.map((c, i) => (
            <div className="import-draft" key={c.id}>
              <span>
                CARD {i + 1} ·{" "}
                {c.type === "cloze" ? "FILL IN THE BLANK" : "QUESTION & ANSWER"}
              </span>
              <IconButton
                label={`Remove draft ${i + 1}`}
                onClick={() => setCards(cards.filter((x) => x.id !== c.id))}
              >
                <Trash2 size={15} />
              </IconButton>
              <Field label="Question">
                <textarea
                  rows={2}
                  value={c.front}
                  onChange={(e) =>
                    setCards(
                      cards.map((x) =>
                        x.id === c.id ? { ...x, front: e.target.value } : x,
                      ),
                    )
                  }
                />
              </Field>
              {c.type !== "cloze" && (
                <Field label="Answer">
                  <textarea
                    rows={2}
                    value={c.answer.join("\n")}
                    onChange={(e) =>
                      setCards(
                        cards.map((x) =>
                          x.id === c.id
                            ? { ...x, answer: [e.target.value] }
                            : x,
                        ),
                      )
                    }
                  />
                </Field>
              )}
              <small>Source: {c.source || "Your imported material"}</small>
            </div>
          ))}
          <Field label="Save to deck">
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="">Create a new deck…</option>
              {a.data.decks
                .filter((d) => !d.archived)
                .map((d) => (
                  <option value={d.id} key={d.id}>
                    {d.title}
                  </option>
                ))}
              <option value="new">+ New deck</option>
            </select>
          </Field>
          {(!destination || destination === "new") && (
            <>
              <Field label="New deck title">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Deck title"
                />
              </Field>
              <Field label="Subject">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option value="">Create a subject…</option>
                  {a.data.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              {!subject && (
                <Field label="New subject name">
                  <input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="e.g. Filipino"
                  />
                </Field>
              )}
            </>
          )}
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        {step > 1 && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setError("");
              setStep(step - 1);
            }}
          >
            <ArrowLeft size={15} /> Back
          </Button>
        )}
        {step === 1 ? (
          <Button
            busy={busy}
            disabled={!text.trim()}
            onClick={() => setStep(2)}
          >
            Review your material <ArrowRight size={16} />
          </Button>
        ) : step === 2 ? (
          <Button busy={busy} onClick={generate}>
            {useAI ? <Sparkles size={16} /> : <Scissors size={16} />} Create
            draft cards
          </Button>
        ) : (
          <Button
            busy={busy}
            disabled={
              !cards.length ||
              ((!destination || destination === "new") &&
                (!newTitle || (!subject && !newSubject)))
            }
            onClick={save}
          >
            Add {cards.length} reviewed cards <Check size={16} />
          </Button>
        )}
      </div>
    </Modal>
  );
}
