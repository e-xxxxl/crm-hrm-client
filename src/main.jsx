import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./utils/installPrompt.js";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

// Pages are code-split. After a new deploy, an open tab can still reference a
// chunk filename that no longer exists; reload once to pick up the new build
// instead of leaving the user on a broken page.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  if (!sessionStorage.getItem("crmhrm.chunkReload")) {
    sessionStorage.setItem("crmhrm.chunkReload", "1");
    window.location.reload();
  }
});
// A load that gets this far worked; allow the recovery to run again after a later deploy.
window.addEventListener("load", () => setTimeout(() => sessionStorage.removeItem("crmhrm.chunkReload"), 5000));

// Progressive Web App: offline-tolerant shell + installable. Production only —
// a service worker in dev would serve stale code while editing.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* unsupported or blocked — the app works fine without it */
    });
  });
}
