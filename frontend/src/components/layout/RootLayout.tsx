import { HeaderProvider } from "@/contexts/HeaderContext";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { PageTransition } from "./PageTransition";

export function RootLayout() {
  return (
    <HeaderProvider>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </HeaderProvider>
  );
}
