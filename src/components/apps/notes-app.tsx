import { useEffect, useMemo, useState } from "react";
import { FilePlus2, StickyNote } from "lucide-react";
import { getNodeByPath, listChildren } from "@/lib/filesystem";
import { DEFAULT_NOTE_PATH, NOTES_DIRECTORY_PATH, isNotesPath } from "@/lib/notes";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { AppComponentProps, VirtualFile, VirtualNode } from "@/types/system";

function formatNoteLabel(note: VirtualFile) {
  return note.name.replace(/\.[^.]+$/, "");
}

function isNoteFile(node?: VirtualNode): node is VirtualFile {
  return Boolean(node && node.kind === "file" && node.content !== undefined && isNotesPath(node.path));
}

export function NotesApp({ window: appWindow }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const createTextFile = useFileSystemStore((state) => state.createTextFile);
  const updateTextFile = useFileSystemStore((state) => state.updateTextFile);

  const notes = useMemo(
    () =>
      listChildren(nodes, NOTES_DIRECTORY_PATH)
        .filter(isNoteFile)
        .sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name)),
    [nodes]
  );
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const selectedNote = selectedPath ? getNodeByPath(nodes, selectedPath) : undefined;
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
    setDraft(selectedNoteFile?.content ?? "");
  }, [selectedNoteFile?.content, selectedNoteFile?.path]);

  useEffect(() => {
    if (!selectedNoteFile) {
      return;
    }

    if (draft === (selectedNoteFile.content ?? "")) {
      return;
    }

    const timeoutId = globalThis.window.setTimeout(() => {
      void updateTextFile(selectedNoteFile.path, draft);
    }, 180);

    return () => globalThis.window.clearTimeout(timeoutId);
  }, [draft, selectedNoteFile, updateTextFile]);

  const createNote = async () => {
    await createTextFile(NOTES_DIRECTORY_PATH, "New Note.txt", "");
    const refreshedNotes = listChildren(useFileSystemStore.getState().nodes, NOTES_DIRECTORY_PATH)
      .filter(isNoteFile)
      .sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));

    if (refreshedNotes[0]) {
      setSelectedPath(refreshedNotes[0].path);
    }
  };

  return (
    <div className="notes-app">
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
            const preview = (note.content ?? "").split(/\r?\n/).find((line) => line.trim().length > 0) ?? "Empty note";

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
              <div>
                <p className="eyebrow">Editing</p>
                <h2>{formatNoteLabel(selectedNoteFile)}</h2>
              </div>
              <small>Saved automatically in the virtual filesystem</small>
            </header>
            <textarea
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
    </div>
  );
}
