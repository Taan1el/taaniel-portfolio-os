import { useEffect, useMemo, useRef, useState } from "react";
import { FilePlus2, StickyNote } from "lucide-react";
import {
  AppContent,
  AppScaffold,
  AppSidebar,
  Button,
  EmptyState,
  ScrollArea,
  StatusBar,
} from "@/components/apps/app-layout";
import { joinPath } from "@/lib/filesystem";
import {
  DEFAULT_NOTE_CONTENT,
  DEFAULT_NOTE_PATH,
  NOTES_DIRECTORY_PATH,
  isNotesPath,
} from "@/lib/notes";
import { cn } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/filesystem-store";
import { useProcessStore } from "@/stores/process-store";
import { useWindowStore } from "@/stores/window-store";
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
  const updateProcess = useProcessStore((state) => state.updateProcess);
  const setWindowTitle = useWindowStore((state) => state.setWindowTitle);
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
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");

  const selectedNote = selectedPath ? readFile(selectedPath) : null;
  const selectedNoteFile = isNoteFile(selectedNote) ? selectedNote : null;

  useEffect(() => {
    void (async () => {
      const node = readFile(DEFAULT_NOTE_PATH);
      if (!isNoteFile(node)) {
        await writeFile(DEFAULT_NOTE_PATH, DEFAULT_NOTE_CONTENT, {
          mimeType: "text/plain",
          extension: "txt",
        });
      }
    })();
  }, [readFile, writeFile]);

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
    setSaveState("saved");
  }, [selectedNoteFile?.content, selectedNoteFile?.path]);

  useEffect(() => {
    const nextFilePath = selectedNoteFile?.path;

    if (!nextFilePath || appWindow.payload?.filePath === nextFilePath) {
      if (selectedNoteFile && appWindow.title !== selectedNoteFile.name) {
        setWindowTitle(appWindow.id, selectedNoteFile.name);
      }
      return;
    }

    updateProcess(appWindow.processId, {
      launchPayload: {
        ...appWindow.payload,
        filePath: nextFilePath,
      },
    });
    setWindowTitle(appWindow.id, selectedNoteFile.name);
  }, [
    appWindow.id,
    appWindow.payload,
    appWindow.processId,
    appWindow.title,
    selectedNoteFile,
    setWindowTitle,
    updateProcess,
  ]);

  useEffect(() => {
    if (pendingTitleFocus) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
      setPendingTitleFocus(false);
      return;
    }

    const frameId = requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
    return () => cancelAnimationFrame(frameId);
  }, [pendingTitleFocus, selectedNoteFile?.path]);

  useEffect(() => {
    if (!selectedNoteFile) {
      return;
    }

    if (draft === (typeof selectedNoteFile.content === "string" ? selectedNoteFile.content : "")) {
      setSaveState("saved");
      return;
    }

    setSaveState("saving");
    const timeoutId = globalThis.window.setTimeout(() => {
      void writeFile(selectedNoteFile.path, draft, {
        mimeType: selectedNoteFile.mimeType ?? "text/plain",
        extension: selectedNoteFile.extension ?? "txt",
      }).then(() => setSaveState("saved"));
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
    setPendingTitleFocus(false);
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
    updateProcess(appWindow.processId, {
      launchPayload: {
        ...appWindow.payload,
        filePath: nextPath,
      },
    });
    setWindowTitle(appWindow.id, nextName);
  };

  return (
    <AppScaffold className="notes-app">
      <AppContent className="notes-app__layout" padded={false} scrollable={false} stacked={false}>
        <AppSidebar className="notes-app__sidebar">
          <div className="notes-app__sidebar-head">
            <div>
              <p className="eyebrow">Notes</p>
              <h2>Quick notes</h2>
            </div>
            <Button type="button" variant="panel" align="start" onClick={() => void createNote()}>
              <FilePlus2 size={15} />
              New note
            </Button>
          </div>

          <ScrollArea className="notes-app__list">
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
          </ScrollArea>
        </AppSidebar>

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
                <small>{saveState === "saving" ? "Saving..." : "Saved to the filesystem"}</small>
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
            <EmptyState
              className="notes-app__empty"
              title="No note selected"
              description="Create a new note or choose one from the list to start writing."
              actions={
                <Button type="button" variant="panel" onClick={() => void createNote()}>
                  <FilePlus2 size={15} />
                  Create note
                </Button>
              }
            />
          )}
        </section>
      </AppContent>
      <StatusBar className="notes-app__statusbar">
        <span>{notes.length} note{notes.length === 1 ? "" : "s"}</span>
        <span>{selectedNoteFile ? selectedNoteFile.name : "No note selected"}</span>
        <span>{saveState === "saving" ? "Saving..." : "All changes saved"}</span>
      </StatusBar>
    </AppScaffold>
  );
}
