import { useContext, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Clock,
  Compass,
  MapPin,
  RadioTower,
  ShieldAlert,
  Waves
} from "lucide-react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer
} from "react-leaflet";

import { LocationContext } from "../context/locationContextValue";
import { getEarthquakes } from "../services/earthquakeService";
import { calculateDistance } from "../utils/distance";
import { getEarthquakeColor } from "../utils/earthquakeColor";

import "leaflet/dist/leaflet.css";
import "./Seismic.css";

const NUKUS_LOCATION = {
  latitude: 42.4619,
  longitude: 59.6166,
  label: "Nukus"
};

function getRiskLevel(magnitude, distance) {
  if (
    distance <= 150 &&
    magnitude >= 5
  )
    return {
      label: "Yuqori xavf",
      tone: "high",
      advice:
        "Zilzila sezilishi mumkin. Rasmiy ogohlantirishlarni kuzating va xavfsiz joylarni oldindan belgilang."
    };

  if (
    distance <= 300 &&
    magnitude >= 4
  )
    return {
      label: "O'rtacha xavf",
      tone: "medium",
      advice:
        "Hududiy seysmik faollik bor. Binoda xavfsiz chiqish yo'llarini tekshirib qo'ying."
    };

  return {
    label: "Past xavf",
    tone: "low",
    advice:
      "Hozircha yaqin atrofda katta xavf ko'rinmayapti, ammo monitoring davom etadi."
  };
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString(
    "uz-UZ",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

function enrichEarthquakes(earthquakes, latitude, longitude) {
  return earthquakes
    .map((eq) => {
      const [eqLon, eqLat, depth] =
        eq.geometry.coordinates;
      const distance = calculateDistance(
        latitude,
        longitude,
        eqLat,
        eqLon
      );

      return {
        id: eq.id,
        place: eq.properties.place || "Noma'lum joy",
        magnitude: eq.properties.mag ?? 0,
        time: eq.properties.time,
        url: eq.properties.url,
        latitude: eqLat,
        longitude: eqLon,
        depth,
        distance: Number(distance.toFixed(1))
      };
    })
    .sort((a, b) => a.distance - b.distance);
}

function Seismic() {
  const { latitude, longitude } =
    useContext(LocationContext);

  const hasUserLocation =
    typeof latitude === "number" &&
    typeof longitude === "number";

  const activeLatitude =
    hasUserLocation ? latitude : NUKUS_LOCATION.latitude;

  const activeLongitude =
    hasUserLocation ? longitude : NUKUS_LOCATION.longitude;

  const [earthquakes, setEarthquakes] =
    useState([]);

  const [period, setPeriod] =
    useState("day");

  const [minMagnitude, setMinMagnitude] =
    useState(-1);

  const [loading, setLoading] =
    useState(true);

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadData(isSilent = false) {
      try {
        if (!isSilent)
          setLoading(true);
        setError("");

        const data =
          await getEarthquakes(period);

        setEarthquakes(data);
        setLastUpdated(new Date());
      } catch (loadError) {
        console.error(loadError);
        setError("Zilzila ma'lumotlarini yuklashda xatolik yuz berdi.");
      } finally {
        setLoading(false);
      }
    }

    loadData();

    const refreshTimer = setInterval(
      () => loadData(true),
      5 * 60 * 1000
    );

    return () => clearInterval(refreshTimer);
  }, [period]);

  const enrichedEarthquakes = useMemo(
    () => {
      return enrichEarthquakes(
        earthquakes,
        activeLatitude,
        activeLongitude
      ).filter((eq) => eq.magnitude >= minMagnitude);
    },
    [
      earthquakes,
      activeLatitude,
      activeLongitude,
      minMagnitude
    ]
  );

  const strongest = useMemo(
    () => [...enrichedEarthquakes]
      .sort((a, b) => b.magnitude - a.magnitude)[0],
    [enrichedEarthquakes]
  );

  const nearest = enrichedEarthquakes[0];
  const nearbyRiskSource = enrichedEarthquakes
    .filter((eq) => eq.distance <= 300)
    .sort((a, b) => b.magnitude - a.magnitude)[0];
  const riskSource = nearbyRiskSource || nearest;
  const risk = getRiskLevel(
    riskSource?.magnitude ?? 0,
    nearest?.distance ?? 9999
  );

  return (
    <motion.div
      className="seismic-page"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <section className="seismic-hero">
        <div>
          <p>
            <MapPin size={18} />
            {hasUserLocation
              ? "Mening joylashuvim asosida"
              : `${NUKUS_LOCATION.label} standart lokatsiyasi asosida`}
          </p>
          <h1>Zilzila monitoringi</h1>
          <span>
            USGS ochiq ma'lumotlari asosida real vaqtga yaqin monitoring.
          </span>
          <span>
            Oxirgi yangilanish:
            {" "}
            {lastUpdated ? formatTime(lastUpdated) : "Kutilmoqda"}
          </span>
        </div>

        <div className={`risk-badge ${risk.tone}`}>
          <ShieldAlert size={26} />
          <strong>{risk.label}</strong>
        </div>
      </section>

      {error && (
        <div className="seismic-alert high">
          {error}
        </div>
      )}

      <section className="seismic-controls">
        <div>
          <span>Davr</span>
          <div className="segmented">
            <button
              type="button"
              className={period === "day" ? "active" : ""}
              onClick={() => setPeriod("day")}
            >
              24 soat
            </button>
            <button
              type="button"
              className={period === "week" ? "active" : ""}
              onClick={() => setPeriod("week")}
            >
              7 kun
            </button>
          </div>
        </div>

        <label>
          <span>
            Minimal magnituda:
            {" "}
            {minMagnitude < 0 ? "Barchasi" : minMagnitude}
          </span>
          <input
            type="range"
            min="-1"
            max="6"
            step="0.5"
            value={minMagnitude}
            onChange={(event) =>
              setMinMagnitude(Number(event.target.value))
            }
          />
        </label>
      </section>

      <section className="seismic-stat-grid">
        <SeismicStat
          icon={<Activity size={22} />}
          label="Zilzilalar soni"
          value={loading ? "..." : enrichedEarthquakes.length}
        />
        <SeismicStat
          icon={<Compass size={22} />}
          label="Eng yaqin"
          value={nearest ? `${nearest.distance} km` : "-"}
        />
        <SeismicStat
          icon={<Waves size={22} />}
          label="Eng kuchli"
          value={strongest ? `M ${strongest.magnitude}` : "-"}
        />
        <SeismicStat
          icon={<Clock size={22} />}
          label="So'nggi hodisa"
          value={nearest ? formatTime(nearest.time) : "-"}
        />
      </section>

      <section className="seismic-layout">
        <div className="seismic-map-panel">
          <MapContainer
            center={[
              activeLatitude,
              activeLongitude
            ]}
            zoom={3}
            className="seismic-map"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker
              position={[
                activeLatitude,
                activeLongitude
              ]}
            >
              <Popup>
                {hasUserLocation ? "Mening joylashuvim" : NUKUS_LOCATION.label}
              </Popup>
            </Marker>

            {enrichedEarthquakes.slice(0, 80).map((eq) => (
              <CircleMarker
                key={eq.id}
                center={[
                  eq.latitude,
                  eq.longitude
                ]}
                radius={Math.max(5, eq.magnitude * 2.2)}
                pathOptions={{
                  color: getEarthquakeColor(eq.magnitude),
                  fillColor: getEarthquakeColor(eq.magnitude),
                  fillOpacity: 0.42
                }}
              >
                <Popup>
                  <strong>{eq.place}</strong>
                  <br />
                  Magnituda: {eq.magnitude}
                  <br />
                  Masofa: {eq.distance} km
                  <br />
                  Chuqurlik: {Math.round(eq.depth)} km
                  <br />
                  Vaqti: {formatTime(eq.time)}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>

        <div className="seismic-ai-panel">
          <div className="panel-title">
            <RadioTower size={24} />
            <h2>AI seysmik xulosa</h2>
          </div>

          <div className={`seismic-alert ${risk.tone}`}>
            <strong>{risk.label}</strong>
            <p>{risk.advice}</p>
          </div>

          {nearest && (
            <div className="quake-highlight">
              <span>Eng yaqin hodisa</span>
              <strong>{nearest.place}</strong>
              <p>
                {nearest.distance} km uzoqlikda, magnituda {nearest.magnitude}.
              </p>
            </div>
          )}

          {strongest && (
            <div className="quake-highlight">
              <span>Eng kuchli hodisa</span>
              <strong>{strongest.place}</strong>
              <p>
                Magnituda {strongest.magnitude}, chuqurlik {Math.round(strongest.depth)} km.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="quake-list-panel">
        <div className="panel-title">
          <AlertTriangle size={24} />
          <h2>Yaqin zilzilalar ro'yxati</h2>
        </div>

        <div className="quake-list">
          {enrichedEarthquakes.slice(0, 12).map((eq) => (
            <motion.article
              className="quake-item"
              key={eq.id}
              whileHover={{ y: -3 }}
            >
              <div
                className="quake-mag"
                style={{
                  borderColor: getEarthquakeColor(eq.magnitude)
                }}
              >
                M {eq.magnitude}
              </div>
              <div>
                <h3>{eq.place}</h3>
                <p>
                  {eq.distance} km | {formatTime(eq.time)} | chuqurlik {Math.round(eq.depth)} km
                </p>
              </div>
              <a
                href={eq.url}
                target="_blank"
                rel="noreferrer"
              >
                USGS
              </a>
            </motion.article>
          ))}
        </div>
      </section>
    </motion.div>
  );
}

function SeismicStat({ icon, label, value }) {
  return (
    <motion.div
      className="seismic-stat"
      whileHover={{ y: -4 }}
    >
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </motion.div>
  );
}

export default Seismic;
