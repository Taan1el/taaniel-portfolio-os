// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "@/app/App";

describe("App routing", () => {
  it("renders /simple recruiter view", async () => {
    window.history.pushState({}, "", "/simple");
    render(<App />);

    const heading = await screen.findByRole("heading", { name: /taaniel vananurm/i });
    expect(heading).toBeTruthy();
  });
});

