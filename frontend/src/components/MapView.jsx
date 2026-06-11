// frontend/src/components/MapView.jsx

import { MapContainer, TileLayer, Marker } from "react-leaflet";

import "leaflet/dist/leaflet.css";

function MapView() {

  return (

    <MapContainer
      center={[41.2995, 69.2401]}
      zoom={10}
      style={{ height: "500px" }}
    >

      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[41.2995, 69.2401]} />

    </MapContainer>

  );
}

export default MapView;