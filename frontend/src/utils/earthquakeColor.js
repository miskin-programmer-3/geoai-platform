export function getEarthquakeColor(mag) {

  if (mag >= 6)
    return "red";

  if (mag >= 5)
    return "orange";

  if (mag >= 4)
    return "yellow";

  return "green";

}