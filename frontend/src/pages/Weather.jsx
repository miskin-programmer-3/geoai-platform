import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Cloud,
  CloudRain,
  Droplets,
  Gauge,
  MapPin,
  Moon,
  Navigation,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Umbrella,
  Wind,
  Zap
} from "lucide-react";

import { LocationContext }
from "../context/locationContextValue";

import { getLocationInfo }
from "../services/locationService";

import { getWeather, getAirQuality }
from "../services/weatherService";

import {
  getAirQualityLevel,
  getAirQualityReason,
  getUnifiedOutdoorTip
} from "../services/weatherAdviceService";

import "./Weather.css";

const NUKUS_LOCATION = {
  latitude: 42.4619,
  longitude: 59.6166,
  label: "Nukus"
};

function getWeatherMeta(code) {
  if ([0, 1].includes(code))
    return {
      label: "Quyoshli",
      description: "Ochiq osmon, quyoshli havo",
      icon: Sun,
      tone: "sunny"
    };

  if ([2, 3, 45, 48].includes(code))
    return {
      label: "Bulutli",
      description: "Bulutli yoki tumanli havo",
      icon: Cloud,
      tone: "cloudy"
    };

  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code))
    return {
      label: "Yomg'irli",
      description: "Yomg'ir ehtimoli bor",
      icon: CloudRain,
      tone: "rainy"
    };

  if ([95, 96, 99].includes(code))
    return {
      label: "Momaqaldiroq",
      description: "Keskin ob-havo kuzatilishi mumkin",
      icon: Zap,
      tone: "storm"
    };

  return {
    label: "O'zgaruvchan",
    description: "Ob-havo o'zgaruvchan",
    icon: Cloud,
    tone: "cloudy"
  };
}

