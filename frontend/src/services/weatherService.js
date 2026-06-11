import axios from "axios";

export async function getWeather(
  latitude,
  longitude
) {
  const response = await axios.get(
    "https://api.open-meteo.com/v1/forecast",
    {
      params: {
        latitude,
        longitude,
        timezone: "auto",
        current: [
          "temperature_2m",
          "relative_humidity_2m",
          "precipitation",
          "rain",
          "weather_code",
          "wind_speed_10m",
          "wind_gusts_10m",
          "apparent_temperature",
          "surface_pressure"
        ].join(","),
        hourly: [
          "temperature_2m",
          "relative_humidity_2m",
          "precipitation_probability",
          "rain",
          "weather_code",
          "wind_speed_10m",
          "wind_gusts_10m",
          "apparent_temperature"
        ].join(","),
        daily: [
          "weather_code",
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_probability_max",
          "precipitation_sum",
          "wind_speed_10m_max",
          "wind_gusts_10m_max",
          "uv_index_max",
          "sunrise",
          "sunset"
        ].join(","),
        forecast_days: 10
      }
    }
  );

  return response.data;
}

export async function getAirQuality(
  latitude,
  longitude
) {
  const response = await axios.get(
    "https://air-quality-api.open-meteo.com/v1/air-quality",
    {
      params: {
        latitude,
        longitude,
        timezone: "auto",
        current: [
          "european_aqi",
          "pm2_5",
          "pm10",
          "carbon_monoxide",
          "nitrogen_dioxide",
          "ozone"
        ].join(",")
      }
    }
  );

  return response.data;
}
