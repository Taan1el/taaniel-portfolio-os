import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { Save } from "lucide-react";
import { getNodeByPath } from "@/lib/filesystem";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { AppComponentProps } from "@/types/system";

function languageForExtension(extension: string) {
  const map: Record<string, string> = {
    md: "markdown",
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    css: "css",
    html: "html",
  };

  return map[extension] ?? "plaintext";
}

export function CodeEditorApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const updateTextFile = useFileSystemStore((state) => state.updateTextFile);
  const file = window.payload?.filePath ? getNodeByPath(nodes, window.payload.filePath) : undefined;
  const isEditable = Boolean(file && file.kind === "file" && file.content !== undefined);
  const initialValue = file?.kind === "file" ? file.content ?? file.source ?? "" : "";
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, window.payload?.filePath]);

  const language = useMemo(
    () => (file && file.kind === "file" ? languageForExtension(file.extension) : "plaintext"),
    [file]
  );

  if (!file || file.kind !== "file") {
    return <div className="app-empty">No file selected for the editor.</div>;
  }

  if (!isEditable) {
    return <div className="app-empty">This file is read-only. Open it in its native viewer instead.</div>;
  }

  return (
    <div className="editor-app">
      <header className="app-toolbar">
        <div className="app-toolbar__title">
          <strong>{file.name}</strong>
          <small>{file.mimeType}</small>
        </div>
        <button
          type="button"
          className="pill-button"
          onClick={() => {
            void updateTextFile(file.path, value);
          }}
        >
          <Save size={15} />
          Save
        </button>
      </header>
      <div className="editor-app__body">
        <Editor
          height="100%"
          defaultLanguage={language}
          language={language}
          value={value}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            smoothScrolling: true,
            automaticLayout: true,
          }}
          onMount={(editor, monaco) => {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
              const nextValue = editor.getValue();
              setValue(nextValue);
              void updateTextFile(file.path, nextValue);
            });
          }}
          onChange={(nextValue) => setValue(nextValue ?? "")}
        />
      </div>
    </div>
  );
}
