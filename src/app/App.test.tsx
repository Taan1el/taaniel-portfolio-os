// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "@/app/App";

describe("App routing", () => {
  it("renders /portfolio recruiter view", async () => {
    window.history.pushState({}, "", "/portfolio");
    render(<App />);

    const heading = await screen.findByRole(
      "heading",
      { name: /taaniel vananurm/i },
      { timeout: 5_000 },
    );
    expect(heading).toBeTruthy();
  });
});
