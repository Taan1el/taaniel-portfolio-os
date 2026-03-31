import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Printer, Search, SearchX } from "lucide-react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { resumePdfPath } from "@/data/portfolio";
import { getNodeByPath } from "@/lib/filesystem";
import { formatBytes } from "@/lib/utils";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { AppComponentProps } from "@/types/system";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);

  const fileSize = useMemo(() => {
    if (selectedFile?.kind !== "file") {
      return undefined;
    }

    if (selectedFile.size != null) {
      return selectedFile.size;
    }

    if (selectedFile.content != null) {
      return new Blob([selectedFile.content]).size;
    }

    return undefined;
  }, [selectedFile]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);

    const loadingTask = getDocument(source);

    loadingTask.promise
      .then((documentProxy) => {
        if (cancelled) {
          void documentProxy.destroy();
          return;
        }

        documentRef.current = documentProxy;
        setPageCount(documentProxy.numPages);
        setPageNumber((currentPage) => Math.min(Math.max(1, currentPage), documentProxy.numPages));
      })
      .catch((error: Error) => {
        if (cancelled) {
          return;
        }

        setErrorMessage(error.message || "Unable to load the PDF document.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      void loadingTask.destroy();
      void documentRef.current?.destroy();
      documentRef.current = null;
    };
  }, [source]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const documentProxy = documentRef.current;

    if (!canvas || !documentProxy || errorMessage) {
      return;
    }

    let disposed = false;

    const renderPage = async () => {
      setLoading(true);
      const page = await documentProxy.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const context = canvas.getContext("2d");

      if (!context || disposed) {
        return;
      }

      const outputScale = globalThis.window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

      renderTaskRef.current?.cancel();
      const renderTask = page.render({ canvas, canvasContext: context, viewport });
      renderTaskRef.current = renderTask;

      await renderTask.promise;

      if (!disposed) {
        setLoading(false);
      }
    };

    void renderPage().catch((error: Error) => {
      if (!disposed && error.name !== "RenderingCancelledException") {
        setErrorMessage(error.message || "Unable to render the selected page.");
        setLoading(false);
      }
    });

    return () => {
      disposed = true;
      renderTaskRef.current?.cancel();
    };
  }, [errorMessage, pageNumber, scale]);

  return (
    <div className="app-screen pdf-viewer">
      <header className="app-toolbar">
        <div className="app-toolbar__title">
          <strong>{selectedFile?.kind === "file" ? selectedFile.name : "Resume PDF"}</strong>
          <small>
            PDF viewer{fileSize != null ? ` • ${formatBytes(fileSize)}` : ""}
            {pageCount > 0 ? ` • ${pageCount} pages` : ""}
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
          <button
            type="button"
            className="icon-button"
            aria-label="Reset zoom"
            onClick={() => setScale(1.15)}
          >
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
          <button
            type="button"
            className="icon-button"
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((currentPage) => Math.max(1, currentPage - 1))}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            className="icon-button"
            disabled={pageCount === 0 || pageNumber >= pageCount}
            onClick={() => setPageNumber((currentPage) => Math.min(pageCount, currentPage + 1))}
          >
            <ChevronRight size={15} />
          </button>
          <button type="button" className="pill-button" onClick={() => void printPdfSource(source)}>
            <Printer size={15} />
            Print
          </button>
          <a className="pill-button" href={source} download>
            <Download size={15} />
            Download
          </a>
        </div>
      </header>

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
          <div className="pdf-viewer__canvas-wrap">
            <canvas ref={canvasRef} />
            {loading ? <div className="pdf-viewer__loading">Rendering page…</div> : null}
          </div>
        )}
      </div>
    </div>
  );
}
