import { HashRouter, Route, Routes } from "react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import AuthForm from "./screens/AuthForm";
import SpaceManager from "./screens/SpaceManager";
import NewChat from "./screens/NewChat";
import ExistingChat from "./screens/ExistingChat";
import Space from "./layouts/Space";

export default function App() {
  return (
    <>
      <Authenticated>
        <HashRouter>
          <Routes>
            <Route index element={<SpaceManager />} />
            <Route path=":spaceId" element={<Space />}>
              <Route path="new" element={<NewChat />} />
              <Route path="c/:chatId" element={<ExistingChat />} />
            </Route>
          </Routes>
        </HashRouter>
      </Authenticated>
      <Unauthenticated>
        <AuthForm />
      </Unauthenticated>
    </>
  );
}
