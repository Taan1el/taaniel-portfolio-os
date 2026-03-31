import { useEffect, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export function usePdfViewer(source: string) {
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const documentRef = useRef<PDFDocumentProxy | null>(null);

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
        if (!cancelled) {
          setErrorMessage(error.message || "Unable to load the PDF document.");
        }
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

  return {
    canvasRef,
    errorMessage,
    loading,
    pageCount,
    pageNumber,
    scale,
    setPageNumber,
    setScale,
  };
}
