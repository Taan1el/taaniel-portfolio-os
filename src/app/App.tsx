import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DesktopShell } from "@/components/shell/desktop-shell";
import { RecruiterView } from "@/components/recruiter/recruiter-view";
import { AppErrorBoundary } from "@/components/system/app-error-boundary";

const routerBasename =
  import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL.replace(/\/$/, "");

export function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <AppErrorBoundary>
        <Routes>
          <Route path="/simple" element={<RecruiterView />} />
          <Route path="/*" element={<DesktopShell />} />
        </Routes>
      </AppErrorBoundary>
    </BrowserRouter>
  );
}
