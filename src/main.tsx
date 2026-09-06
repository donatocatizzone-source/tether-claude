import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  // Dark by default. The B2B console is entirely token-driven, so this one
  // line puts the whole professional surface into the dark scheme — no
  // per-component work. Light remains a working toggle.
  //
  // enableSystem stays false deliberately: a safety product silently changing
  // appearance because the OS flipped at sunset is worse than a stable choice.
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
    <App />
  </ThemeProvider>,
);
