import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "@/app/App";
import { installPublicSdk } from "@/lib/public-sdk";
import "@/styles/global.css";
import "@/styles/visual-redesign.css";

installPublicSdk();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
