import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

/**
 * Entry point for the React client application.
 * Mounts the App component to the DOM.
 */
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
