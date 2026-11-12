"use client";

import { useRef, useState } from "react";
import { BookOpen, ChevronRight, Plus, Play, Upload } from "lucide-react";
import type { AppActions } from "./app";
import { Button } from "./ui";
import { api } from "../lib/client";
import { uid } from "../lib/types";

export default function Dashboard({ a }: { a: AppActions }) {
  const d = a.data;
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const starting = useRef(false);
  const decks = d.decks.filter((deck) => !deck.archived);
  const activeIds = new Set(decks.map((deck) => deck.id));
  const cards = d.cards.filter((card) => activeIds.has(card.deckId));
  const saved = [...d.sessions].filter((s) => !s.ended).sort((a, b) => b.started - a.started)[0];
  const recent = [...decks].sort((a, b) => (b.lastStudied || b.created) - (a.lastStudied || a.created)).slice(0, 5);
  const start = async (deckId?: string) => {
    if (starting.current) return;
    starting.current = true;
    setBusy(true);
    setError("");
    try {
      const selected = deckId ? cards.filter((card) => card.deckId === deckId) : cards;
      const session = await api("start", {
        id: uid(), mode: "memorise",
        filter: selected.some((card) => !card.review?.reviews || card.review.due <= Date.now()) ? "due" : "all",
        deckIds: deckId ? [deckId] : [], count: Math.min(200, d.settings.dailyGoal),
      });
      await a.reload();
      a.go(`session/${session.id}`);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); starting.current = false; }
  };
  const sample = async () => {
    if (starting.current) return;
    starting.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api("sample", { index: 0 });
      await a.reload();
      a.go(`deck/${result.id}`);
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); starting.current = false; }
  };
  return (
    <div className="study-landing">
      <section className="study-invitation" aria-label="Start studying">
        <h1>{saved ? "Pick up where you left off." : cards.length ? "Let’s study." : "What are you studying?"}</h1>
        <p>{saved
          ? `${Math.min(saved.cursor, saved.total)} of ${saved.total} cards completed. Your place is saved.`
          : cards.length ? "One question at a time. We’ll take care of what comes next."
          : decks.length ? "Add a few questions to your deck to get started."
          : "Add your notes and turn them into cards you can practise."}</p>
        <Button className="study-start" busy={busy} onClick={() => {
          if (saved) a.go(`session/${saved.id}`);
          else if (cards.length) start();
          else if (decks.length) a.editCard(undefined, decks[0].id);
          else a.importDeck();
        }}>
          {cards.length || saved ? <Play size={17} fill="currentColor" /> : <Plus size={18} />}
          {saved ? "Continue studying" : cards.length ? "Start studying" : decks.length ? "Add your first card" : "Import your notes"}
        </Button>
        {saved && cards.length > 0 && <button className="quiet-link new-session" disabled={busy} onClick={() => start()}>Start a new session</button>}
        {!cards.length && !decks.length && !saved && <>
          <button className="quiet-link new-session" onClick={a.createDeck}>Create a deck instead</button>
          <details className="study-sample">
            <summary>Try a sample first</summary>
            <p>Five Filipino vocabulary cards to see how studying works.</p>
            <Button variant="secondary" busy={busy} onClick={sample}>Add sample deck</Button>
          </details>
        </>}
      </section>
      {error && <p className="error" role="alert">{error} <a className="quiet-link" href="#study-options">Adjust study options</a></p>}
      {decks.length > 0 && <section className="study-decks" aria-labelledby="study-decks-heading">
        <div className="study-decks-heading">
          <h2 id="study-decks-heading">Your decks</h2>
          <AddMaterial a={a} />
        </div>
        <div className="study-deck-list">
          {recent.map((deck) => <div className="study-deck-row" key={deck.id}>
            <a className="study-deck-open" href={`#deck/${deck.id}`}>
              <span className="study-deck-mark" style={{ "--deck-color": deck.color } as React.CSSProperties}><BookOpen size={20} /></span>
              <span className="study-deck-title"><strong>{deck.title}</strong><small>
                {d.subjects.find((s) => s.id === deck.subjectId)?.name}{" · "}{deck.count} {deck.count === 1 ? "card" : "cards"}
              </small></span>
            </a>
            {deck.count ? <button className="quiet-link deck-study" aria-label={`Study ${deck.title}`} disabled={busy} onClick={() => start(deck.id)}>
              Study <ChevronRight size={16} />
            </button> : <a className="quiet-link deck-study" href={`#deck/${deck.id}`}>Add cards <ChevronRight size={16} /></a>}
          </div>)}
        </div>
        {decks.length > 5 && <a className="quiet-link all-decks" href="#library">See all decks <ChevronRight size={16} /></a>}
      </section>}
    </div>
  );
}

function AddMaterial({ a }: { a: AppActions }) {
  const menu = useRef<HTMLDetailsElement>(null);
  return <details className="add-material quiet-more" ref={menu} onKeyDown={(e) => {
    if (e.key === "Escape") { menu.current?.removeAttribute("open"); menu.current?.querySelector("summary")?.focus(); }
  }}>
    <summary><Plus size={16} /> Add material</summary>
    <div className="quiet-menu">
      <button onClick={() => { menu.current?.removeAttribute("open"); a.importDeck(); }}><Upload size={17} />Import notes</button>
      <button onClick={() => { menu.current?.removeAttribute("open"); a.createDeck(); }}><Plus size={17} />Create deck</button>
    </div>
  </details>;
}
