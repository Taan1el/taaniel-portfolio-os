import { Download } from "lucide-react";
import { resumePdfPath } from "@/data/portfolio";
import { getNodeByPath } from "@/lib/filesystem";
import { useFileSystemStore } from "@/stores/filesystem-store";
import type { AppComponentProps } from "@/types/system";

export function ResumeApp({ window }: AppComponentProps) {
  const nodes = useFileSystemStore((state) => state.nodes);
  const selectedFile = window.payload?.filePath ? getNodeByPath(nodes, window.payload.filePath) : undefined;
  const source = selectedFile && selectedFile.kind === "file" ? selectedFile.source ?? resumePdfPath : resumePdfPath;

  return (
    <div className="resume-app">
      <header className="app-toolbar">
        <div className="app-toolbar__title">
          <strong>Resume PDF</strong>
          <small>Inline recruiter view</small>
        </div>
        <a className="pill-button" href={source} download>
          <Download size={15} />
          Download
        </a>
      </header>
      <iframe className="resume-app__frame" src={source} title="Resume PDF" />
    </div>
  );
}
