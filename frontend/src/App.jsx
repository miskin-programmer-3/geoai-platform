import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useContext, useEffect } from "react";

import { ThemeContext } from "./context/themeContextValue";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";

import Dashboard from "./pages/Dashboard";
import Weather from "./pages/Weather";
import Seismic from "./pages/Seismic";
import Population from "./pages/Population";
import Profile from "./pages/Profile";
import BuildingRisk from "./pages/BuildingRisk";
import MapPage from "./pages/MapPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { sendOnlineHeartbeat } from "./services/api";

import "./App.css";

function getVisitorId() {
  const storageKey = "geoai_visitor_id";
  const savedVisitorId =
    window.localStorage.getItem(storageKey);

  if (savedVisitorId)
    return savedVisitorId;

  const newVisitorId =
    window.crypto?.randomUUID?.() ||
    `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(storageKey, newVisitorId);

  return newVisitorId;
}

function shouldTrackVisit() {
  const storageKey = "geoai_visit_tracked";

  if (window.sessionStorage.getItem(storageKey))
    return false;

  window.sessionStorage.setItem(storageKey, "1");
  return true;
}

function App() {
  const { darkMode } =
    useContext(ThemeContext);

  useEffect(() => {
    let isMounted = true;
    let firstHeartbeat = true;

    async function sendHeartbeat() {
      try {
        const visitorId = getVisitorId();
        const savedUser =
          window.localStorage.getItem("geoai_user");

        const user =
          savedUser ? JSON.parse(savedUser) : null;

        const stats =
          await sendOnlineHeartbeat({
            contact: user?.contact || null,
            visitorId,
            trackVisit: firstHeartbeat && shouldTrackVisit()
          });

        window.dispatchEvent(
          new CustomEvent(
            "geoai-stats-updated",
            { detail: stats }
          )
        );

        firstHeartbeat = false;
      } catch (error) {
        if (isMounted)
          console.error("Online holat yuborilmadi:", error);
      }
    }

    sendHeartbeat();

    const timer = window.setInterval(
      sendHeartbeat,
      15 * 1000
    );

    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <BrowserRouter>
      <div
        className={darkMode ? "app-root dark" : "app-root light"}
      >
        <Header />

        <div
          className="app-body"
        >
          <Sidebar />

          <main
            className="app-main"
          >
            <Routes>
              <Route
                path="/"
                element={<Dashboard />}
              />

              <Route
                path="/weather"
                element={<Weather />}
              />

              <Route
                path="/seismic"
                element={<Seismic />}
              />

              <Route
                path="/building-risk"
                element={<BuildingRisk />}
              />

              <Route
                path="/population"
                element={<Population />}
              />

              <Route
                path="/profile"
                element={<Profile />}
              />

              <Route
                path="/map"
                element={<MapPage />}
              />

              <Route
                path="/login"
                element={<Login />}
              />

              <Route
                path="/register"
                element={<Register />}
              />
            </Routes>
          </main>
        </div>

        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