function formatDay(date) {
  return new Date(date).toLocaleDateString(
    "uz-UZ",
    {
      weekday: "short",
      day: "2-digit",
      month: "short"
    }
  );
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

function buildDailyForecast(weather) {
  const daily = weather?.daily;

  if (!daily?.time)
    return [];

  return daily.time.map((date, index) => ({
    date,
    code: daily.weather_code[index],
    max: daily.temperature_2m_max[index],
    min: daily.temperature_2m_min[index],
    rainChance: daily.precipitation_probability_max[index],
    rainSum: daily.precipitation_sum[index],
    wind: daily.wind_speed_10m_max[index],
    gust: daily.wind_gusts_10m_max[index],
    uv: daily.uv_index_max[index],
    sunrise: daily.sunrise[index],
    sunset: daily.sunset[index]
  }));
}

function buildHourlyForecast(weather) {
  const hourly = weather?.hourly;

  if (!hourly?.time)
    return [];

  const now = new Date();

  return hourly.time
    .map((time, index) => ({
      time,
      code: hourly.weather_code[index],
      temperature: hourly.temperature_2m[index],
      apparent: hourly.apparent_temperature[index],
      rainChance: hourly.precipitation_probability[index],
      humidity: hourly.relative_humidity_2m[index],
      wind: hourly.wind_speed_10m[index]
    }))
    .filter((item) => new Date(item.time) >= now)
    .slice(0, 12);
}

function Weather() {
  const { latitude, longitude } =
    useContext(LocationContext);

  const hasUserLocation =
    typeof latitude === "number" &&
    typeof longitude === "number";

  const activeLatitude =
    hasUserLocation ? latitude : NUKUS_LOCATION.latitude;

  const activeLongitude =
    hasUserLocation ? longitude : NUKUS_LOCATION.longitude;

  const [weather, setWeather] =
    useState(null);

  const [airQuality, setAirQuality] =
    useState(null);

  const [city, setCity] =
    useState(NUKUS_LOCATION.label);

  const [loading, setLoading] =
    useState(true);

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const [error, setError] =
    useState("");

  const loadWeather = useCallback(async (isSilent = false) => {
      try {
        if (!isSilent)
          setLoading(true);
        setError("");

        const [locationData, weatherData, airQualityData] =
          await Promise.all([
            getLocationInfo(activeLatitude, activeLongitude),
            getWeather(activeLatitude, activeLongitude),
            getAirQuality(activeLatitude, activeLongitude)
          ]);

        setCity(
          locationData.address.city ||
          locationData.address.town ||
          locationData.address.village ||
          locationData.address.county ||
          "Noma'lum"
        );

        setWeather(weatherData);
        setAirQuality(airQualityData);
        setLastUpdated(new Date());
      } catch (loadError) {
        console.error(loadError);
        setError("Ob-havo ma'lumotlarini yuklashda xatolik yuz berdi.");
      } finally {
        setLoading(false);
      }
  }, [activeLatitude, activeLongitude]);

  useEffect(() => {
    const initialTimer = setTimeout(
      () => loadWeather(),
      0
    );

    const refreshTimer = setInterval(
      () => loadWeather(true),
      10 * 60 * 1000
    );

    return () => {
      clearTimeout(initialTimer);
      clearInterval(refreshTimer);
    };
  }, [loadWeather]);

  const current = weather?.current;
  const dailyForecast = useMemo(
    () => buildDailyForecast(weather),
    [weather]
  );
  const hourlyForecast = useMemo(
    () => buildHourlyForecast(weather),
    [weather]
  );
  const currentRainChance =
    hourlyForecast[0]?.rainChance ?? 0;
  const currentAir = airQuality?.current;
  const currentAqi = currentAir?.european_aqi;
  const airInfo = useMemo(
    () => getAirQualityLevel(currentAqi),
    [currentAqi]
  );
  const airReason = useMemo(
    () => getAirQualityReason(currentAir),
    [currentAir]
  );
  const meta = getWeatherMeta(current?.weather_code);
  const outdoorTip = current
    ? getUnifiedOutdoorTip({
      temperature: current.temperature_2m ?? 0,
      humidity: current.relative_humidity_2m ?? 0,
      rainProbability: currentRainChance,
      windSpeed: current.wind_speed_10m ?? 0,
      aqi: currentAqi ?? 0,
      airReason
    })
    : {
      level: "neutral",
      label: "Kutilmoqda",
      text: "Ma'lumot yuklanmoqda."
    };
  const WeatherIcon = meta.icon;

  return (
    <div className="weather-page">
      <motion.section
        className={`weather-hero ${meta.tone}`}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="weather-hero-content">
          <div>
            <p className="weather-location">
              <MapPin size={18} />
              {city}
              {!hasUserLocation && " (standart lokatsiya)"}
            </p>
            <h1>Ob-havo markazi</h1>
            <p className="weather-description">
              {meta.description}
            </p>
            <p className="weather-description">
              Oxirgi yangilanish:
              {" "}
              {lastUpdated ? formatHour(lastUpdated) : "Kutilmoqda"}
            </p>
          </div>

          <div className="weather-hero-actions">
            <button
              type="button"
              onClick={() => loadWeather()}
              disabled={loading}
            >
              {loading ? "Yangilanmoqda..." : "Yangilash"}
            </button>

            <motion.div
              className="weather-orbit"
              animate={{
                rotate: [0, 4, -4, 0],
                scale: [1, 1.04, 1]
              }}
              transition={{
                duration: 4,
                repeat: Infinity
              }}
            >
              <WeatherIcon size={72} />
            </motion.div>
          </div>
        </div>

        <div className="weather-hero-bottom">
          <div className="weather-temp">
            {loading ? "..." : Math.round(current?.temperature_2m ?? 0)}
            <span>C</span>
          </div>

          <div className="weather-hero-meta">
            <strong>{meta.label}</strong>
            <span>
              His qilinishi:
              {" "}
              {current?.apparent_temperature ?? "-"} C
            </span>
            <span>
              Real vaqt:
              {" "}
              {current?.time ? formatHour(current.time) : "-"}
            </span>
          </div>
        </div>
      </motion.section>

      {error && (
        <div className="weather-error">
          {error}
        </div>
      )}

      <section className="weather-current-grid">
        <WeatherMetric
          icon={<Droplets size={22} />}
          label="Namlik"
          value={`${current?.relative_humidity_2m ?? "-"}%`}
        />
        <WeatherMetric
          icon={<Umbrella size={22} />}
          label="Yomg'ir ehtimoli"
          value={`${currentRainChance}%`}
        />
        <WeatherMetric
          icon={<Wind size={22} />}
          label="Shamol"
          value={`${current?.wind_speed_10m ?? "-"} km/soat`}
        />
        <WeatherMetric
          icon={<Gauge size={22} />}
          label="Bosim"
          value={`${current?.surface_pressure ?? "-"} hPa`}
        />
        <WeatherMetric
          icon={<Gauge size={22} />}
          label="Havo tozaligi"
          value={`${airInfo.label} | AQI ${currentAqi ?? "-"}`}
        />
      </section>

      <section className={`weather-tip-panel ${outdoorTip.level}`}>
        <Navigation size={24} />
        <div>
          <div className="weather-tip-title">
            <h2>Bugungi tavsiya</h2>
            <span>{outdoorTip.label}</span>
          </div>
          <p>{outdoorTip.text}</p>
          <p>
            Havo tozaligi: {airInfo.recommendation}
            {" "}
            Sabab: {airReason}
          </p>
        </div>
      </section>

      <section className="weather-panel">
        <div className="weather-panel-title">
          <Thermometer size={24} />
          <h2>Keyingi 12 soat</h2>
        </div>

        <div className="hourly-strip">
          {hourlyForecast.map((item) => {
            const itemMeta = getWeatherMeta(item.code);
            const ItemIcon = itemMeta.icon;

            return (
              <motion.div
                className="hour-card"
                key={item.time}
                whileHover={{ y: -4 }}
              >
                <span>{formatHour(item.time)}</span>
                <ItemIcon size={26} />
                <strong>{Math.round(item.temperature)} C</strong>
                <small>Yomg'ir {item.rainChance}%</small>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="weather-panel">
        <div className="weather-panel-title">
          <Sunrise size={24} />
          <h2>10 kunlik ob-havo</h2>
        </div>

        <div className="daily-grid">
          {dailyForecast.map((day) => {
            const dayMeta = getWeatherMeta(day.code);
            const DayIcon = dayMeta.icon;

            return (
              <motion.article
                className="daily-card"
                key={day.date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -5 }}
              >
                <div className="daily-head">
                  <span>{formatDay(day.date)}</span>
                  <DayIcon size={30} />
                </div>

                <strong>
                  {Math.round(day.max)} / {Math.round(day.min)} C
                </strong>
                <p>{dayMeta.label}</p>

                <div className="daily-details">
                  <span>
                    <Umbrella size={16} />
                    {day.rainChance}%
                  </span>
                  <span>
                    <Wind size={16} />
                    {Math.round(day.wind)} km/soat
                  </span>
                  <span>
                    <Sun size={16} />
                    UV {Math.round(day.uv ?? 0)}
                  </span>
                </div>

                <div className="sun-row">
                  <span>
                    <Sunrise size={15} />
                    {formatHour(day.sunrise)}
                  </span>
                  <span>
                    <Sunset size={15} />
                    {formatHour(day.sunset)}
                  </span>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>

      <section className="weather-night-note">
        <Moon size={22} />
        <p>
          Kechki sayr uchun shamol past va yomg'ir ehtimoli kam bo'lgan kunlarni tanlang.
        </p>
      </section>
    </div>
  );
}

function WeatherMetric({ icon, label, value }) {
  return (
    <motion.div
      className="weather-metric"
      whileHover={{ y: -4 }}
    >
      <div>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </motion.div>
  );
}

export default Weather;
