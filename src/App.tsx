import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import GameCanvas from "./game/GameCanvas";
import MissionSelectPage from "./pages/MissionSelectPage";
import MissionPage from "./pages/MissionPage";
import ResultsPage from "./pages/ResultsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/game" element={<GameCanvas />} />
        <Route path="/missions" element={<MissionSelectPage />} />
        <Route path="/mission/:id" element={<MissionPage />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
