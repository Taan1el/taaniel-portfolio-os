import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SafeImage } from "./safe-image";

afterEach(cleanup);

describe("SafeImage", () => {
  it("shows a named fallback without requesting a missing placeholder", () => {
    render(<SafeImage src="/missing.png" alt="Project screenshot" />);
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByRole("img").textContent).toBe("Image unavailable");
    expect(document.querySelector("img")).toBeNull();
  });

  it("loads a new source after a previous image fails", () => {
    const view = render(<SafeImage src="/missing.png" alt="Project screenshot" />);
    fireEvent.error(screen.getByRole("img"));
    view.rerender(<SafeImage src="/next.png" alt="Next project" />);
    const image = screen.getByRole("img") as HTMLImageElement;
    expect(image.getAttribute("src")).toBe("/next.png");
    fireEvent.load(image);
    expect(image.style.opacity).toBe("");
  });
});
