"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import hljs from "highlight.js";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Loader2, Download } from "lucide-react";
import { createPortal } from "react-dom";

const FONTS = {
  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', Times, serif",
  mono: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
} as const;

const PAGES = { a4: [794, 1123], letter: [816, 1056] } as const;

const BGS = {
  white: { bg: "#ffffff", fg: "#1a1a1a" },
  sepia: { bg: "#f4ecd8", fg: "#433422" },
  dark: { bg: "#0a0a0a", fg: "#e6e6e6" },
  none: { bg: "transparent", fg: "#1a1a1a" },
} as const;

const DOC_CSS = `
.export-doc { line-height: 1.65; word-wrap: break-word; }
.export-doc > *:first-child { margin-top: 0; }
.export-doc h1 { font-size: 1.8em; font-weight: 700; margin: .7em 0 .35em; line-height:1.25; }
.export-doc h2 { font-size: 1.45em; font-weight: 700; margin: .7em 0 .35em; line-height:1.25; }
.export-doc h3 { font-size: 1.2em; font-weight: 700; margin: .6em 0 .3em; }
.export-doc h4,.export-doc h5,.export-doc h6 { font-weight:700; margin:.6em 0 .3em; }
.export-doc p { margin: .5em 0; }
.export-doc ul, .export-doc ol { margin: .5em 0; padding-left: 1.5em; }
.export-doc li { margin: .25em 0; }
.export-doc blockquote { margin: .7em 0; padding: .25em 1em; border-left: 3px solid #d97757; opacity: .85; font-style: italic; }
.export-doc a { color: #2563eb; text-decoration: underline; word-break: break-all; }
.export-doc code { font-family: 'Geist Mono', ui-monospace, monospace; font-size: .88em; background: rgba(127,127,127,.16); padding: .1em .35em; border-radius: 4px; }
.export-doc pre { background:#0d1117; border:1px solid #1f2530; border-radius:8px; padding:14px 16px; margin:.75em 0; white-space:pre-wrap; word-break:break-word; }
.export-doc pre code { background:none; padding:0; font-size:.85em; line-height:1.55; color:#e6edf3; }
.export-doc img { max-width:100%; }
.export-doc table { border-collapse:collapse; margin:.7em 0; }
.export-doc th, .export-doc td { border:1px solid rgba(127,127,127,.4); padding:5px 9px; }
.export-doc th { background: rgba(127,127,127,.12); }
.export-doc hr { border:none; border-top:1px solid rgba(127,127,127,.35); margin:1em 0; }
.export-doc .hljs{color:#e6edf3}
.export-doc .hljs-comment,.export-doc .hljs-quote{color:#8b949e;font-style:italic}
.export-doc .hljs-keyword,.export-doc .hljs-selector-tag,.export-doc .hljs-literal,.export-doc .hljs-type,.export-doc .hljs-deletion{color:#ff7b72}
.export-doc .hljs-string,.export-doc .hljs-meta .hljs-string,.export-doc .hljs-addition{color:#a5d6ff}
.export-doc .hljs-number,.export-doc .hljs-meta{color:#79c0ff}
.export-doc .hljs-title,.export-doc .hljs-section,.export-doc .hljs-built_in,.export-doc .hljs-title.class_,.export-doc .hljs-title.function_{color:#d2a8ff}
.export-doc .hljs-attr,.export-doc .hljs-attribute,.export-doc .hljs-variable,.export-doc .hljs-template-variable,.export-doc .hljs-property{color:#ffa657}
.export-doc .hljs-name,.export-doc .hljs-tag,.export-doc .hljs-selector-class,.export-doc .hljs-selector-id{color:#7ee787}
.export-doc .hljs-symbol,.export-doc .hljs-bullet,.export-doc .hljs-link,.export-doc .hljs-regexp{color:#a5d6ff}
.export-doc .hljs-emphasis{font-style:italic}
.export-doc .hljs-strong{font-weight:700}
`;

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-text-muted mb-1.5 lowercase">{label}</div>
      <div className="flex flex-wrap gap-1.5 items-center">{children}</div>
    </div>
  );
}

