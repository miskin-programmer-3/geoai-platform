import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Building2,
  CloudSun,
  Layers,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Wind
} from "lucide-react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer
} from "react-leaflet";

import { LocationContext } from "../context/locationContextValue";
import { getEarthquakes } from "../services/earthquakeService";
import { getNearbyBuildings } from "../services/buildingService";
import { getAirQuality, getWeather } from "../services/weatherService";
import { calculateDistance } from "../utils/distance";
import { getEarthquakeColor } from "../utils/earthquakeColor";

import "leaflet/dist/leaflet.css";
import "./MapPage.css";

const NUKUS_LOCATION = {
  latitude: 42.4619,
  longitude: 59.6166,
  label: "Nukus markazi"
};

function getWeatherLabel(code) {
  if ([0, 1].includes(code))
    return "Quyoshli";

  if ([2, 3, 45, 48].includes(code))
    return "Bulutli";

  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))
    return "Yomg'irli";

  if ([95, 96, 99].includes(code))
    return "Momaqaldiroq";

  return "O'zgaruvchan";
}

function getAqiTone(aqi) {
  if (aqi === null || aqi === undefined)
    return "neutral";

  if (aqi <= 40)
    return "good";

  if (aqi <= 60)
    return "medium";

  return "danger";
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString(
    "uz-UZ",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

function getBuildingName(building) {
  return (
    building.tags?.name ||
    building.tags?.["addr:housenumber"] ||
    `Bino ${building.id}`
  );
}

function MapPage() {
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

  const [buildings, setBuildings] =
    useState([]);

  const [weather, setWeather] =
    useState(null);

  const [airQuality, setAirQuality] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const [layers, setLayers] =
    useState({
      earthquakes: true,
      buildings: true,
      weather: true,
      air: true
    });

  const loadMapData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent)
        setLoading(true);
      setError("");

      const [
        earthquakeData,
        buildingData,
        weatherData,
        airQualityData
      ] = await Promise.all([
        getEarthquakes("day"),
        getNearbyBuildings(activeLatitude, activeLongitude),
        getWeather(activeLatitude, activeLongitude),
        getAirQuality(activeLatitude, activeLongitude)
      ]);

      setEarthquakes(earthquakeData);
      setBuildings(buildingData);
      setWeather(weatherData);
      setAirQuality(airQualityData);
      setLastUpdated(new Date());
    } catch (loadError) {
      console.error(loadError);
      setError("Xarita ma'lumotlarini yuklashda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  }, [activeLatitude, activeLongitude]);

  useEffect(() => {
    const initialTimer = setTimeout(
      () => loadMapData(),
      0
    );
    const refreshTimer = setInterval(
      () => loadMapData(true),
      10 * 60 * 1000
    );

    return () => {
      clearTimeout(initialTimer);
      clearInterval(refreshTimer);
    };
  }, [loadMapData]);

  const enrichedEarthquakes = useMemo(
    () => earthquakes.map((eq) => {
      const [eqLon, eqLat, depth] =
        eq.geometry.coordinates;

      return {
        id: eq.id,
        place: eq.properties.place || "Noma'lum joy",
        magnitude: eq.properties.mag ?? 0,
        time: eq.properties.time,
        latitude: eqLat,
        longitude: eqLon,
        depth,
        distance: Number(
          calculateDistance(
            activeLatitude,
            activeLongitude,
            eqLat,
            eqLon
          ).toFixed(1)
        )
      };
    }),
    [
      earthquakes,
      activeLatitude,
      activeLongitude
    ]
  );

  const nearestEarthquake = useMemo(
    () => [...enrichedEarthquakes]
      .sort((a, b) => a.distance - b.distance)[0],
    [enrichedEarthquakes]
  );

  const visibleBuildings = useMemo(
    () => buildings
      .filter((building) => building.geometry)
      .slice(0, 80),
    [buildings]
  );

  const current = weather?.current;
  const currentAqi = airQuality?.current?.european_aqi;
  const aqiTone = getAqiTone(currentAqi);

  function toggleLayer(name) {
    setLayers((currentLayers) => ({
      ...currentLayers,
      [name]: !currentLayers[name]
    }));
  }

  return (
    <motion.div
      className="geo-map-page"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <section className="geo-map-hero">
        <div>
          <p>
            <MapPin size={18} />
            Real vaqtga yaqin geoma'lumotlar
          </p>
          <h1>GeoAI interaktiv xaritasi</h1>
          <span>
            Zilzila, bino, ob-havo va havo sifati qatlamlarini bitta xaritada ko'ring.
            {" "}
            {!hasUserLocation && `${NUKUS_LOCATION.label} bo'yicha ko'rsatilmoqda.`}
          </span>
        </div>

        <button
          type="button"
          onClick={() => loadMapData()}
          disabled={loading}
        >
          <RefreshCw size={18} />
          {loading ? "Yangilanmoqda..." : "Yangilash"}
        </button>
      </section>

      {error && (
        <div className="geo-map-error">
          {error}
        </div>
      )}

      <section className="map-summary-grid">
        <MapSummaryCard
          icon={<Activity size={22} />}
          label="Zilzilalar"
          value={earthquakes.length}
          detail={nearestEarthquake ? `Eng yaqin: ${nearestEarthquake.distance} km` : "Ma'lumot yo'q"}
        />
        <MapSummaryCard
          icon={<Building2 size={22} />}
          label="Yaqin binolar"
          value={buildings.length}
          detail="Overpass / OSM"
        />
        <MapSummaryCard
          icon={<CloudSun size={22} />}
          label="Ob-havo"
          value={current ? `${current.temperature_2m} C` : "-"}
          detail={current ? getWeatherLabel(current.weather_code) : "Yuklanmoqda"}
        />
        <MapSummaryCard
          icon={<Wind size={22} />}
          label="Havo sifati"
          value={currentAqi ?? "-"}
          detail={`AQI holati: ${aqiTone}`}
        />
      </section>

      <section className="map-workspace">
        <aside className="map-control-panel">
          <div className="panel-title">
            <Layers size={24} />
            <h2>Qatlamlar</h2>
          </div>

          {[
            {
              key: "earthquakes",
              label: "Zilzilalar",
              icon: Activity
            },
            {
              key: "buildings",
              label: "Binolar",
              icon: Building2
            },
            {
              key: "weather",
              label: "Ob-havo",
              icon: CloudSun
            },
            {
              key: "air",
              label: "Havo sifati",
              icon: Wind
            }
          ].map((layer) => {
            const Icon = layer.icon;

            return (
              <button
                type="button"
                className={layers[layer.key] ? "active" : ""}
                onClick={() => toggleLayer(layer.key)}
                key={layer.key}
              >
                <Icon size={18} />
                {layer.label}
              </button>
            );
          })}

          <div className="map-update-note">
            Oxirgi yangilanish:
            {" "}
            {lastUpdated ? formatTime(lastUpdated) : "Kutilmoqda"}
          </div>

          {nearestEarthquake && (
            <div className="map-ai-note">
              <ShieldAlert size={20} />
              <p>
                Eng yaqin zilzila {nearestEarthquake.distance} km masofada.
                Magnituda {nearestEarthquake.magnitude}.
              </p>
            </div>
          )}
        </aside>

        <div className="map-panel">
          <MapContainer
            center={[
              activeLatitude,
              activeLongitude
            ]}
            zoom={6}
            className="geo-main-map"
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

            {layers.earthquakes && enrichedEarthquakes.slice(0, 120).map((eq) => (
              <CircleMarker
                key={eq.id}
                center={[
                  eq.latitude,
                  eq.longitude
                ]}
                radius={Math.max(5, eq.magnitude * 2.1)}
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
                  Vaqti: {new Date(eq.time).toLocaleString("uz-UZ")}
                </Popup>
              </CircleMarker>
            ))}

            {layers.buildings && visibleBuildings.map((building) => {
              const positions =
                building.geometry.map((point) => [
                  point.lat,
                  point.lon
                ]);

              return (
                <Polygon
                  key={building.id}
                  positions={positions}
                  pathOptions={{
                    color: "#f97316",
                    fillColor: "#f97316",
                    fillOpacity: 0.28
                  }}
                >
                  <Popup>
                    {getBuildingName(building)}
                  </Popup>
                </Polygon>
              );
            })}

            {layers.weather && current && (
              <CircleMarker
                center={[
                  activeLatitude,
                  activeLongitude
                ]}
                radius={26}
                pathOptions={{
                  color: "#38bdf8",
                  fillColor: "#38bdf8",
                  fillOpacity: 0.22
                }}
              >
                <Popup>
                  <strong>Ob-havo</strong>
                  <br />
                  Harorat: {current.temperature_2m} C
                  <br />
                  Shamol: {current.wind_speed_10m} km/soat
                  <br />
                  Holat: {getWeatherLabel(current.weather_code)}
                </Popup>
              </CircleMarker>
            )}

            {layers.air && currentAqi !== undefined && (
              <CircleMarker
                center={[
                  activeLatitude + 0.01,
                  activeLongitude + 0.01
                ]}
                radius={22}
                pathOptions={{
                  color: currentAqi > 60 ? "#ef4444" : "#22c55e",
                  fillColor: currentAqi > 60 ? "#ef4444" : "#22c55e",
                  fillOpacity: 0.24
                }}
              >
                <Popup>
                  <strong>Havo sifati</strong>
                  <br />
                  AQI: {currentAqi}
                  <br />
                  PM2.5: {airQuality?.current?.pm2_5 ?? "-"}
                </Popup>
              </CircleMarker>
            )}
          </MapContainer>
        </div>
      </section>
    </motion.div>
  );
}

function MapSummaryCard({ icon, label, value, detail }) {
  return (
    <motion.div
      className="map-summary-card"
      whileHover={{ y: -4 }}
    >
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </motion.div>
  );
}

export default MapPage;
