import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "@/pages/Home";
import { RoomPage } from "@/pages/Room";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
