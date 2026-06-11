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

function App() {
  const { darkMode } =
    useContext(ThemeContext);

  useEffect(() => {
    let isMounted = true;

    async function sendHeartbeat() {
      try {
        const savedUser =
          window.localStorage.getItem("geoai_user");

        if (!savedUser)
          return;

        const user = JSON.parse(savedUser);

        if (!user?.contact)
          return;

        await sendOnlineHeartbeat(user.contact);
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
