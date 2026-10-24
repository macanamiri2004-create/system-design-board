import "@fontsource-variable/geist/index.css";
import "@fontsource-variable/geist-mono/index.css";
import "@excalidraw/excalidraw/index.css";
import "./styles/tokens.css";
import "./styles/app.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("[sdb] #root element missing from index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
