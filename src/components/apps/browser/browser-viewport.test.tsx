// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrowserViewport } from "@/components/apps/browser/browser-viewport";
import type { BrowserResolvedDocument } from "@/lib/browser/types";

const noop = vi.fn();

function renderViewport(document: BrowserResolvedDocument) {
  render(
    <BrowserViewport
      document={document}
      viewMode="web"
      loadState="ready"
      fallback={null}
      refreshToken={0}
      canOpenExternally
      onLocalNavigate={noop}
      onFrameLoad={noop}
      onFrameError={noop}
      onOpenInNewTab={noop}
      onRetryWithProxy={noop}
    />,
  );
}

describe("BrowserViewport sandbox policy", () => {
  it("does not allow scripts in local srcDoc previews", () => {
    renderViewport({
      kind: "local",
      localKind: "file",
      title: "Local preview",
      displayUrl: "/Documents/test.html",
      note: "Local file",
      frameSource: {
        kind: "srcDoc",
        value: "<p>hello</p>",
      },
    });

    const frame = screen.getByTitle("Local preview");
    expect(frame.getAttribute("sandbox")).not.toContain("allow-scripts");
    expect(frame.getAttribute("sandbox")).toContain("allow-same-origin");
  });

  it("keeps script support for remote browser pages", () => {
    renderViewport({
      kind: "remote",
      title: "Remote page",
      displayUrl: "https://example.com",
      note: "Remote page",
      frameSource: {
        kind: "src",
        value: "https://example.com",
      },
    });

    expect(screen.getByTitle("Remote page").getAttribute("sandbox")).toContain("allow-scripts");
  });
});
