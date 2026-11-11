"use client";
import { useState } from "react";
import {
  Plus,
  Upload,
  Search,
  BookOpen,
  Layers,
  Star,
  Archive,
  MoreHorizontal,
  ArrowLeft,
  Play,
  Pencil,
  Copy,
  Trash2,
  Download,
  FolderPlus,
  Check,
  SlidersHorizontal,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import type { AppActions } from "./app";
import { DeckTile } from "./app";
import {
  Button,
  IconButton,
  Modal,
  Field,
  Empty,
  Progress,
  SectionTitle,
} from "./ui";
import { api, request, download } from "../lib/client";
import { colors, type Deck, type Subject, cardTypes } from "../lib/types";
export function SubjectDialog({
  a,
  onClose,
  subject,
}: {
  a: AppActions;
  onClose: () => void;
  subject?: Subject;
}) {
  const [name, setName] = useState(subject?.name || ""),
    [color, setColor] = useState(subject?.color || colors[0]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title={subject ? "Edit subject" : "Create subject"}
      description="Keep related decks together in a subject."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("subject", { id: subject?.id, name, color });
            await a.reload();
            onClose();
            a.toast(
              subject ? "Subject updated." : "Your new subject is ready.",
            );
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Subject name">
          <input
            autoFocus
            required
            maxLength={200}
            placeholder="e.g. Filipino"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <ColorPicker color={color} setColor={setColor} />
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy}>
            {subject ? "Save subject" : "Create subject"}
            <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function ColorPicker({
  color,
  setColor,
}: {
  color: string;
  setColor: (s: string) => void;
}) {
  return (
    <div className="field">
      <span>Color</span>
      <div className="color-picker">
        {colors.map((c, index) => (
          <button
            type="button"
            key={c}
            aria-label={`Choose ${["slate blue", "teal", "amber", "coral", "sage", "plum"][index]} color`}
            title={["Slate blue", "Teal", "Amber", "Coral", "Sage", "Plum"][index]}
            aria-pressed={c === color}
            onClick={() => setColor(c)}
            style={{ "--swatch-color": c } as React.CSSProperties}
          >
            <span className="color-swatch">
              {c === color && <Check size={18} aria-hidden="true" />}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
export function DeckDialog({
  a,
  onClose,
  onSaved,
  deck,
}: {
  a: AppActions;
  onClose: () => void;
  onSaved?: (id: string) => void;
  deck?: Deck;
}) {
  const [title, setTitle] = useState(deck?.title || ""),
    [description, setDescription] = useState(deck?.description || ""),
    [subject, setSubject] = useState(
      deck?.subjectId || a.data.subjects[0]?.id || "",
    ),
    [newSubject, setNewSubject] = useState(""),
    [folder, setFolder] = useState(deck?.folderId || ""),
    [tags, setTags] = useState(deck?.tags.join(", ") || ""),
    [color, setColor] = useState(deck?.color || colors[0]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Modal
      title={deck ? "Edit deck" : "Create deck"}
      description="Choose a subject and add the cards you want to study."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            let sid = subject;
            if (!sid || sid === "new") {
              const s = await api("subject", { name: newSubject, color });
              sid = s.id;
            }
            const d = await api("deck", {
              id: deck?.id,
              title,
              description,
              subjectId: sid,
              folderId: folder || null,
              tags: tags
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              color,
            });
            await a.reload();
            onSaved ? onSaved(d.id) : onClose();
            a.toast(deck ? "Deck updated." : "A fresh deck. A fresh start.");
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Deck title">
          <input
            autoFocus
            placeholder="e.g. Vocabulary"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Description (optional)">
          <textarea
            rows={2}
            placeholder="What are we learning?"
            value={description}
            maxLength={4000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <div className="form-grid">
          <Field label="Subject">
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setFolder("");
              }}
            >
              <option value="">Create a new subject…</option>
              {a.data.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value="new">+ New subject</option>
            </select>
          </Field>
          <Field label="Folder (optional)">
            <select value={folder} onChange={(e) => setFolder(e.target.value)}>
              <option value="">No folder</option>
              {a.data.folders
                .filter((f) => f.subjectId === subject)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        {(!subject || subject === "new") && (
          <Field label="New subject name">
            <input
              required
              placeholder="e.g. Filipino"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
            />
          </Field>
        )}
        <Field label="Tags (optional)">
          <input
            placeholder="vocabulary, quarter 1"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </Field>
        <ColorPicker color={color} setColor={setColor} />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button busy={busy}>
            {deck ? "Save changes" : "Create deck"}
            <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export default function Library({
  a,
  route,
}: {
  a: AppActions;
  route: string;
}) {
  const [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("recent"),
    [reviewFilter, setReviewFilter] = useState("all"),
    [selected, setSelected] = useState<string[]>([]),
    [edit, setEdit] = useState<Deck | null>(null),
    [subjectEdit, setSubjectEdit] = useState<Subject | null>(null),
    [confirm, setConfirm] = useState<any>(null),
    [confirmation, setConfirmation] = useState(""),
    [target, setTarget] = useState(""),
    [recovery, setRecovery] = useState<any[] | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [folder, setFolder] = useState(false),
    [folderName, setFolderName] = useState(""),
    [folderSubject, setFolderSubject] = useState(a.data.subjects[0]?.id || "");
  const d = a.data,
    deck = route.startsWith("deck/")
      ? d.decks.find((x) => x.id === route.split("/")[1])
      : undefined;
  const subjectId = route.startsWith("library/") ? route.split("/")[1] : "";
  const mutate = async (operation: string, ids: string[], extra: any = {}) => {
    setBusy(true);
    setError("");
    try {
      const r = await api("decks", { operation, ids, ...extra });
      await a.reload();
      setSelected([]);
      setConfirm(null);
      setConfirmation("");
      a.toast(
        r.imagesOmitted
          ? "Deck copied. Image cards need the original images and were omitted."
          : "Library updated.",
      );
      if (operation === "delete" && deck) a.go("library");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const exportDeck = (id: string) =>
    download("recallforge-deck.json", {
      format: "recallforge-deck",
      version: 1,
      deck: d.decks.find((x) => x.id === id),
      cards: d.cards
        .filter((c) => c.deckId === id)
        .map(({ review, mastery, ...c }) => c),
      reviewHistoryIncluded: false,
      attachmentsIncluded: false,
    });
  let filtered = d.decks.filter(
    (x) =>
      (filter === "archived" ? x.archived : !x.archived) &&
      (filter !== "favorites" || x.favorite) &&
      (!subjectId || x.subjectId === subjectId) &&
      (!search ||
        [
          x.title,
          x.description,
          x.tags.join(" "),
          d.subjects.find((s) => s.id === x.subjectId)?.name || "",
          ...d.cards
            .filter((c) => c.deckId === x.id)
            .map((c) => c.front + " " + c.answer.join(" ")),
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (reviewFilter !== "due" || x.due > 0) &&
      (reviewFilter !== "mastered" || x.mastery >= 80),
  );
  filtered.sort((a, b) =>
    sort === "name"
      ? a.title.localeCompare(b.title)
      : sort === "cards"
        ? b.count - a.count
        : sort === "due"
          ? b.due - a.due
          : (b.lastStudied || b.created) - (a.lastStudied || a.created),
  );
  const selectedSubject = d.subjects.find((s) => s.id === subjectId);
  const start = async () => {
    try {
      const s = await api("start", {
        id: crypto.randomUUID(),
        mode: "memorise",
        deckIds: [deck!.id],
        filter: "all",
        count: Math.min(deck!.count, 200),
      });
      a.go(`session/${s.id}`);
    } catch (e: any) {
      a.toast(e.message);
    }
  };
  return (
    <>
      {deck ? (
        <>
          <button className="back-link" onClick={() => a.go("library")}>
            <ArrowLeft size={15} /> Back to library
          </button>
          <div className="page-heading">
            <div>
              <h1>{deck.title}</h1>
              <p>
                {deck.description ||
                  "Cards, sources, and review progress for this deck."}
              </p>
            </div>
            <div className="heading-actions">
              <IconButton label="Edit deck" onClick={() => setEdit(deck)}>
                <Pencil size={18} />
              </IconButton>
              <IconButton
                label="Export deck"
                onClick={() => exportDeck(deck.id)}
              >
                <Download size={18} />
              </IconButton>
              <Button variant="secondary" onClick={() => a.importDeck(deck.id)}>
                <Upload size={16} /> Import
              </Button>
              <Button disabled={!deck.count || deck.archived} onClick={start}>
                <Play size={17} /> Study this deck
              </Button>
            </div>
          </div>
          <div className="deck-summary">
            <span>
              <Layers size={17} />
              <b>{deck.count}</b> cards
            </span>
            <span>
              <ClockIcon />
              <b>{deck.due}</b> due for review
            </span>
            <span>
              <BookOpen size={17} />
              <b>{deck.mastery}%</b> estimated mastery
            </span>
            <div>
              <Progress value={deck.mastery} />
            </div>
          </div>
          <SectionTitle
            title="Your flashcards"
            subtitle="Edit a question, check its source, or add a new card."
          >
            <Button onClick={() => a.editCard(undefined, deck.id)}>
              <Plus size={17} /> Add a card
            </Button>
          </SectionTitle>
          <div className="card-list">
            {d.cards
              .filter((c) => c.deckId === deck.id)
              .map((c, i) => (
                <article className="library-card" key={c.id}>
                  <span className="card-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="library-card-text">
                    <small>
                      {cardTypes[c.type]}{" "}
                      {c.review?.state !== "new" && c.review?.reviews
                        ? `· ${c.mastery}% mastery`
                        : ""}
                    </small>
                    <h3>{c.front}</h3>
                    <p>
                      {c.answer.join(" · ") ||
                        "Answers are marked in [brackets]."}
                    </p>
                  </div>
                  <div className="card-actions">
                    <IconButton
                      label={`Edit card ${i + 1}`}
                      onClick={() => a.editCard(c)}
                    >
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton
                      label={`Duplicate card ${i + 1}`}
                      onClick={async () => {
                        try {
                          await api("cards", {
                            ids: [c.id],
                            operation: "duplicate",
                          });
                          await a.reload();
                          a.toast("Card duplicated.");
                        } catch (e: any) {
                          a.toast(e.message);
                        }
                      }}
                    >
                      <Copy size={16} />
                    </IconButton>
                    <IconButton
                      label={`Delete card ${i + 1}`}
                      onClick={() => {
                        setConfirm({ cards: [c.id] });
                        setConfirmation("");
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                  <label className="card-select">
                    <input
                      type="checkbox"
                      aria-label={`Select card ${i + 1}`}
                      checked={selected.includes(c.id)}
                      onChange={() =>
                        setSelected(
                          selected.includes(c.id)
                            ? selected.filter((x) => x !== c.id)
                            : [...selected, c.id],
                        )
                      }
                    />
                  </label>
                </article>
              ))}
          </div>
          {!deck.count && (
            <Empty
              title="Add your first card"
              action={
                <Button onClick={() => a.editCard(undefined, deck.id)}>
                  <Plus size={17} /> Add your first card
                </Button>
              }
            >
              Write a question and its answer, or import cards from your notes.
            </Empty>
          )}
          {selected.length > 0 && (
            <div className="bulk-bar">
              <b>{selected.length} selected</b>
              <Button
                variant="secondary"
                onClick={() => setConfirm({ move: true, cards: selected })}
              >
                Move to deck
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirm({ cards: selected })}
              >
                Delete
              </Button>
              <IconButton
                label="Clear selection"
                onClick={() => setSelected([])}
              >
                <XIcon />
              </IconButton>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="page-heading">
            <div>
              <h1>{selectedSubject ? selectedSubject.name : "My library"}</h1>
              <p>Organize your subjects, decks, and review material.</p>
            </div>
            <div className="heading-actions">
              {selectedSubject && (
                <IconButton
                  label="Rename subject"
                  onClick={() => setSubjectEdit(selectedSubject)}
                >
                  <Pencil size={17} />
                </IconButton>
              )}
              <Button variant="secondary" onClick={() => a.importDeck()}>
                <Upload size={17} /> Smart Import
              </Button>
              <Button onClick={a.createDeck}>
                <Plus size={18} /> Create a deck
              </Button>
            </div>
          </div>
          <div className="library-layout">
            <aside className="library-subjects">
              <div className="section-title">
                <h3>Subjects</h3>
                <IconButton label="Create subject" onClick={a.createSubject}>
                  <Plus size={15} />
                </IconButton>
              </div>
              <a href="#library" className={!subjectId ? "active" : ""}>
                <BookOpen size={16} /> All subjects{" "}
                <b>{d.decks.filter((d) => !d.archived).length}</b>
              </a>
              {d.subjects.map((s) => (
                <a
                  href={`#library/${s.id}`}
                  key={s.id}
                  className={s.id === subjectId ? "active" : ""}
                >
                  <i style={{ background: s.color }} />
                  {s.name}
                  <b>
                    {
                      d.decks.filter((d) => d.subjectId === s.id && !d.archived)
                        .length
                    }
                  </b>
                </a>
              ))}
              <button className="add-folder" onClick={() => setFolder(true)}>
                <FolderPlus size={15} /> New folder
              </button>
              {d.folders
                .filter((f) => !subjectId || f.subjectId === subjectId)
                .map((f) => (
                  <div key={f.id} className="folder-item">
                    <FolderPlus size={14} />
                    {f.name}
                    <small>
                      {d.decks.filter((x) => x.folderId === f.id).length}
                    </small>
                  </div>
                ))}
              <button
                className="recovery-link"
                onClick={async () => {
                  try {
                    setRecovery(await request("/api/app?recovery=1"));
                  } catch (e: any) {
                    a.toast(e.message);
                  }
                }}
              >
                <RotateCcw size={14} /> Deleted decks
              </button>
            </aside>
            <div className="library-content">
              <div className="library-toolbar">
                <div className="tabs">
                  {[
                    ["all", "All decks"],
                    ["favorites", "Favorites"],
                    ["archived", "Archived"],
                  ].map(([key, name]) => (
                    <button
                      key={key}
                      className={filter === key ? "active" : ""}
                      onClick={() => {
                        setFilter(key);
                        setSelected([]);
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <select
                  aria-label="Sort decks"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="recent">Most recent</option>
                  <option value="name">Name A–Z</option>
                  <option value="cards">Most cards</option>
                  <option value="due">Most due</option>
                </select>
              </div>
              <div className="library-filter">
                <div className="input-icon">
                  <Search size={16} />
                  <input
                    aria-label="Search cards and decks"
                    placeholder="Search decks, cards, or tags…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  aria-label="Filter review status"
                  value={reviewFilter}
                  onChange={(e) => setReviewFilter(e.target.value)}
                >
                  <option value="all">All progress</option>
                  <option value="due">Due for review</option>
                  <option value="mastered">80%+ mastery</option>
                </select>
              </div>
              <div className="deck-grid">
                {filtered.map((deck) => (
                  <DeckTile
                    key={deck.id}
                    a={a}
                    deck={deck}
                    actions={
                      <div className="deck-small-actions">
                        <label>
                          <input
                            aria-label={`Select ${deck.title}`}
                            type="checkbox"
                            checked={selected.includes(deck.id)}
                            onChange={() =>
                              setSelected(
                                selected.includes(deck.id)
                                  ? selected.filter((x) => x !== deck.id)
                                  : [...selected, deck.id],
                              )
                            }
                          />
                        </label>
                        <IconButton
                          label={
                            deck.favorite ? "Remove favorite" : "Favorite deck"
                          }
                          onClick={() => mutate("favorite", [deck.id])}
                        >
                          <Star
                            size={16}
                            fill={deck.favorite ? "currentColor" : "none"}
                          />
                        </IconButton>
                        <details className="deck-menu">
                          <summary aria-label={`Actions for ${deck.title}`}>
                            <MoreHorizontal size={19} />
                          </summary>
                          <div>
                            <button onClick={() => setEdit(deck)}>
                              <Pencil size={14} /> Edit deck
                            </button>
                            <button
                              onClick={() => mutate("duplicate", [deck.id])}
                            >
                              <Copy size={14} /> Duplicate
                            </button>
                            <button onClick={() => exportDeck(deck.id)}>
                              <Download size={14} /> Export cards
                            </button>
                            <button
                              onClick={() =>
                                mutate(deck.archived ? "restore" : "archive", [
                                  deck.id,
                                ])
                              }
                            >
                              <Archive size={14} />
                              {deck.archived ? "Restore deck" : "Archive"}
                            </button>
                            <button
                              onClick={() => {
                                setConfirm({ ids: [deck.id] });
                                setConfirmation("");
                              }}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </details>
                      </div>
                    }
                  />
                ))}
              </div>
              {!filtered.length && (
                <Empty
                  title={
                    filter === "archived"
                      ? "No archived chapters"
                      : filter === "favorites"
                        ? "Keep your favorites close"
                        : search
                          ? "No matching decks"
                          : "No decks yet"
                  }
                  action={
                    filter === "all" && !search ? (
                      <Button onClick={a.createDeck}>
                        <Plus size={17} /> Create your first deck
                      </Button>
                    ) : undefined
                  }
                >
                  {search
                    ? "Try a different word or filter."
                    : filter === "all"
                      ? "Collect what you’re learning. Your first deck starts here."
                      : "Your decks will appear here when you add them."}
                </Empty>
              )}
              {selected.length > 0 && (
                <div className="bulk-bar">
                  <b>{selected.length} selected</b>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      mutate(
                        filter === "archived" ? "restore" : "archive",
                        selected,
                      )
                    }
                  >
                    {filter === "archived" ? "Restore" : "Archive"}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setConfirm({ merge: true, ids: selected });
                      setTarget("");
                    }}
                  >
                    Merge into…
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setConfirm({ ids: selected })}
                  >
                    Delete
                  </Button>
                  <IconButton
                    label="Clear selection"
                    onClick={() => setSelected([])}
                  >
                    <XIcon />
                  </IconButton>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {edit && <DeckDialog a={a} deck={edit} onClose={() => setEdit(null)} />}
      {subjectEdit && (
        <SubjectDialog
          a={a}
          subject={subjectEdit}
          onClose={() => setSubjectEdit(null)}
        />
      )}
      {folder && (
        <Modal
          title="Create a folder"
          description="Give related decks a little more structure."
          onClose={() => setFolder(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("folder", {
                  name: folderName,
                  subjectId: folderSubject,
                });
                await a.reload();
                setFolder(false);
                a.toast("Folder created. Choose it when editing a deck.");
              } catch (e: any) {
                a.toast(e.message);
              }
            }}
          >
            <Field label="Folder name">
              <input
                required
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
              />
            </Field>
            <Field label="Subject">
              <select
                required
                value={folderSubject}
                onChange={(e) => setFolderSubject(e.target.value)}
              >
                <option value="">Choose a subject</option>
                {d.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="modal-actions">
              <Button>Create folder</Button>
            </div>
          </form>
        </Modal>
      )}
      {recovery && (
        <Modal
          title="Deleted decks"
          description="Deleted decks keep their cards and history until you erase all data."
          onClose={() => setRecovery(null)}
        >
          {recovery.length ? (
            recovery.map((r) => (
              <div className="recovery-row" key={r.id}>
                <span>{r.title}</span>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await mutate("recover", [r.id]);
                    setRecovery(recovery.filter((x) => x.id !== r.id));
                  }}
                >
                  Recover
                </Button>
              </div>
            ))
          ) : (
            <p className="muted">There are no deleted decks.</p>
          )}
        </Modal>
      )}
      {confirm && (
        <Modal
          title={
            confirm.merge
              ? "Merge selected decks"
              : confirm.move
                ? "Move selected cards"
                : "Ready to let these go?"
          }
          description={
            confirm.merge
              ? "Cards move to the destination. Source decks are archived."
              : confirm.move
                ? "Review history and schedules stay with each card."
                : confirm.cards
                  ? "Cards are removed from your library. Study history is retained."
                  : "Decks move to recovery. You can bring them back later."
          }
          onClose={() => {
            setConfirm(null);
            setConfirmation("");
          }}
        >
          {confirm.merge || confirm.move ? (
            <Field label="Destination deck">
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Choose a deck</option>
                {d.decks
                  .filter((x) => !x.archived && !confirm.ids?.includes(x.id))
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.title}
                    </option>
                  ))}
              </select>
            </Field>
          ) : (
            <Field label="Type DELETE to confirm">
              <input
                autoFocus
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </Field>
          )}
          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              busy={busy}
              variant={confirm.merge || confirm.move ? "" : "danger"}
              disabled={
                confirm.merge || confirm.move
                  ? !target
                  : confirmation !== "DELETE"
              }
              onClick={async () => {
                if (confirm.cards) {
                  setBusy(true);
                  try {
                    await api("cards", {
                      ids: confirm.cards,
                      operation: confirm.move ? "move" : "delete",
                      deckId: target,
                      confirmation,
                    });
                    await a.reload();
                    setSelected([]);
                    setConfirm(null);
                    a.toast("Cards updated.");
                  } catch (e: any) {
                    a.toast(e.message);
                  } finally {
                    setBusy(false);
                  }
                } else
                  await mutate(
                    confirm.merge ? "merge" : "delete",
                    confirm.ids,
                    { targetId: target, confirmation },
                  );
              }}
            >
              {confirm.merge
                ? "Merge decks"
                : confirm.move
                  ? "Move cards"
                  : "Delete"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function ClockIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function XIcon() {
  return <span aria-hidden="true">×</span>;
}
