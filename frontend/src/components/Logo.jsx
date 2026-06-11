import { MapPin, Sparkles } from "lucide-react";

import "./Logo.css";

function Logo({ compact = false, subtitle = false }) {
  return (
    <div className={compact ? "geoai-logo compact" : "geoai-logo"}>
      <div className="geoai-logo-mark">
        <span className="logo-grid-line horizontal" />
        <span className="logo-grid-line vertical" />
        <MapPin
          className="logo-pin"
          size={compact ? 18 : 22}
        />
        <Sparkles
          className="logo-spark"
          size={compact ? 11 : 13}
        />
      </div>

      {!compact && (
        <div className="geoai-logo-text">
          <strong>GeoAI</strong>
          {subtitle && <span>platformasi</span>}
        </div>
      )}
    </div>
  );
}

export default Logo;
