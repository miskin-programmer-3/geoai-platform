import { useContext, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CloudRain,
  Droplets,
  Leaf,
  MapPin,
  MessageSquareWarning,
  ShieldCheck,
  Sun,
  Thermometer,
  Umbrella,
  Wind
} from "lucide-react";

import { LocationContext } from "../context/locationContextValue";

import { getLocationInfo } from "../services/locationService";
import { getWeather, getAirQuality } from "../services/weatherService";
import {
  getAirQualityLevel,
  getAirQualityReason,
  getOutdoorAdvice
} from "../services/weatherAdviceService";
import { getEarthquakes } from "../services/earthquakeService";
import { getCityPopulationHistory } from "../services/populationService";
import { createWeatherAlert } from "../services/api";

import PopulationChart from "../components/PopulationChart";
import StatCard from "../components/cards/StatCard";
import "./Dashboard.css";

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 16
  },
  visible: {
    opacity: 1,
    y: 0
  }
};

const staggerGroup = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

const NUKUS_LOCATION = {
  latitude: 42.4619,
  longitude: 59.6166,
  label: "Nukus"
};

function describeWeather(code) {
  if ([0, 1].includes(code))
    return {
      label: "Quyoshli",
      icon: Sun,
      detail: "Ochiq va yorug' havo"
    };

  if ([2, 3, 45, 48].includes(code))
    return {
      label: "Bulutli",
      icon: CloudRain,
      detail: "Bulutli yoki tumanli havo"
    };

  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))
    return {
      label: "Yomg'irli",
      icon: Umbrella,
      detail: "Yomg'ir ehtimoli yuqori"
    };

  if ([95, 96, 99].includes(code))
    return {
      label: "Momaqaldiroq",
      icon: AlertTriangle,
      detail: "Keskin ob-havo xavfi bor"
    };

  return {
    label: "O'zgaruvchan",
    icon: CloudRain,
    detail: "Ob-havo tez o'zgarishi mumkin"
  };
}

function buildWeatherAlerts({
  temperature,
  rainProbability,
  windGusts,
  aqi
}) {
  const alerts = [];

  if (temperature >= 36)
    alerts.push({
      title: "Juda issiq havo",
      message: "Harorat yuqori. Suv iching va quyoshda uzoq qolmang.",
      severity: "high"
    });

  if (rainProbability >= 75)
    alerts.push({
      title: "Kuchli yomg'ir ehtimoli",
      message: "Yomg'ir ehtimoli yuqori. Yo'lga chiqishda ehtiyot bo'ling.",
      severity: "medium"
    });

  if (windGusts >= 55)
    alerts.push({
      title: "Kuchli shamol xavfi",
      message: "Shamol kuchayishi mumkin. Ochiq joylarda ehtiyot bo'ling.",
      severity: "high"
    });

  if (aqi > 60)
    alerts.push({
      title: "Havo sifati yomonlashgan",
      message: "Havo ifloslanishi yuqori. Tashqarida uzoq qolmang.",
      severity: "medium"
    });

  return alerts;
}

function getBestWalkTimes(weather) {
  const hourly = weather?.hourly;

  if (!hourly?.time)
    return [];

  const candidates = hourly.time
    .map((time, index) => ({
      time,
      temperature: hourly.temperature_2m[index],
      rainProbability: hourly.precipitation_probability[index],
      windSpeed: hourly.wind_speed_10m[index],
      humidity: hourly.relative_humidity_2m[index]
    }))
    .filter((item) => {
      const hour = new Date(item.time).getHours();

      return (
        hour >= 6 &&
        hour <= 23 &&
        item.temperature >= 12 &&
        item.temperature <= 33 &&
        item.rainProbability <= 45 &&
        item.windSpeed <= 35 &&
        item.humidity <= 88
      );
    });

  const periods = [
    {
      label: "Ertalab",
      from: 6,
      to: 11
    },
    {
      label: "Kunduzi",
      from: 12,
      to: 17
    },
    {
      label: "Kechqurun",
      from: 18,
      to: 23
    }
  ];

  return periods
    .map((period) => {
      const best = candidates
        .filter((item) => {
          const hour = new Date(item.time).getHours();

          return hour >= period.from && hour <= period.to;
        })
        .sort((a, b) => {
          const aScore =
            a.rainProbability +
            Math.abs(a.temperature - 24) * 2 +
            a.windSpeed;
          const bScore =
            b.rainProbability +
            Math.abs(b.temperature - 24) * 2 +
            b.windSpeed;

          return aScore - bScore;
        })[0];

      if (!best)
        return null;

      return {
        ...best,
        period: period.label
      };
    })
    .filter(Boolean);
}

