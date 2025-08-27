import { useState, useEffect, useContext, createContext } from "react";
import { getSystemTheme, setSystemTheme } from "../utils/api";

const ThemeContext = createContext({ theme: "light", setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("light");

  useEffect(() => {
    getSystemTheme().then((t) => {
      setThemeState(t);
      document.documentElement.setAttribute("data-theme", t);
    });
  }, []);

  const setTheme = (t) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    setSystemTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
} 