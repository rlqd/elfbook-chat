import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App.tsx";
import Modal from 'react-modal';

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

Modal.setAppElement("#root");
Modal.defaultStyles.content = {
  ...Modal.defaultStyles.content,
  top: '50%',
  left: '50%',
  right: 'auto',
  bottom: 'auto',
  marginRight: '-50%',
  transform: 'translate(-50%, -50%)',
  border: 0,
  borderRadius: 0,
  padding: '10px',
};
Modal.defaultStyles.overlay = {
  ...Modal.defaultStyles.overlay,
  zIndex: '9999',
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexAuthProvider client={convex}>
      <App />
    </ConvexAuthProvider>
  </StrictMode>,
);
