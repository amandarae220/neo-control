import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import LandingPage from "./pages/LandingPage";
import GameCanvas from "./game/GameCanvas";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/game" element={<GameCanvas />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
  );
}
