import "./polyfills";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Force light mode globally
document.documentElement.classList.remove('dark');
document.documentElement.classList.add('light');
localStorage.setItem('theme', 'light');

createRoot(document.getElementById("root")!).render(<App />);
