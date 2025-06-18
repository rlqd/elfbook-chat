import { HashRouter, Route, Routes } from "react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import AuthForm from "./screens/AuthForm";
import SpaceManager from "./screens/SpaceManager";
import NewChat from "./screens/NewChat";
import ExistingChat from "./screens/ExistingChat";

export default function App() {
  return (
    <>
      <Authenticated>
        <HashRouter>
          <Routes>
            <Route index element={<SpaceManager />} />
            <Route path=":spaceId/new" element={<NewChat />} />
            <Route path=":spaceId/c/:chatId" element={<ExistingChat />} />
          </Routes>
        </HashRouter>
      </Authenticated>
      <Unauthenticated>
        <AuthForm />
      </Unauthenticated>
    </>
  );
}
