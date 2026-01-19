import { RootLayout } from "@/components/layout/RootLayout";
import { AdminPage } from "@/pages/Admin";
import { HomePage } from "@/pages/Home";
import { ProfilePage } from "@/pages/Profile";
import { RoomPage } from "@/pages/Room";
import { RouterProvider, createBrowserRouter } from "react-router-dom";

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/admin", element: <AdminPage /> },
      { path: "/profile", element: <ProfilePage /> },
      { path: "/room/:roomId", element: <RoomPage /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
