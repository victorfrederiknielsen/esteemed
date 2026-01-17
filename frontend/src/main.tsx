import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ColorThemeProvider } from "./contexts/ColorThemeContext";
import { ThemeProvider } from "./contexts/ThemeContext";

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ThemeProvider>
        <ColorThemeProvider>
          <App />
        </ColorThemeProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}
