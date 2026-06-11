import { useEffect, useState } from "react";
import { LocationContext } from "./locationContextValue";

export function LocationProvider({ children }) {

  const [location, setLocation] = useState({
    latitude: null,
    longitude: null
  });

  useEffect(() => {

    navigator.geolocation.getCurrentPosition(

      (position) => {

        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });

      },

      (error) => {
        console.log(error);
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
