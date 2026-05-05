// src/index.tsx (or main.tsx)
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Paste your actual Client ID from the Google Cloud Console here!
const GOOGLE_CLIENT_ID =
  "62453309474-1laq3tvv65avlk3h408io6v5fs1uu6nj.apps.googleusercontent.com";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
