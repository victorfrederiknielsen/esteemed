import { HeaderProvider } from "@/contexts/HeaderContext";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { PageTransition } from "./PageTransition";

export function RootLayout() {
  return (
    <HeaderProvider>
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
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
