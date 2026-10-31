// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { OpenWithDialog } from "@/components/system/open-with-dialog";
import { createShortcutNode } from "@/lib/shortcuts";
import type { VirtualFile } from "@/types/system";

afterEach(() => {
  cleanup();
});

const markdown: VirtualFile = {
  kind: "file",
  path: "/Portfolio/OS-Case-Study.md",
  name: "OS-Case-Study.md",
  extension: "md",
  mimeType: "text/markdown",
  content: "# Case study",
  createdAt: 1,
  updatedAt: 1,
};

describe("OpenWithDialog", () => {
  it("lists the apps that can open the file and names it", () => {
    render(<OpenWithDialog target={{ filePath: markdown.path, node: markdown }} onOpen={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText("OS-Case-Study.md")).toBeTruthy();
    expect(screen.getAllByRole("button").length).toBeGreaterThan(2);
  });

  it("shows a shortcut without its .lnk", () => {
    const shortcut = createShortcutNode("/Desktop/Case Study.md.lnk", { type: "path", path: markdown.path });
    render(<OpenWithDialog target={{ filePath: shortcut.path, node: shortcut }} onOpen={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText("Case Study.md")).toBeTruthy();
    expect(screen.queryByText(/\.lnk/)).toBeNull();
  });
});
