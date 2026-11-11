"use client";
import { useEffect, useState } from "react";
function MathText({
  value,
  display = false,
}: {
  value: string;
  display?: boolean;
}) {
  const [html, setHtml] = useState("");
  useEffect(() => {
    let active = true;
    import("katex").then((m: any) => {
      try {
        const h = (m.default || m).renderToString(value, {
          throwOnError: false,
          displayMode: display,
          trust: false,
          strict: "warn",
          maxExpand: 1000,
          maxSize: 20,
        });
        if (active) setHtml(h);
      } catch {}
    });
    return () => {
      active = false;
    };
  }, [value, display]);
  return html ? (
    <span className="math" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <code>{value}</code>
  );
}
function Inline({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+\$|\*\*[^*]+\*\*|\*[^*]+\*)/g)
        .map((s, i) =>
          s.startsWith("$$") ? (
            <MathText key={i} value={s.slice(2, -2)} display />
          ) : s.startsWith("$") ? (
            <MathText key={i} value={s.slice(1, -1)} />
          ) : s.startsWith("**") ? (
            <strong key={i}>{s.slice(2, -2)}</strong>
          ) : s.startsWith("*") ? (
            <em key={i}>{s.slice(1, -1)}</em>
          ) : (
            s
          ),
        )}
    </>
  );
}
export function RichText({ text }: { text: string }) {
  return (
    <div className="rich-text">
      {text.split("\n").map((line, i) =>
        /^\s*[-*] /.test(line) ? (
          <div className="rich-list" key={i}>
            • <Inline text={line.replace(/^\s*[-*] /, "")} />
          </div>
        ) : (
          <div key={i}>
            <Inline text={line} />
            {!line && <br />}
          </div>
        ),
      )}
    </div>
  );
}
