import React, { createContext, useContext, useEffect, useState } from "react";

// Same behaviour as the app: follow the device until the user flips the
// switch, then remember their choice.
//   no choice → <html> has no data-theme, CSS follows prefers-color-scheme
//   choice    → <html data-theme="light|dark"> overrides the device
const KEY = "theme_override";
const ThemeContext = createContext({ colorScheme: "light", toggleTheme: () => {} });

const readOverride = () => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
};

const systemScheme = () =>
  window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export const ThemeProvider = ({ children }) => {
  const [override, setOverride] = useState(readOverride);
  const [system, setSystem] = useState(systemScheme);

  // Follow the device while no choice has been made
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(mq.matches ? "dark" : "light");
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (override) root.setAttribute("data-theme", override);
    else root.removeAttribute("data-theme");
    root.style.colorScheme = override || "light dark"; // native inputs/scrollbars match
  }, [override]);

  const colorScheme = override || system;

  const toggleTheme = () => {
    const next = colorScheme === "dark" ? "light" : "dark";
    setOverride(next);
    try { localStorage.setItem(KEY, next); } catch { /* private mode: still works for this visit */ }
  };

  return (
    <ThemeContext.Provider value={{ colorScheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
