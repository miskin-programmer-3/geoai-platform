import axios from "axios";

const FEEDS = {
  day: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
  week: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson"
};

export async function getEarthquakes(period = "day") {
  const response = await axios.get(
    FEEDS[period] || FEEDS.day
  );

  return response.data.features;
}
