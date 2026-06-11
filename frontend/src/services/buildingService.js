import axios from "axios";

export async function getNearbyBuildings(
  latitude,
  longitude
) {

  const query = `

  [out:json];

  (
    way
    ["building"]
    (
      around:300,
      ${latitude},
      ${longitude}
    );
  );

  out geom;

  `;

  const response =
    await axios.post(
      "https://overpass-api.de/api/interpreter",
      query,
      {
        headers: {
          "Content-Type":
            "text/plain"
        }
      }
    );

  return response.data.elements;
}