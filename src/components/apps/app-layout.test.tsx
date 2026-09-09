import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppContent } from "./app-layout";
import { ToastContainer } from "@/components/system/toast-container";

afterEach(cleanup);

describe("desktop content semantics", () => {
  it("keeps one main landmark when multiple apps are open", () => {
    render(<main><AppContent>Projects</AppContent><AppContent>Contact</AppContent></main>);
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("gives the notification area a named region", () => {
    render(<ToastContainer />);
    expect(screen.getByRole("region", { name: "Notifications" })).toBeTruthy();
  });
});
