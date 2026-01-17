import { RootLayout } from "@/components/layout/RootLayout";
import { HomePage } from "@/pages/Home";
import { RoomPage } from "@/pages/Room";
import { BrowserRouter, Route, Routes } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
