import { useEffect, useMemo, useRef, useState } from "react";
import { FilePlus2, StickyNote } from "lucide-react";
import { AppContent, AppScaffold } from "@/components/apps/app-layout";
import { joinPath } from "@/lib/filesystem";
import { DEFAULT_NOTE_PATH, NOTES_DIRECTORY_PATH, isNotesPath } from "@/lib/notes";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { AppComponentProps, FileNode } from "@/types/system";

function formatNoteLabel(note: FileNode) {
  return note.name.replace(/\.[^.]+$/, "");
}

function isNoteFile(node?: FileNode | null): node is FileNode {
  return Boolean(node && node.type === "file" && isNotesPath(node.path));
}

export function NotesApp({ window: appWindow }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const listDirectory = useFileSystemStore((state) => state.listDirectory);
  const readFile = useFileSystemStore((state) => state.readFile);
  const writeFile = useFileSystemStore((state) => state.writeFile);
  const rename = useFileSystemStore((state) => state.rename);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const notes = useMemo(
    () => listDirectory(NOTES_DIRECTORY_PATH).filter(isNoteFile).sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name)),
    [listDirectory, nodes]
  );
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [pendingTitleFocus, setPendingTitleFocus] = useState(false);

  const selectedNote = selectedPath ? readFile(selectedPath) : null;
  const selectedNoteFile = isNoteFile(selectedNote) ? selectedNote : null;

  useEffect(() => {
    const requestedPath =
      appWindow.payload?.filePath && isNotesPath(appWindow.payload.filePath)
        ? appWindow.payload.filePath
        : null;

    if (requestedPath && notes.some((note) => note.path === requestedPath)) {
      setSelectedPath(requestedPath);
      return;
    }

    if (selectedPath && notes.some((note) => note.path === selectedPath)) {
      return;
    }

    setSelectedPath(notes[0]?.path ?? DEFAULT_NOTE_PATH);
  }, [appWindow.payload?.filePath, notes, selectedPath]);

  useEffect(() => {
    setDraft(typeof selectedNoteFile?.content === "string" ? selectedNoteFile.content : "");
    setTitleDraft(selectedNoteFile ? formatNoteLabel(selectedNoteFile) : "");
  }, [selectedNoteFile?.content, selectedNoteFile?.path]);

  useEffect(() => {
    if (pendingTitleFocus) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
      setPendingTitleFocus(false);
      return;
    }

    textareaRef.current?.focus();
  }, [pendingTitleFocus, selectedNoteFile?.path]);

  useEffect(() => {
    if (!selectedNoteFile) {
      return;
    }

    if (draft === (typeof selectedNoteFile.content === "string" ? selectedNoteFile.content : "")) {
      return;
    }

    const timeoutId = globalThis.window.setTimeout(() => {
      void writeFile(selectedNoteFile.path, draft, {
        mimeType: selectedNoteFile.mimeType ?? "text/plain",
        extension: selectedNoteFile.extension ?? "txt",
      });
    }, 180);

    return () => globalThis.window.clearTimeout(timeoutId);
  }, [draft, selectedNoteFile, writeFile]);

  const createNote = async () => {
    const createdPath = await writeFile(joinPath(NOTES_DIRECTORY_PATH, "New Note.txt"), "", {
      mimeType: "text/plain",
      extension: "txt",
      uniqueName: true,
    });

    setSelectedPath(createdPath);
    setPendingTitleFocus(true);
  };

  const commitTitle = async () => {
    if (!selectedNoteFile) {
      return;
    }

    const cleanedTitle = titleDraft.trim() || "Untitled note";
    const nextName = `${cleanedTitle}.${selectedNoteFile.extension ?? "txt"}`;

    if (nextName === selectedNoteFile.name) {
      setTitleDraft(formatNoteLabel(selectedNoteFile));
      return;
    }

    const nextPath = await rename(selectedNoteFile.path, nextName);
    setSelectedPath(nextPath);
  };

  return (
    <AppScaffold className="notes-app">
      <AppContent className="notes-app__layout" padded={false} scrollable={false} stacked={false}>
        <aside className="notes-app__sidebar">
          <div className="notes-app__sidebar-head">
            <div>
              <p className="eyebrow">Notes</p>
              <h1>Quick notes</h1>
            </div>
            <button type="button" className="ghost-button" onClick={() => void createNote()}>
              <FilePlus2 size={15} />
              New note
            </button>
          </div>

          <div className="notes-app__list">
            {notes.map((note) => {
              const rawContent = typeof note.content === "string" ? note.content : "";
              const preview = rawContent.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "Empty note";

              return (
                <button
                  key={note.path}
                  type="button"
                  className={cn("notes-app__list-item", selectedPath === note.path && "is-active")}
                  onClick={() => setSelectedPath(note.path)}
                >
                  <span className="notes-app__list-icon">
                    <StickyNote size={15} />
                  </span>
                  <span className="notes-app__list-copy">
                    <strong>{formatNoteLabel(note)}</strong>
                    <small title={preview}>{preview}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="notes-app__editor">
          {selectedNoteFile ? (
            <>
              <header className="notes-app__editor-head">
                <div className="notes-app__editor-title">
                  <p className="eyebrow">Filename</p>
                  <input
                    ref={titleInputRef}
                    className="notes-app__title-input"
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onBlur={() => void commitTitle()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void commitTitle();
                        textareaRef.current?.focus();
                      }

                      if (event.key === "Escape") {
                        event.preventDefault();
                        setTitleDraft(formatNoteLabel(selectedNoteFile));
                        textareaRef.current?.focus();
                      }
                    }}
                    placeholder="Untitled note"
                    spellCheck={false}
                  />
                </div>
                <small>Saved automatically in the virtual filesystem</small>
              </header>
              <textarea
                ref={textareaRef}
                className="notes-app__textarea"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Write something..."
                spellCheck={false}
              />
            </>
          ) : (
            <div className="app-empty">Create a note to start writing.</div>
          )}
        </section>
      </AppContent>
    </AppScaffold>
  );
}
