import { useEffect, useState } from "react";
import { LocationContext } from "./locationContextValue";

export function LocationProvider({ children }) {

  const [location, setLocation] = useState({
    latitude: null,
    longitude: null
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Brauzer geolocation API ni qo'llab-quvvatlamaydi.");
      return;
    }

    navigator.geolocation.getCurrentPosition(

      (position) => {

        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });

      },

      (error) => {
        console.warn("Joylashuv aniqlanmadi:", error.message);
      }

    );

  }, []);

  return (
    <LocationContext.Provider
      value={location}
    >
      {children}
    </LocationContext.Provider>
  );
}
