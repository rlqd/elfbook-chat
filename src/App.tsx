import { HashRouter, Route, Routes } from "react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import AuthForm from "./screens/AuthForm";
import SpaceManager from "./screens/SpaceManager";

export default function App() {
  return (
    <>
      <Authenticated>
        <HashRouter>
          <Routes>
            <Route index element={<SpaceManager />} />
          </Routes>
        </HashRouter>
      </Authenticated>
      <Unauthenticated>
        <AuthForm />
      </Unauthenticated>
    </>
  );
}
