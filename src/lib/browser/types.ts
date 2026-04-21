export interface BrowserBookmark {
  label: string;
  url: string;
}

export type BrowserFrameSource =
  | {
      kind: "src";
      value: string;
    }
  | {
      kind: "srcDoc";
      value: string;
    };

export interface BrowserResolvedDocument {
  kind: "remote" | "local";
  title: string;
  displayUrl: string;
  note: string;
  frameSource: BrowserFrameSource;
}
