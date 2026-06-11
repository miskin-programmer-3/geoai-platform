import axios from "axios";

export async function getLocationInfo(
  latitude,
  longitude
) {

  const response = await axios.get(
    "https://nominatim.openstreetmap.org/reverse",
    {
      params: {
        format: "json",
        lat: latitude,
        lon: longitude,
        addressdetails: 1,
        extratags: 1
      }
    }
  );

  return response.data;
}
