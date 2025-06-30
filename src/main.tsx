import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster /> {/* Tambahkan Toaster di sini */}
  </>
);