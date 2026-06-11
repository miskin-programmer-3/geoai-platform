import { useContext, useEffect, useState } from "react";
import { Moon, Sun, Users, Wifi } from "lucide-react";
import { ThemeContext } from "../context/themeContextValue";
import Logo from "./Logo";
import { getAuthStats } from "../services/api";

import "./Header.css";

function Header() {
  const { darkMode, toggleTheme } =
    useContext(ThemeContext);

  const [stats, setStats] =
    useState({
      registeredUsers: 0,
      onlineUsers: 0
    });

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      try {
        const data =
          await getAuthStats();

        if (!isMounted)
          return;

        setStats({
          registeredUsers: data.registered_users ?? 0,
          onlineUsers: data.online_users ?? 0
        });
      } catch (error) {
        console.error("Auth stats yuklanmadi:", error);
      }
    }

    loadStats();

    const timer = setInterval(
      loadStats,
      20 * 1000
    );

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <header className="app-header">
      <div className="header-brand">
        <Logo subtitle />
      </div>

      <div className="header-actions">
        <div className="header-stats">
          <span className="header-stat">
            <Users size={16} />
            <strong>{stats.registeredUsers}</strong>
            <small>ro'yxatdan o'tgan</small>
          </span>

          <span className="header-stat online">
            <Wifi size={16} />
            <strong>{stats.onlineUsers}</strong>
            <small>online</small>
          </span>
        </div>

        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={darkMode ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"}
          title={darkMode ? "Yorug' rejim" : "Qorong'i rejim"}
        >
          <span className="theme-toggle-track">
            <span className="theme-toggle-icon sun">
              <Sun size={16} />
            </span>
            <span className="theme-toggle-icon moon">
              <Moon size={16} />
            </span>
            <span className="theme-toggle-thumb">
              {darkMode ? <Moon size={17} /> : <Sun size={17} />}
            </span>
          </span>

          <span className="theme-toggle-label">
            {darkMode ? "Qorong'i" : "Yorug'"}
          </span>
        </button>
      </div>
    </header>
  );
}

export default Header;
