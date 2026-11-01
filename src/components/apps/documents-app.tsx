import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Download, Italic, Link2, List, ListOrdered, Printer, Quote, Redo2, Save, Underline, Undo2 } from "lucide-react";
import { useDocumentFile } from "@/hooks/use-document-file";
import { countWords, documentPage, sanitizeRichText } from "@/lib/rich-text";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { AppComponentProps } from "@/types/system";
import "@/styles/documents.css";

const DRAFT_KEY = "taaniel-os-documents-draft";
const BLOCKS = [
  { value: "p", label: "Normal text" },
  { value: "h1", label: "Title" },
  { value: "h2", label: "Heading" },
  { value: "h3", label: "Subheading" },
];
const INLINE = [
  { command: "bold", label: "Bold", keys: "Ctrl+B", icon: Bold },
  { command: "italic", label: "Italic", keys: "Ctrl+I", icon: Italic },
  { command: "underline", label: "Underline", keys: "Ctrl+U", icon: Underline },
];
const LISTS = [
  { command: "insertUnorderedList", label: "Bulleted list", icon: List },
  { command: "insertOrderedList", label: "Numbered list", icon: ListOrdered },
  { command: "justifyLeft", label: "Align left", icon: AlignLeft },
  { command: "justifyCenter", label: "Align centre", icon: AlignCenter },
  { command: "justifyRight", label: "Align right", icon: AlignRight },
];

/** Formatting uses the browser's editing commands, which also give typing its native undo. */
function run(command: string, value?: string) {
  document.execCommand(command, false, value);
}

function printDocument(title: string, html: string) {
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0";
  frame.srcdoc = documentPage(title, html);
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    globalThis.window.setTimeout(() => frame.remove(), 1000);
  };
  document.body.append(frame);
}