function formatHour(dateTime) {
  return new Date(dateTime).toLocaleTimeString(
    "uz-UZ",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

function formatDateTime(dateTime) {
  if (!dateTime)
    return "Vaqt noma'lum";

  return new Date(dateTime).toLocaleString(
    "uz-UZ",
    {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

function Dashboard() {
  const { latitude, longitude } =
    useContext(LocationContext);

  const hasUserLocation =
    typeof latitude === "number" &&
    typeof longitude === "number";

  const activeLatitude =
    hasUserLocation ? latitude : NUKUS_LOCATION.latitude;

  const activeLongitude =
    hasUserLocation ? longitude : NUKUS_LOCATION.longitude;

  const [city, setCity] =
    useState(NUKUS_LOCATION.label);

  const [weather, setWeather] =
    useState(null);

  const [airQuality, setAirQuality] =
    useState(null);

  const [eqCount, setEqCount] =
    useState(0);

  const [populationInfo, setPopulationInfo] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const [error, setError] =
    useState("");

  const [smsStatus, setSmsStatus] =
    useState("");

  const [showAirReason, setShowAirReason] =
    useState(false);

  const [showAdviceReason, setShowAdviceReason] =
    useState(false);

  useEffect(() => {
    async function loadData(isSilent = false) {
      try {
        if (!isSilent)
          setLoading(true);
        setError("");

        const locationData =
          await getLocationInfo(activeLatitude, activeLongitude);

        const detectedCity =
          locationData.address.city ||
          locationData.address.town ||
          locationData.address.village ||
          locationData.address.county ||
          "Noma'lum";

        setCity(detectedCity);

        const [
          weatherData,
          airQualityData,
          earthquakes,
          populationData
        ] = await Promise.all([
          getWeather(activeLatitude, activeLongitude),
          getAirQuality(activeLatitude, activeLongitude),
          getEarthquakes(),
          getCityPopulationHistory({
            cityName: detectedCity,
            locationData
          })
        ]);

        setWeather(weatherData);
        setAirQuality(airQualityData);
        setEqCount(earthquakes.length);
        setPopulationInfo(populationData);
        setLastUpdated(new Date());
      } catch (loadError) {
        console.error(loadError);
        setError("Ob-havo ma'lumotlarini yuklashda xatolik yuz berdi.");
      } finally {
        setLoading(false);
      }
    }

    loadData();

    const refreshTimer = setInterval(
      () => loadData(true),
      10 * 60 * 1000
    );

    return () => clearInterval(refreshTimer);
  }, [activeLatitude, activeLongitude]);

  const current = weather?.current;
  const currentAir = airQuality?.current;
  const currentAqi = airQuality?.current?.european_aqi;
  const rainProbability =
    weather?.hourly?.precipitation_probability?.[0] ?? 0;

  const weatherInfo = useMemo(
    () => describeWeather(current?.weather_code),
    [current?.weather_code]
  );

  const airInfo = useMemo(
    () => getAirQualityLevel(currentAqi),
    [currentAqi]
  );

  const airReason = useMemo(
    () => getAirQualityReason(currentAir),
    [currentAir]
  );

  const advice = useMemo(
    () => getOutdoorAdvice({
      temperature: current?.temperature_2m ?? 0,
      humidity: current?.relative_humidity_2m ?? 0,
      rainProbability,
      windSpeed: current?.wind_speed_10m ?? 0,
      aqi: currentAqi ?? 0,
      airReason
    }),
    [
      current?.temperature_2m,
      current?.relative_humidity_2m,
      current?.wind_speed_10m,
      currentAqi,
      rainProbability,
      airReason
    ]
  );

  const alerts = useMemo(
    () => buildWeatherAlerts({
      temperature: current?.temperature_2m ?? 0,
      rainProbability,
      windGusts: current?.wind_gusts_10m ?? 0,
      aqi: currentAqi ?? 0
    }),
    [
      current?.temperature_2m,
      current?.wind_gusts_10m,
      currentAqi,
      rainProbability
    ]
  );

  const walkTimes = useMemo(
    () => getBestWalkTimes(weather),
    [weather]
  );

  const WeatherIcon = weatherInfo.icon;

  async function handleSmsDemo(alert) {
    try {
      const response = await createWeatherAlert({
        phone: "+998901234567",
        isRegistered: true,
        alertTitle: alert.title,
        alertMessage: alert.message,
        severity: alert.severity
      });

      setSmsStatus(response.message);
    } catch (smsError) {
      console.error(smsError);
      setSmsStatus("SMS ogohlantirish API bilan bog'lanishda xatolik yuz berdi.");
    }
  }

  return (
    <motion.div
      className="dashboard-page"
      variants={staggerGroup}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        className="dashboard-heading"
        variants={fadeUp}
        transition={{ duration: 0.35 }}
      >
        <div>
          <h1>GeoAI boshqaruv paneli</h1>
          <p>
            <MapPin size={18} />
            Joylashuv: {city}
            {!hasUserLocation && " (standart lokatsiya)"}
          </p>
          <p>
            Real vaqt: {formatDateTime(current?.time)}
          </p>
          <p>
            Oxirgi yangilanish: {lastUpdated ? formatDateTime(lastUpdated) : "Kutilmoqda"}
          </p>
        </div>

        <motion.div
          className={`weather-badge live ${airInfo.tone}`}
          whileHover={{ scale: 1.04 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <span className="weather-badge-orbit">
            <WeatherIcon size={28} />
          </span>
          <span>
            <small>Hozirgi holat</small>
            <strong>{weatherInfo.label}</strong>
          </span>
        </motion.div>
      </motion.div>

      {error && (
        <motion.div
          className="alert-panel danger"
          variants={fadeUp}
        >
          {error}
        </motion.div>
      )}

      <motion.div
        className="stat-grid"
        variants={staggerGroup}
      >
        {[
          {
            title: `Harorat (${city})`,
            value: loading ? "..." : `${current?.temperature_2m ?? "-"} C`
          },
          {
            title: "Namlik",
            value: loading ? "..." : `${current?.relative_humidity_2m ?? "-"}%`
          },
          {
            title: "Yomg'ir ehtimoli",
            value: loading ? "..." : `${rainProbability}%`
          },
          {
            title: "Zilzilalar",
            value: eqCount
          }
        ].map((item) => (
          <motion.div
            variants={fadeUp}
            whileHover={{ y: -4 }}
            key={item.title}
          >
            <StatCard
              title={item.title}
              value={item.value}
            />
          </motion.div>
        ))}
      </motion.div>

      <motion.section
        className="weather-layout"
        variants={staggerGroup}
      >
        <motion.div
          className="weather-panel primary"
          variants={fadeUp}
          whileHover={{ y: -4 }}
        >
          <div className="panel-title">
            <WeatherIcon size={24} />
            <h2>Joriy ob-havo tahlili</h2>
          </div>

          <p className="weather-summary">
            {weatherInfo.detail}
          </p>

          <div className="metric-grid">
            <div>
              <Thermometer size={20} />
              <span>Harorat</span>
              <strong>{current?.temperature_2m ?? "-"} C</strong>
            </div>

            <div>
              <Droplets size={20} />
              <span>Namlik</span>
              <strong>{current?.relative_humidity_2m ?? "-"}%</strong>
            </div>

            <div>
              <Umbrella size={20} />
              <span>Yomg'ir</span>
              <strong>{rainProbability}%</strong>
            </div>

            <div>
              <Wind size={20} />
              <span>Shamol</span>
              <strong>{current?.wind_speed_10m ?? "-"} km/soat</strong>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="weather-panel"
          variants={fadeUp}
          whileHover={{ y: -4 }}
        >
          <div className="panel-title">
            <Leaf size={24} />
            <h2>Havo tozaligi</h2>
          </div>

          <div className={`aqi-status ${airInfo.tone}`}>
            {airInfo.label}
          </div>

          <p>
            AQI: {currentAqi ?? "-"} | PM2.5: {airQuality?.current?.pm2_5 ?? "-"}
          </p>

          <button
            className="detail-toggle"
            type="button"
            onClick={() => setShowAirReason(!showAirReason)}
          >
            {showAirReason ? "Sababni yashirish" : "Nega bunday?"}
          </button>

          {showAirReason && (
            <div className="detail-box">
              <strong>Havo sifati sababi</strong>
              <p>{airReason}</p>
            </div>
          )}

          <div className={`air-recommendation ${airInfo.tone}`}>
            {airInfo.recommendation}
          </div>
        </motion.div>

        <motion.div
          className="weather-panel"
          variants={fadeUp}
          whileHover={{ y: -4 }}
        >
          <div className="panel-title">
            <ShieldCheck size={24} />
            <h2>Ko'chaga chiqish tavsiyasi</h2>
          </div>

          <p>{advice}</p>

          <button
            className="detail-toggle"
            type="button"
            onClick={() => setShowAdviceReason(!showAdviceReason)}
          >
            {showAdviceReason ? "Tahlilni yashirish" : "Tavsiya sababi"}
          </button>

          {showAdviceReason && (
            <div className="detail-box">
              <strong>Tavsiya qanday hisoblandi?</strong>
              <p>
                Harorat: {current?.temperature_2m ?? "-"} C,
                {" "}
                namlik: {current?.relative_humidity_2m ?? "-"}%,
                {" "}
                yomg'ir ehtimoli: {rainProbability}%,
                {" "}
                shamol: {current?.wind_speed_10m ?? "-"} km/soat,
                {" "}
                AQI: {currentAqi ?? "-"}.
              </p>
              <p className="advice-note">
                Tahlil harorat, namlik, yomg'ir ehtimoli, shamol va havo sifati asosida real vaqtga yaqin hisoblanadi.
              </p>
            </div>
          )}
        </motion.div>
      </motion.section>

      <motion.section
        className="weather-layout compact"
        variants={staggerGroup}
      >
        <motion.div
          className="weather-panel"
          variants={fadeUp}
          whileHover={{ y: -4 }}
        >
          <div className="panel-title">
            <Sun size={24} />
            <h2>Sayr uchun mos vaqtlar</h2>
          </div>

          {walkTimes.length === 0 ? (
            <p>
              Yaqin soatlarda sayr uchun ideal sharoit topilmadi.
            </p>
          ) : (
            <div className="walk-list">
              {walkTimes.map((item) => (
                <div
                  className="walk-time"
                  key={item.time}
                >
                  <strong>{item.period}: {formatHour(item.time)}</strong>
                  <span>{item.temperature} C</span>
                  <span>Yomg'ir: {item.rainProbability}%</span>
                  <span>Shamol: {item.windSpeed} km/soat</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div
          className="weather-panel"
          variants={fadeUp}
          whileHover={{ y: -4 }}
        >
          <div className="panel-title">
            <MessageSquareWarning size={24} />
            <h2>AI ogohlantirishlar</h2>
          </div>

          {alerts.length === 0 ? (
            <div className="alert-panel success">
              Hozircha xavfli ob-havo ogohlantirishi yo'q.
            </div>
          ) : (
            <div className="alert-list">
              {alerts.map((alert) => (
                <div
                  className={`alert-panel ${alert.severity}`}
                  key={alert.title}
                >
                  <strong>{alert.title}</strong>
                  <p>{alert.message}</p>

                  <button
                    type="button"
                    onClick={() => handleSmsDemo(alert)}
                  >
                    SMS ogohlantirishni tayyorlash
                  </button>
                </div>
              ))}
            </div>
          )}

          {smsStatus && (
            <p className="sms-status">
              {smsStatus}
            </p>
          )}
        </motion.div>
      </motion.section>

      <motion.section
        className="chart-section"
        variants={fadeUp}
        transition={{ duration: 0.35 }}
      >
        <div className="population-heading">
          <div>
            <h2>{city} shahri aholisi o'sishi</h2>
            <p>
              Manba: {populationInfo?.source ?? "Wikidata"}.
              {" "}
              {populationInfo?.note}
            </p>
          </div>

          <div className="population-summary">
            <span>
              So'nggi raqam:
              {" "}
              <strong>
                {populationInfo?.latestPopulation
                  ? populationInfo.latestPopulation.toLocaleString("uz-UZ")
                  : "-"}
              </strong>
            </span>
            <span>
              O'rtacha o'sish:
              {" "}
              <strong>
                {populationInfo?.averageGrowthRate !== null &&
                populationInfo?.averageGrowthRate !== undefined
                  ? `${populationInfo.averageGrowthRate}%`
                  : "-"}
              </strong>
            </span>
          </div>
        </div>

        <PopulationChart data={populationInfo?.data ?? []} />

        {populationInfo?.forecast?.length > 0 && (
          <div className="forecast-list">
            <h3>2030-yilgacha AI taxmin</h3>

            <div className="forecast-grid">
              {populationInfo.forecast.map((item) => (
                <div
                  className="forecast-item"
                  key={item.year}
                >
                  <span>{item.year}</span>
                  <strong>
                    {item.forecastPopulation.toLocaleString("uz-UZ")}
                  </strong>
                  <small>
                    +{item.forecastGrowthRate}% taxminiy o'sish
                  </small>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}

export default Dashboard;
