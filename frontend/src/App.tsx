import { RootLayout } from "@/components/layout/RootLayout";
import { HomePage } from "@/pages/Home";
import { RoomPage } from "@/pages/Room";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/room/:roomId", element: <RoomPage /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
