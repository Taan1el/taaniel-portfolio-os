import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePdfViewer } from "./use-pdf-viewer";

const mocks = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: mocks.getDocument,
}));

describe("usePdfViewer", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([true, false])("renders the first page when canvas arrives before document: %s", async (canvasFirst) => {
    const render = vi.fn(() => ({ promise: Promise.resolve(), cancel: vi.fn() }));
    const documentProxy = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getViewport: () => ({ width: 600, height: 800 }),
        render,
      }),
      destroy: vi.fn(),
    };
    let resolveDocument!: (document: typeof documentProxy) => void;
    const destroy = vi.fn();
    mocks.getDocument.mockReturnValue({
      promise: new Promise((resolve) => { resolveDocument = resolve; }),
      destroy,
    });
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue({ setTransform: vi.fn() } as unknown as CanvasRenderingContext2D);
    const { result, unmount } = renderHook(() => usePdfViewer(["/resume.pdf"]));

    if (canvasFirst) act(() => result.current.canvasRef(canvas));
    await act(async () => resolveDocument(documentProxy));
    if (!canvasFirst) {
      expect(render).not.toHaveBeenCalled();
      act(() => result.current.canvasRef(canvas));
    }

    await waitFor(() => expect(render).toHaveBeenCalledTimes(1));
    expect(documentProxy.getPage).toHaveBeenCalledWith(1);
    expect(canvas.width).toBe(600 * window.devicePixelRatio);
    unmount();
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
