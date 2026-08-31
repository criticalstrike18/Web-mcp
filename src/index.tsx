import * as React from "react";
import { createRoot } from "react-dom/client";
import manifest from "./artworks/manifest.json";
import { App } from "./app";
import "./index.css";
import { initWebMCP } from "./webmcp";

// Initialize WebMCP tools immediately on page script evaluation
initWebMCP(manifest as any);

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