export default function ExportModal({
  name,
  content,
  onClose,
}: {
  name: string;
  content: string;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<"pdf" | "png">("pdf");
  const [pageSize, setPageSize] = useState<"a4" | "letter">("a4");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait",
  );
  const [font, setFont] = useState<keyof typeof FONTS>("sans");
  const [fontSize, setFontSize] = useState(15);
  const [bg, setBg] = useState<keyof typeof BGS>("white");
  const [quality, setQuality] = useState(2);
  const [margin, setMargin] = useState(48);
  const [busy, setBusy] = useState(false);

  const captureRef = useRef<HTMLDivElement>(null);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [docH, setDocH] = useState(0);

  const html = useMemo(() => {
    marked.setOptions({ gfm: true, breaks: true });
    return marked.parse(content) as string;
  }, [content]);

  let [pageW, pageH] = PAGES[pageSize] as [number, number];
  if (orientation === "landscape") {
    const t = pageW;
    pageW = pageH;
    pageH = t;
  }
  const contentW = pageW - margin * 2;
  const theme = BGS[bg];
  const base = name.replace(/\.[^/.]+$/, "") || "note";

  // syntax-highlight code blocks in both nodes once the html is mounted
  useEffect(() => {
    [captureRef.current, docRef.current].forEach((root) => {
      root?.querySelectorAll<HTMLElement>("pre code").forEach((el) => {
        if (el.dataset.hl) return;
        try {
          hljs.highlightElement(el);
          el.dataset.hl = "1";
        } catch {}
      });
    });
  }, [html]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // fit the page-sized preview into the pane (no dependency on CSS `zoom`)
  useEffect(() => {
    const wrap = previewWrapRef.current;
    const doc = docRef.current;
    if (!wrap || !doc) return;
    const measure = () => {
      const avail = wrap.clientWidth - 32; // p-4 (16px) each side
      const s = Math.max(0.1, Math.min(1, avail / pageW));
      setScale(s);
      setDocH(doc.offsetHeight * s); // offsetHeight ignores the transform
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [pageW, html, font, fontSize, margin, bg]);

  const doExport = async () => {
    const node = captureRef.current;
    if (!node || busy) return;
    setBusy(true);
    try {
      const canvas = await html2canvas(node, {
        scale: quality,
        backgroundColor: bg === "none" ? null : theme.bg,
        useCORS: true,
        logging: false,
      });

      if (format === "png") {
        await new Promise<void>((resolve) =>
          canvas.toBlob((b) => {
            if (b) download(b, `${base}.png`);
            resolve();
          }, "image/png"),
        );
      } else {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation,
          unit: "px",
          format: [pageW, pageH],
          hotfixes: ["px_scaling"],
        });
        const imgW = contentW;
        const imgH = imgW * (canvas.height / canvas.width);
        const usableH = pageH - margin * 2;
        const fill = hexToRgb(bg === "none" ? "#ffffff" : theme.bg);
        let sY = 0;
        let page = 0;
        while (sY < imgH - 0.5) {
          if (page > 0) pdf.addPage();
          pdf.setFillColor(fill.r, fill.g, fill.b);
          pdf.rect(0, 0, pageW, pageH, "F");
          pdf.addImage(
            imgData,
            "PNG",
            margin,
            margin - sY,
            imgW,
            imgH,
            undefined,
            "FAST",
          );
          // clip any bleed into the page margins
          pdf.rect(0, 0, pageW, margin, "F");
          pdf.rect(0, pageH - margin, pageW, margin, "F");
          pdf.rect(0, 0, margin, pageH, "F");
          pdf.rect(pageW - margin, 0, margin, pageH, "F");
          sY += usableH;
          page++;
        }
        pdf.save(`${base}.pdf`);
      }
      onClose();
    } catch (err) {
      console.error("[export] failed", err);
      alert("export failed — try again");
    } finally {
      setBusy(false);
    }
  };

  const docStyleBase: React.CSSProperties = {
    background: theme.bg,
    color: theme.fg,
    fontFamily: FONTS[font],
    fontSize,
    boxSizing: "border-box",
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 font-mono"
      onClick={onClose}
    >
      <style dangerouslySetInnerHTML={{ __html: DOC_CSS }} />
      <div
        className="bg-bg border border-border w-full max-w-4xl h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-elevated shrink-0">
          <span className="text-sm font-bold text-text truncate">
            export · {name}
          </span>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text text-lg w-6 h-6 leading-none cursor-pointer shrink-0"
            aria-label="close"
          >
            ×
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-border overflow-y-auto p-4 space-y-4 text-xs">
            <Field label="format">
              <Opt active={format === "pdf"} onClick={() => setFormat("pdf")}>
                pdf
              </Opt>
              <Opt active={format === "png"} onClick={() => setFormat("png")}>
                image
              </Opt>
            </Field>
            {format === "pdf" && (
              <>
                <Field label="page size">
                  <Opt
                    active={pageSize === "a4"}
                    onClick={() => setPageSize("a4")}
                  >
                    a4
                  </Opt>
                  <Opt
                    active={pageSize === "letter"}
                    onClick={() => setPageSize("letter")}
                  >
                    letter
                  </Opt>
                </Field>
                <Field label="orientation">
                  <Opt
                    active={orientation === "portrait"}
                    onClick={() => setOrientation("portrait")}
                  >
                    portrait
                  </Opt>
                  <Opt
                    active={orientation === "landscape"}
                    onClick={() => setOrientation("landscape")}
                  >
                    landscape
                  </Opt>
                </Field>
              </>
            )}
            <Field label="font">
              <Opt active={font === "sans"} onClick={() => setFont("sans")}>
                sans
              </Opt>
              <Opt active={font === "serif"} onClick={() => setFont("serif")}>
                serif
              </Opt>
              <Opt active={font === "mono"} onClick={() => setFont("mono")}>
                mono
              </Opt>
            </Field>
            <Field label={`text size · ${fontSize}px`}>
              <input
                type="range"
                min={11}
                max={24}
                value={fontSize}
                onChange={(e) => setFontSize(+e.target.value)}
                className="w-full accent-accent"
              />
            </Field>
            <Field label="background">
              <Opt active={bg === "white"} onClick={() => setBg("white")}>
                white
              </Opt>
              <Opt active={bg === "sepia"} onClick={() => setBg("sepia")}>
                sepia
              </Opt>
              <Opt active={bg === "dark"} onClick={() => setBg("dark")}>
                dark
              </Opt>
              {format === "png" && (
                <Opt active={bg === "none"} onClick={() => setBg("none")}>
                  none
                </Opt>
              )}
            </Field>
            <Field label={`margin · ${margin}px`}>
              <input
                type="range"
                min={0}
                max={96}
                step={8}
                value={margin}
                onChange={(e) => setMargin(+e.target.value)}
                className="w-full accent-accent"
              />
            </Field>
            <Field label={`quality · ${quality}x`}>
              <Opt active={quality === 1} onClick={() => setQuality(1)}>
                1x
              </Opt>
              <Opt active={quality === 2} onClick={() => setQuality(2)}>
                2x
              </Opt>
              <Opt active={quality === 3} onClick={() => setQuality(3)}>
                3x
              </Opt>
            </Field>
          </div>

          <div
            ref={previewWrapRef}
            className="flex-1 overflow-auto bg-black/20 p-4"
          >
            <div
              style={{ width: pageW * scale, height: docH, margin: "0 auto" }}
            >
              <div
                ref={docRef}
                className="export-doc shadow-2xl"
                style={{
                  ...docStyleBase,
                  width: pageW,
                  padding: margin,
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-bg-elevated shrink-0">
          <button
            onClick={onClose}
            className="text-xs text-text-muted hover:text-text cursor-pointer"
          >
            cancel
          </button>
          <button
            onClick={doExport}
            disabled={busy}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-accent hover:bg-accent-hover text-bg font-bold disabled:opacity-50 cursor-pointer"
          >
            {busy ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Download size={13} />
            )}
            export {format}
          </button>
        </div>
      </div>

      {/* off-screen capture node — content-only padding for pdf (margins added
          per-page in jsPDF), full padding for png */}
      <div
        ref={captureRef}
        className="export-doc"
        style={{
          ...docStyleBase,
          position: "absolute",
          left: -100000,
          top: 0,
          width: format === "png" ? pageW : contentW,
          padding: format === "png" ? margin : 0,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>,
    document.body,
  );
}

const Opt = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1 text-xs border transition-colors cursor-pointer ${
      active
        ? "border-accent text-accent bg-bg-elevated"
        : "border-border text-text-muted hover:text-text hover:bg-bg-hover"
    }`}
  >
    {children}
  </button>
);
