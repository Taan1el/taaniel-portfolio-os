// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "@/app/App";

describe("App routing", () => {
  it("renders /portfolio recruiter view", async () => {
    window.history.pushState({}, "", "/portfolio");
    render(<App />);
    await vi.dynamicImportSettled();

    const heading = await screen.findByRole(
      "heading",
      { name: /taaniel vananurm/i },
      { timeout: 5_000 },
    );
    expect(heading).toBeTruthy();
  });
});
