// frontend/src/context/ThemeContext.jsx

import { useState } from "react";
import { ThemeContext } from "./themeContextValue";

export function ThemeProvider({ children }) {

  const [darkMode, setDarkMode] = useState(true);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        toggleTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
