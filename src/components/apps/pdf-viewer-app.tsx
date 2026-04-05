import { Download, Printer, Search, SearchX } from "lucide-react";
import { AppContent, AppScaffold, AppToolbar, ScrollArea } from "@/components/apps/app-layout";
import { resumePdfPath } from "@/data/portfolio";
import { getNodeByPath } from "@/lib/filesystem";
import { formatBytes } from "@/lib/utils";
import { usePdfViewer } from "@/hooks/use-pdf-viewer";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { AppComponentProps } from "@/types/system";

async function printPdfSource(source: string) {
  const printFrame = document.createElement("iframe");
  printFrame.style.position = "fixed";
  printFrame.style.opacity = "0";
  printFrame.style.pointerEvents = "none";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.src = source;
  document.body.append(printFrame);

  await new Promise<void>((resolve) => {
    printFrame.onload = () => resolve();
  });

  printFrame.contentWindow?.focus();
  printFrame.contentWindow?.print();
  window.setTimeout(() => printFrame.remove(), 1000);
}

export function PdfViewerApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const selectedFile = window.payload?.filePath ? getNodeByPath(nodes, window.payload.filePath) : undefined;
  const source =
    selectedFile && selectedFile.kind === "file" ? selectedFile.source ?? resumePdfPath : resumePdfPath;
  const { canvasRef, errorMessage, loading, pageCount, pageNumber, scale, setPageNumber, setScale } =
    usePdfViewer(source);

  const fileSize =
    selectedFile?.kind === "file"
      ? selectedFile.size ?? (selectedFile.content != null ? new Blob([selectedFile.content]).size : undefined)
      : undefined;

  return (
    <AppScaffold className="pdf-viewer">
      <AppToolbar className="app-toolbar">
        <div className="app-toolbar__title">
          <strong>{selectedFile?.kind === "file" ? selectedFile.name : "Resume PDF"}</strong>
          <small>
            PDF viewer{fileSize != null ? ` | ${formatBytes(fileSize)}` : ""}
            {pageCount > 0 ? ` | ${pageCount} pages` : ""}
          </small>
        </div>
        <div className="app-toolbar__group">
          <button
            type="button"
            className="icon-button"
            aria-label="Zoom out"
            onClick={() => setScale((currentScale) => Math.max(0.6, currentScale - 0.15))}
          >
            <SearchX size={15} />
          </button>
          <button type="button" className="icon-button" aria-label="Reset zoom" onClick={() => setScale(1)}>
            <Search size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="Zoom in"
            onClick={() => setScale((currentScale) => Math.min(2.75, currentScale + 0.15))}
          >
            <Search size={15} />
          </button>
          <label className="pdf-viewer__page-input">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={Math.max(1, pageCount)}
              value={pageNumber}
              onChange={(event) => {
                const nextPage = Number(event.target.value);

                if (!Number.isNaN(nextPage)) {
                  setPageNumber(Math.min(Math.max(1, nextPage), Math.max(1, pageCount)));
                }
              }}
            />
          </label>
          <button type="button" className="pill-button" onClick={() => void printPdfSource(source)}>
            <Printer size={15} />
            Print
          </button>
          <a className="pill-button" href={source} download>
            <Download size={15} />
            Download
          </a>
        </div>
      </AppToolbar>

      <AppContent className="pdf-viewer__content" padded={false} scrollable={false}>
        <div className="pdf-viewer__stage">
          <div className="pdf-viewer__meta">
            <span>
              Page {Math.min(pageNumber, Math.max(1, pageCount || 1))} / {Math.max(1, pageCount || 1)}
            </span>
            <span>Zoom {Math.round(scale * 100)}%</span>
          </div>

          {errorMessage ? (
            <div className="pdf-viewer__fallback">
              <strong>PDF preview unavailable</strong>
              <p>{errorMessage}</p>
              <a className="pill-button" href={source} target="_blank" rel="noreferrer">
                Open in browser
              </a>
            </div>
          ) : (
            <ScrollArea className="pdf-viewer__canvas-wrap">
              <canvas ref={canvasRef} />
              {loading ? <div className="pdf-viewer__loading">Rendering page...</div> : null}
            </ScrollArea>
          )}
        </div>
      </AppContent>
    </AppScaffold>
  );
}
