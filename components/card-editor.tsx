"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  Check,
  Plus,
  Upload,
  Save,
  Eye,
  Loader2,
  Cloud,
  FileText,
} from "lucide-react";
import type { AppActions } from "./app";
import { type Card, type CardType, blankCard, cardTypes } from "../lib/types";
import { Button, Modal, Field } from "./ui";
import { api } from "../lib/client";
import { cardSchema } from "../server/validation";
import { RichText } from "./rich-text";
export function CardEditor({
  a,
  card,
  deckId,
  onClose,
}: {
  a: AppActions;
  card?: Card;
  deckId?: string;
  onClose: () => void;
}) {
  const initial =
    card ||
    blankCard(deckId || a.data.decks.find((d) => !d.archived)?.id || "");
  const [base, setBase] = useState(initial),
    [answerText, setAnswerText] = useState(initial.answer.join("\n")),
    [optionText, setOptionText] = useState(initial.options.join("\n")),
    [alternatives, setAlternatives] = useState(initial.alternatives.join("\n")),
    [pairs, setPairs] = useState(
      initial.options
        .map((x, i) => `${x} => ${initial.answer[i] || ""}`)
        .join("\n"),
    ),
    [tagText, setTagText] = useState(initial.tags.join(", ")),
    [error, setError] = useState(""),
    [status, setStatus] = useState(
      card ? "All changes saved" : "Draft saved on this device",
    ),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState(false),
    [tick, setTick] = useState(0),
    [restored, setRestored] = useState(false);
  const saved = useRef(card ? JSON.stringify({ ...card }) : ""),
    saving = useRef(false),
    latest = useRef<any>(null),
    lastDraft = useRef("");
  const draftKey = `recallforge:draft:${a.data.user.id}:${card?.id || `new:${initial.deckId}`}`;
  const lines = (s: string) =>
    s
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  const value = useMemo(() => {
    const c = {
      ...base,
      alternatives: lines(alternatives),
      options: lines(optionText),
      tags: tagText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    if (base.type === "matching") {
      const ps = lines(pairs).map((s) => s.split(/\s*=>\s*/));
      c.options = ps.map((p) => p[0] || "");
      c.answer = ps.map((p) => p.slice(1).join(" => "));
    } else if (base.type === "ordering") c.answer = lines(answerText);
    else if (["qa", "image"].includes(base.type))
      c.answer = answerText.trim() ? [answerText.trim()] : [];
    else if (base.type === "cloze") c.answer = [];
    return c;
  }, [base, answerText, optionText, alternatives, pairs, tagText]);
  latest.current = value;
  const signature = JSON.stringify(value);
  useEffect(() => {
    try {
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        const x = JSON.parse(draft);
        if (x.base?.id && (!card || x.base.id === initial.id)) {
          setBase(x.base);
          setAnswerText(x.answerText || "");
          setOptionText(x.optionText || "");
          setAlternatives(x.alternatives || "");
          setPairs(x.pairs || "");
          setTagText(x.tagText || "");
          setRestored(true);
        }
      }
    } catch {}
  }, []);
  const persist = async (announce = false) => {
    if (saving.current) return false;
    const current = latest.current;
    const valid = cardSchema.safeParse(current);
    if (!valid.success) {
      if (announce)
        setError(
          valid.error.issues
            .map((x) => x.message)
            .slice(0, 3)
            .join(" "),
        );
      return false;
    }
    const fingerprint = JSON.stringify(current);
    if (fingerprint === saved.current) return true;
    saving.current = true;
    setBusy(true);
    setStatus("Saving to your library…");
    setError("");
    try {
      await api("card", current);
      saved.current = fingerprint;
      setStatus(
        JSON.stringify(latest.current) === fingerprint
          ? "All changes saved"
          : "Saving your latest changes…",
      );
      if (JSON.stringify(latest.current) === fingerprint)
        localStorage.removeItem(draftKey);
      await a.reload();
      if (announce) a.toast("Card saved to your library.");
      return true;
    } catch (e: any) {
      setError(e.message);
      setStatus("Not synced · draft saved on this device");
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
      if (
        saved.current === fingerprint &&
        JSON.stringify(latest.current) !== fingerprint
      )
        setTick((t) => t + 1);
    }
  };
  useEffect(() => {
    if (signature === saved.current) return;
    try {
      const draft = JSON.stringify({
        base,
        answerText,
        optionText,
        alternatives,
        pairs,
        tagText,
      });
      localStorage.setItem(draftKey, draft);
      lastDraft.current = draft;
    } catch {
      setStatus("Draft could not be saved on this device");
    }
    if (!cardSchema.safeParse(value).success) {
      setStatus("Draft saved on this device · complete the required fields");
      return;
    }
    setStatus("Unsaved changes · autosave pending");
    const timer = setTimeout(() => persist(), 1200);
    return () => clearTimeout(timer);
  }, [signature, tick]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (
        JSON.stringify(latest.current) !== saved.current &&
        latest.current.front
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    addEventListener("beforeunload", guard);
    return () => removeEventListener("beforeunload", guard);
  }, []);
  const close = () => {
    if (saving.current) {
      a.toast("Your card is saving. Give it a moment.");
      return;
    }
    if (
      signature !== saved.current &&
      base.front &&
      !window.confirm(
        "This draft is not synced yet. Keep the device draft and close?",
      )
    )
      return;
    onClose();
  };
  const update = (x: Partial<Card>) => setBase((b) => ({ ...b, ...x }));
  const changeType = (type: CardType) => {
    update({ type, answer: type === "boolean" ? ["True"] : [] });
    setAnswerText("");
    setOptionText("");
    setPairs("");
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/media", {
        method: "POST",
        body: form,
      });
      const json = (await response.json()) as any;
      if (!response.ok) throw new Error(json.error);
      update({ mediaId: json.id });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={card ? "Edit card" : "Create card"}
      description="Cards autosave when complete. Incomplete drafts stay on this device."
      onClose={close}
      wide
    >
      <div className="editor-toolbar">
        <span className="save-status" aria-live="polite">
          {busy ? (
            <Loader2 size={14} className="spin" />
          ) : status === "All changes saved" ? (
            <Cloud size={14} />
          ) : (
            <FileText size={14} />
          )}{" "}
          {status}
        </span>
        <Button variant="ghost" onClick={() => setPreview(!preview)}>
          <Eye size={15} />
          {preview ? "Edit card" : "Preview"}
        </Button>
      </div>
      {restored && (
        <div className="info-note">
          Your unfinished device draft has been restored.
        </div>
      )}
      <div className="form-grid">
        <Field label="Deck">
          <select
            value={base.deckId}
            onChange={(e) => update({ deckId: e.target.value })}
          >
            <option value="">Choose a deck</option>
            {a.data.decks
              .filter((d) => !d.archived)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Card format">
          <select
            value={base.type}
            onChange={(e) => changeType(e.target.value as CardType)}
          >
            {Object.entries(cardTypes).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {preview ? (
        <div className="editor-preview">
          <small>FRONT</small>
          <RichText text={value.front} />
          <hr />
          <small>ANSWER</small>
          <RichText
            text={
              value.type === "cloze"
                ? [...value.front.matchAll(/\[([^\]]+)\]/g)]
                    .map((x) => x[1])
                    .join(" · ")
                : value.answer.join("\n")
            }
          />
          {value.explanation && <p>{value.explanation}</p>}
        </div>
      ) : (
        <>
          <Field
            label={
              base.type === "cloze"
                ? "Sentence with [hidden answers]"
                : "Question or prompt"
            }
            hint={
              base.type === "cloze"
                ? "Put each answer in [square brackets]. Multiple blanks are supported."
                : "Use **bold**, *italic*, - lists, and $LaTeX$ for math."
            }
          >
            <textarea
              autoFocus
              rows={3}
              value={base.front}
              maxLength={10000}
              placeholder={
                base.type === "cloze"
                  ? "The capital of the Philippines is [Manila]."
                  : "Write a clear question."
              }
              onChange={(e) => update({ front: e.target.value })}
            />
          </Field>
          {["qa", "image"].includes(base.type) && (
            <Field label="Correct answer">
              <textarea
                rows={2}
                value={answerText}
                placeholder="Write the correct answer."
                onChange={(e) => setAnswerText(e.target.value)}
              />
            </Field>
          )}
          {["choice", "multi"].includes(base.type) && (
            <>
              <Field
                label="Answer choices"
                hint="Write one distinct choice per line."
              >
                <textarea
                  rows={4}
                  value={optionText}
                  onChange={(e) => setOptionText(e.target.value)}
                  placeholder={"Option one\nOption two\nOption three"}
                />
              </Field>
              <Field
                label={
                  base.type === "multi"
                    ? "Select every correct answer"
                    : "Choose the correct answer"
                }
              >
                <div className="editor-choices">
                  {lines(optionText).map((o) => (
                    <label key={o}>
                      <input
                        type={base.type === "multi" ? "checkbox" : "radio"}
                        name="correct-answer"
                        checked={base.answer.includes(o)}
                        onChange={() =>
                          update({
                            answer:
                              base.type === "multi"
                                ? base.answer.includes(o)
                                  ? base.answer.filter((x) => x !== o)
                                  : [...base.answer, o]
                                : [o],
                          })
                        }
                      />
                      {o}
                    </label>
                  ))}
                </div>
              </Field>
            </>
          )}
          {base.type === "boolean" && (
            <Field label="Correct answer">
              <select
                value={base.answer[0] || "True"}
                onChange={(e) => update({ answer: [e.target.value] })}
              >
                <option>True</option>
                <option>False</option>
              </select>
            </Field>
          )}
          {base.type === "matching" && (
            <Field
              label="Matching pairs"
              hint="One pair per line, separated by =>. Right-hand answers must be distinct."
            >
              <textarea
                rows={5}
                value={pairs}
                onChange={(e) => setPairs(e.target.value)}
                placeholder={"Malaya => Free\nPag-asa => Hope"}
              />
            </Field>
          )}
          {base.type === "ordering" && (
            <Field
              label="Steps in the correct order"
              hint="Write one step per line. We shuffle them during study."
            >
              <textarea
                rows={5}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder={"First step\nSecond step\nThird step"}
              />
            </Field>
          )}
          {base.type === "image" && (
            <Field
              label="Study image"
              hint="PNG, JPEG, WebP, or GIF, up to 5 MB. Keep an original copy for backups."
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => upload(e.target.files?.[0])}
              />
              {base.mediaId && (
                <img
                  className="editor-image"
                  src={`/api/media?id=${base.mediaId}`}
                  alt="Uploaded study material"
                />
              )}
            </Field>
          )}
          <details className="editor-details">
            <summary>
              Hints and source details <Plus size={15} />
            </summary>
            <Field label="Hint (optional)">
              <input
                value={base.hint}
                onChange={(e) => update({ hint: e.target.value })}
                placeholder="Add a hint if needed"
              />
            </Field>
            <Field label="Explanation (optional)">
              <textarea
                rows={2}
                value={base.explanation}
                onChange={(e) => update({ explanation: e.target.value })}
              />
            </Field>
            {["qa", "image"].includes(base.type) && (
              <Field
                label="Other acceptable answers"
                hint="One alternative per line. Only explicit alternatives are accepted."
              >
                <textarea
                  rows={2}
                  value={alternatives}
                  onChange={(e) => setAlternatives(e.target.value)}
                />
              </Field>
            )}
            <Field label="Source or reference">
              <textarea
                rows={2}
                value={base.source}
                onChange={(e) => update({ source: e.target.value })}
                placeholder="Your notes, textbook page, or source excerpt"
              />
            </Field>
            <div className="form-grid">
              <Field label="Difficulty">
                <select
                  value={base.difficulty}
                  onChange={(e) =>
                    update({ difficulty: e.target.value as any })
                  }
                >
                  <option value="easy">Easy</option>
                  <option value="normal">Standard</option>
                  <option value="hard">Challenging</option>
                </select>
              </Field>
              <Field label="Tags">
                <input
                  value={tagText}
                  onChange={(e) => setTagText(e.target.value)}
                  placeholder="Separate with commas"
                />
              </Field>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={base.ignorePunctuation}
                onChange={(e) =>
                  update({ ignorePunctuation: e.target.checked })
                }
              />{" "}
              Ignore terminal punctuation when checking answers
            </label>
          </details>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <Button variant="secondary" onClick={close}>
          Close editor
        </Button>
        <Button busy={busy} onClick={() => persist(true)}>
          <Save size={16} /> Save card
        </Button>
      </div>
    </Modal>
  );
}
