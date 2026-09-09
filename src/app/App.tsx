import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppErrorBoundary } from "@/components/system/app-error-boundary";

const RecruiterView = lazy(async () => {
  const module = await import("@/components/recruiter/recruiter-view");
  return { default: module.RecruiterView };
});

const DesktopShell = lazy(async () => {
  const module = await import("@/components/shell/desktop-shell");
  return { default: module.DesktopShell };
});

const routerBasename =
  import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL.replace(/\/$/, "");

function RecruiterRouteFallback() {
  return (
    <main
      className="os-root"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      Loading portfolio...
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <AppErrorBoundary>
        <Routes>
          <Route
            path="/portfolio"
            element={
              <Suspense fallback={<RecruiterRouteFallback />}>
                <RecruiterView />
              </Suspense>
            }
          />
          <Route path="/*" element={<Suspense fallback={<RecruiterRouteFallback />}><DesktopShell /></Suspense>} />
        </Routes>
      </AppErrorBoundary>
    </BrowserRouter>
  );
}
