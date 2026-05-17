import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuraliseLandingPage } from "./components/AuraliseLandingPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./index.css";

const path = window.location.pathname;
const params = new URLSearchParams(window.location.search);
const hasSharePayload = params.has("share") || params.has("profile");
const isAutomationBrowser = typeof navigator !== "undefined" && navigator.webdriver;
const shouldRenderLanding =
  (path === "/" || path === "/landing") &&
  !hasSharePayload &&
  !isAutomationBrowser;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {shouldRenderLanding ? <AuraliseLandingPage /> : <App />}
    </ErrorBoundary>
  </React.StrictMode>
);