export function DocumentsApp({ window: appWindow }: AppComponentProps) {
  const document_ = useDocumentFile(appWindow, { defaultName: "Document.document", extension: "document", mimeType: "text/html" });
  const writeFile = useFileSystemStore((state) => state.writeFile);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const linkRef = useRef<HTMLInputElement | null>(null);
  const savedRange = useRef<Range | null>(null);
  const [stats, setStats] = useState({ words: 0, characters: 0 });
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [block, setBlock] = useState("p");
  const [linking, setLinking] = useState(false);
  const [notice, setNotice] = useState("");
  const title = document_.name.replace(/\.[^.]+$/, "");

  const measure = () => {
    const text = pageRef.current?.innerText ?? "";
    setStats({ words: countWords(text), characters: text.replace(/\n/g, "").length });
  };

  const currentHtml = () => sanitizeRichText(pageRef.current?.innerHTML ?? "");

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    // Written once, not through React, so the caret and native undo are left alone.
    page.innerHTML = sanitizeRichText(document_.file ? document_.file.content ?? "" : readLocalStorage(DRAFT_KEY) ?? "");
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = () => {
    measure();
    if (document_.file) document_.change(currentHtml());
    else writeLocalStorage(DRAFT_KEY, currentHtml());
  };

  const inPage = () => {
    const node = globalThis.window.getSelection()?.anchorNode;
    return Boolean(node && pageRef.current?.contains(node));
  };

  useEffect(() => {
    const update = () => {
      if (!inPage()) return;
      setActive(Object.fromEntries([...INLINE, ...LISTS].map(({ command }) => [command, document.queryCommandState(command)])));
      const value = document.queryCommandValue("formatBlock").toLowerCase();
      setBlock(BLOCKS.some((entry) => entry.value === value) ? value : "p");
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, []);

  const format = (command: string, value?: string) => {
    pageRef.current?.focus();
    run(command, value);
    handleInput();
  };

  const save = async () => {
    await document_.save(currentHtml());
    setNotice("");
  };

  const exportHtml = async () => {
    const path = await writeFile(`/Documents/${title}.html`, documentPage(title, currentHtml()), { extension: "html", mimeType: "text/html", uniqueName: true });
    setNotice(`Saved ${path.split("/").pop()} to Documents`);
  };

  const openLink = () => {
    const selection = globalThis.window.getSelection();
    savedRange.current = selection?.rangeCount && inPage() ? selection.getRangeAt(0) : null;
    setLinking(true);
    requestAnimationFrame(() => linkRef.current?.focus());
  };

  const addLink = (event: FormEvent) => {
    event.preventDefault();
    const address = linkRef.current?.value.trim() ?? "";
    setLinking(false);
    pageRef.current?.focus();
    const selection = globalThis.window.getSelection();
    if (savedRange.current) {
      selection?.removeAllRanges();
      selection?.addRange(savedRange.current);
    }
    if (!/^(https?:\/\/|mailto:)/i.test(address)) return;
    if (selection?.isCollapsed) run("insertText", address);
    if (selection?.isCollapsed) selection.modify("extend", "backward", "line");
    format("createLink", address);
  };

  const handlePaste = (event: ClipboardEvent) => {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    if (html) format("insertHTML", sanitizeRichText(html));
    else format("insertText", event.clipboardData.getData("text/plain"));
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void save();
    }
  };

  const status = !document_.file ? "Draft, kept in this browser" : document_.readOnly ? `${document_.file.name} · Read-only` : `${document_.file.name} · ${document_.status === "unsaved" ? "Saving" : "Saved"}`;
  const keepCaret = (event: React.MouseEvent) => event.preventDefault();

  return (
    <div className="docs" onKeyDown={handleKeyDown}>
      <div className="docs__toolbar" role="toolbar" aria-label="Formatting">
        <button type="button" aria-label="Save" title="Save (Ctrl+S)" onMouseDown={keepCaret} onClick={() => void save()}>
          <Save size={16} />
        </button>
        <button type="button" aria-label="Export as web page" title="Export as web page" onMouseDown={keepCaret} onClick={() => void exportHtml()}>
          <Download size={16} />
        </button>
        <button type="button" aria-label="Print or save as PDF" title="Print or save as PDF" onMouseDown={keepCaret} onClick={() => printDocument(title, currentHtml())}>
          <Printer size={16} />
        </button>
        <span className="docs__rule" aria-hidden="true" />
        <button type="button" aria-label="Undo" title="Undo (Ctrl+Z)" onMouseDown={keepCaret} onClick={() => format("undo")}>
          <Undo2 size={16} />
        </button>
        <button type="button" aria-label="Redo" title="Redo (Ctrl+Y)" onMouseDown={keepCaret} onClick={() => format("redo")}>
          <Redo2 size={16} />
        </button>
        <span className="docs__rule" aria-hidden="true" />
        <select aria-label="Text style" value={block} onChange={(event) => format("formatBlock", event.target.value)}>
          {BLOCKS.map((entry) => (
            <option key={entry.value} value={entry.value}>
              {entry.label}
            </option>
          ))}
        </select>
        {INLINE.map(({ command, label, keys, icon: Icon }) => (
          <button key={command} type="button" aria-label={label} aria-pressed={Boolean(active[command])} title={`${label} (${keys})`} className={cn(active[command] && "is-on")} onMouseDown={keepCaret} onClick={() => format(command)}>
            <Icon size={16} />
          </button>
        ))}
        <button type="button" aria-label="Quote" title="Quote" onMouseDown={keepCaret} onClick={() => format("formatBlock", "blockquote")}>
          <Quote size={16} />
        </button>
        <button type="button" aria-label="Link" title="Link" onMouseDown={keepCaret} onClick={openLink}>
          <Link2 size={16} />
        </button>
        {LISTS.map(({ command, label, icon: Icon }) => (
          <button key={command} type="button" aria-label={label} aria-pressed={Boolean(active[command])} title={label} className={cn(active[command] && "is-on")} onMouseDown={keepCaret} onClick={() => format(command)}>
            <Icon size={16} />
          </button>
        ))}
      </div>

      {linking ? (
        <form className="docs__link" onSubmit={addLink} onKeyDown={(event) => event.key === "Escape" && (event.stopPropagation(), setLinking(false))}>
          <input ref={linkRef} type="url" aria-label="Link address" placeholder="https://example.com" />
          <button type="submit">Add link</button>
          <button type="button" onClick={() => setLinking(false)}>
            Cancel
          </button>
        </form>
      ) : null}

      <div className="docs__desk">
        <div
          ref={pageRef}
          className="docs__page"
          role="textbox"
          aria-multiline="true"
          aria-label={title}
          contentEditable={!document_.readOnly}
          suppressContentEditableWarning
          spellCheck
          data-placeholder="Start writing"
          onInput={handleInput}
          onPaste={handlePaste}
        />
      </div>

      <footer className="docs__status">
        <span>
          {status}
          {notice ? ` · ${notice}` : ""}
        </span>
        <span>
          {stats.words} {stats.words === 1 ? "word" : "words"} · {stats.characters} characters
        </span>
      </footer>
    </div>
  );
}
