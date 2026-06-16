import { useContext, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileDown,
  Layers,
  MapPin,
  Sparkles,
  X
} from "lucide-react";
import {
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer
} from "react-leaflet";

import { LocationContext }
from "../context/locationContextValue";

import { getNearbyBuildings }
from "../services/buildingService";

import { analyzeBuildingRisk }
from "../services/api";

import "leaflet/dist/leaflet.css";
import "./BuildingRisk.css";

const NUKUS_LOCATION = {
  latitude: 42.4619,
  longitude: 59.6166,
  label: "Nukus"
};

const materialLabels = {
  brick: "G'isht",
  concrete: "Beton",
  steel: "Po'lat"
};

function getRiskTone(result) {
  if (!result)
    return "neutral";

  const level = result.level?.toLowerCase() || "";

  if (
    result.risk_color === "red" ||
    level.includes("yuqori") ||
    result.score > 60
  )
    return "high";

  if (
    result.risk_color === "yellow" ||
    level.includes("o'rtacha") ||
    result.score > 30
  )
    return "medium";

  return "low";
}

function getBuildingName(building) {
  return (
    building.tags?.name ||
    building.tags?.["addr:housenumber"] ||
    `Bino ${building.id}`
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function listToHtml(items, fallback) {
  if (!items?.length)
    return `<li>${escapeHtml(fallback)}</li>`;

  return items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
}

function buildRiskReportHtml(result, tone) {
  const today =
    new Date().toLocaleDateString("uz-UZ");

  const scoreBreakdown =
    result.score_breakdown?.length
      ? result.score_breakdown
        .map((item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.reason)}</td>
            <td class="points">+${escapeHtml(item.points)}</td>
          </tr>
        `)
        .join("")
      : `
          <tr>
            <td colspan="3">Ball taqsimoti mavjud emas.</td>
          </tr>
        `;

  const seismic =
    result.estimated_seismic_resistance
      ? `
          <section>
            <h2>Taxminiy zilzilaga bardoshlilik</h2>
            <div class="seismic-box ${tone}">
              <div class="ball">
                ${escapeHtml(result.estimated_seismic_resistance.ball)}
                <span>ball</span>
              </div>
              <div>
                <strong>${escapeHtml(result.estimated_seismic_resistance.label)}</strong>
                <p>${escapeHtml(result.estimated_seismic_resistance.disclaimer)}</p>
              </div>
            </div>
            <ul>
              ${listToHtml(
                result.estimated_seismic_resistance.basis,
                "Bardoshlilik uchun qo'shimcha asoslar mavjud emas."
              )}
            </ul>
          </section>
        `
      : "";

  return `
    <!doctype html>
    <html lang="uz">
      <head>
        <meta charset="utf-8" />
        <title>GeoAI bino xavfi hisoboti</title>
        <style>
          @page {
            size: A4;
            margin: 18mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #111827;
            background: #ffffff;
            font-family: "Times New Roman", serif;
            font-size: 14pt;
            line-height: 1.45;
          }

          .report-header {
            padding: 18px;
            border-radius: 8px;
            color: #ffffff;
            background: #0f172a;
          }

          .report-header p,
          .report-header h1 {
            margin: 0;
          }

          .report-header h1 {
            margin-top: 8px;
            font-size: 24pt;
          }

          .meta {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin: 18px 0;
          }

          .meta div,
          section,
          .recommendation,
          .seismic-box {
            border: 1px solid #d1d5db;
            border-radius: 8px;
          }

          .meta div {
            padding: 12px;
            background: #f8fafc;
          }

          .meta span {
            display: block;
            color: #64748b;
            font-size: 11pt;
          }

          .meta strong {
            display: block;
            margin-top: 5px;
            font-size: 17pt;
          }

          section {
            margin-top: 14px;
            padding: 14px;
            break-inside: avoid;
          }

          h2 {
            margin: 0 0 10px;
            font-size: 17pt;
          }

          p {
            margin: 0 0 8px;
          }

          .recommendation {
            margin-top: 14px;
            padding: 14px;
            font-weight: 700;
          }

          .low {
            background: #dcfce7;
            border-color: #86efac;
            color: #14532d;
          }

          .medium {
            background: #fef9c3;
            border-color: #fde047;
            color: #713f12;
          }

          .high {
            background: #fee2e2;
            border-color: #fca5a5;
            color: #7f1d1d;
          }

          .seismic-box {
            display: grid;
            grid-template-columns: 110px 1fr;
            gap: 14px;
            align-items: center;
            padding: 12px;
          }

          .ball {
            display: grid;
            place-items: center;
            min-height: 84px;
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.56);
            font-size: 28pt;
            font-weight: 900;
          }

          .ball span {
            font-size: 11pt;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th,
          td {
            padding: 9px;
            border: 1px solid #d1d5db;
            vertical-align: top;
          }

          th {
            background: #f1f5f9;
            text-align: left;
          }

          .points {
            width: 70px;
            text-align: center;
            font-weight: 900;
          }

          ul {
            margin: 0;
            padding-left: 22px;
          }

          li {
            margin-bottom: 6px;
          }

          .footer {
            margin-top: 18px;
            color: #64748b;
            font-size: 11pt;
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <p>GeoAI Platformasi</p>
          <h1>Bino xavfini baholash hisoboti</h1>
        </div>

        <div class="meta">
          <div>
            <span>Sana</span>
            <strong>${escapeHtml(today)}</strong>
          </div>
          <div>
            <span>Xavf darajasi</span>
            <strong>${escapeHtml(result.level)}</strong>
          </div>
          <div>
            <span>Umumiy ball</span>
            <strong>${escapeHtml(result.score)}/100</strong>
          </div>
        </div>

        <section>
          <h2>Umumiy xulosa</h2>
          <p><strong>Ishonchlilik:</strong> ${escapeHtml(result.confidence)}</p>
          <p>${escapeHtml(result.summary)}</p>
        </section>

        <div class="recommendation ${tone}">
          ${escapeHtml(result.recommendation)}
        </div>

        ${seismic}

        <section>
          <h2>Ball nimaga asoslandi?</h2>
          <table>
            <thead>
              <tr>
                <th>Omil</th>
                <th>Izoh</th>
                <th>Ball</th>
              </tr>
            </thead>
            <tbody>
              ${scoreBreakdown}
            </tbody>
          </table>
        </section>

        <section>
          <h2>Asosiy omillar</h2>
          <ul>
            ${listToHtml(result.factors, "Qo'shimcha xavf omili aniqlanmadi.")}
          </ul>
        </section>

        <section>
          <h2>Metodologiya</h2>
          <ul>
            ${listToHtml(result.methodology, "Metodologiya ma'lumoti mavjud emas.")}
          </ul>
        </section>

        <p class="footer">
          Ushbu hisobot dastlabki algoritmik tahlil natijasi hisoblanadi. Yakuniy xulosa uchun mutaxassis ko'rigi, loyiha hujjatlari va konstruktiv tekshiruv talab etiladi.
        </p>
      </body>
    </html>
  `;
}

function downloadRiskPdf(result) {
  const tone = getRiskTone(result);
  const reportWindow =
    window.open("", "_blank");

  if (!reportWindow) {
    alert("PDF oynasini ochish uchun brauzer popup ruxsatini yoqing.");
    return;
  }

  reportWindow.document.open();
  reportWindow.document.write(buildRiskReportHtml(result, tone));
  reportWindow.document.close();
  reportWindow.focus();

  window.setTimeout(() => {
    reportWindow.print();
  }, 250);
}

function BuildingRisk() {
  const {
    latitude,
    longitude
  } = useContext(
    LocationContext
  );

  const hasUserLocation =
    typeof latitude === "number" &&
    typeof longitude === "number";

  const activeLatitude =
    hasUserLocation ? latitude : NUKUS_LOCATION.latitude;

  const activeLongitude =
    hasUserLocation ? longitude : NUKUS_LOCATION.longitude;

  const [buildings,
    setBuildings] =
    useState([]);

  const [yearBuilt,
    setYearBuilt] =
    useState("");

  const [floors,
    setFloors] =
    useState("");

  const [material,
    setMaterial] =
    useState("brick");

  const [riskResult,
    setRiskResult] =
    useState(null);

  const [isModalOpen,
    setIsModalOpen] =
    useState(false);

  const [loading,
    setLoading] =
    useState(false);

  const [buildingsLoading,
    setBuildingsLoading] =
    useState(true);

  useEffect(() => {
    async function loadBuildings() {
      try {
        setBuildingsLoading(true);

        const data =
          await getNearbyBuildings(
            activeLatitude,
            activeLongitude
          );

        setBuildings(data);
      } catch (error) {
        console.error(error);
      } finally {
        setBuildingsLoading(false);
      }
    }

    loadBuildings();
  }, [
    activeLatitude,
    activeLongitude
  ]);

  const visibleBuildings = useMemo(
    () => buildings
      .filter((building) => building.geometry)
      .slice(0, 80),
    [buildings]
  );

  async function analyzeRisk(event) {
    event.preventDefault();

    try {
      setLoading(true);

      const result =
        await analyzeBuildingRisk({
          yearBuilt,
          floors,
          material
        });

      setRiskResult(result);
      setIsModalOpen(true);
    } catch (error) {
      console.error(
        "Bino xavfi API xatosi:",
        error
      );

      setRiskResult({
        score: 0,
        level: "Tahlil xatosi",
        risk_color: "red",
        confidence: "Past",
        summary:
          "Backend API ishlamayapti yoki kiritilgan ma'lumot noto'g'ri.",
        recommendation:
          "Ma'lumotlarni tekshirib qayta urinib ko'ring.",
        factors: [],
        score_breakdown: [],
        methodology: []
      });
      setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="building-risk-page"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <section className="building-hero">
        <div>
          <p>
            <MapPin size={18} />
            {hasUserLocation
              ? "OSM binolari va AI risk scoring"
              : `${NUKUS_LOCATION.label} standart lokatsiyasi bo'yicha`}
          </p>
          <h1>Bino xavfini baholash</h1>
          <span>
            Qurilgan yil, qavatlar soni va material asosida dastlabki konstruktiv xavf tahlili.
          </span>
        </div>

        <div className="building-hero-badge">
          <Sparkles size={24} />
          AI tahlil
        </div>
      </section>

      <section className="building-layout">
        <motion.div
          className="building-map-panel"
          whileHover={{ y: -3 }}
        >
          <div className="panel-title">
            <Building2 size={24} />
            <h2>Yaqin atrofdagi binolar</h2>
          </div>

          <MapContainer
            center={[
              activeLatitude,
              activeLongitude
            ]}
            zoom={18}
            className="building-map"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <Marker
              position={[
                activeLatitude,
                activeLongitude
              ]}
            >
              <Popup>
                {hasUserLocation ? "Mening joylashuvim" : NUKUS_LOCATION.label}
              </Popup>
            </Marker>

            {visibleBuildings.map((building) => {
              const positions =
                building.geometry.map(
                  (point) => [
                    point.lat,
                    point.lon
                  ]
                );

              return (
                <Polygon
                  key={building.id}
                  positions={positions}
                  pathOptions={{
                    color: "#f97316",
                    fillColor: "#f97316",
                    fillOpacity: 0.28
                  }}
                >
                  <Popup>
                    {getBuildingName(building)}
                  </Popup>
                </Polygon>
              );
            })}
          </MapContainer>
        </motion.div>

        <motion.form
          className="building-form-panel"
          onSubmit={analyzeRisk}
          whileHover={{ y: -3 }}
        >
          <div className="panel-title">
            <ClipboardList size={24} />
            <h2>Bino ma'lumotlari</h2>
          </div>

          <label>
            Qurilgan yili
            <input
              type="number"
              placeholder="Masalan: 1985"
              value={yearBuilt}
              min="1800"
              max="2100"
              required
              onChange={(event) =>
                setYearBuilt(event.target.value)
              }
            />
          </label>

          <label>
            Qavatlar soni
            <input
              type="number"
              placeholder="Masalan: 5"
              value={floors}
              min="1"
              max="200"
              required
              onChange={(event) =>
                setFloors(event.target.value)
              }
            />
          </label>

          <label>
            Konstruksiya materiali
            <select
              value={material}
              onChange={(event) =>
                setMaterial(event.target.value)
              }
            >
              <option value="brick">
                G'isht
              </option>
              <option value="concrete">
                Beton
              </option>
              <option value="steel">
                Po'lat
              </option>
            </select>
          </label>

          <div className="form-preview">
            <Layers size={20} />
            <span>
              {yearBuilt || "Yil"} | {floors || "Qavat"} | {materialLabels[material]}
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
          >
            {loading ? "Tahlil qilinmoqda..." : "AI tahlilni boshlash"}
          </button>
        </motion.form>
      </section>

      <section className="building-list-panel">
        <div className="panel-title">
          <Building2 size={24} />
          <h2>Topilgan binolar</h2>
        </div>

        {buildingsLoading ? (
          <p>Binolar yuklanmoqda...</p>
        ) : (
          <div className="building-list">
            {buildings.slice(0, 12).map((building) => (
              <div
                className="building-list-item"
                key={building.id}
              >
                <strong>{getBuildingName(building)}</strong>
                <span>
                  {building.tags?.building || "building"} | ID: {building.id}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {isModalOpen && riskResult && (
        <RiskModal
          result={riskResult}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </motion.div>
  );
}

function RiskModal({ result, onClose }) {
  const tone = getRiskTone(result);

  return (
    <div className="risk-modal-backdrop">
      <motion.div
        className="risk-modal"
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <div className={`risk-modal-header ${tone}`}>
          <div>
            <span>AI tahlil natijasi</span>
            <h2>{result.level}</h2>
          </div>

          <div className="risk-modal-actions">
            <button
              type="button"
              onClick={() => downloadRiskPdf(result)}
              aria-label="PDF yuklab olish"
              title="PDF yuklab olish"
            >
              <FileDown size={21} />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Modalni yopish"
              title="Modalni yopish"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="risk-score-row">
          <div className={`risk-score ${tone}`}>
            {result.score}
            <span>/100</span>
          </div>

          <div>
            <strong>Ishonchlilik: {result.confidence}</strong>
            <p>{result.summary}</p>
          </div>
        </div>

        <div className={`risk-recommendation ${tone}`}>
          {tone === "low" ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
          <p>{result.recommendation}</p>
        </div>

        {result.estimated_seismic_resistance && (
          <section>
            <h3>Taxminiy zilzilaga bardoshlilik</h3>
            <div className={`seismic-resistance ${tone}`}>
              <div className="resistance-ball">
                {result.estimated_seismic_resistance.ball}
                <span>ball</span>
              </div>
              <div>
                <strong>
                  {result.estimated_seismic_resistance.label}
                </strong>
                <p>
                  {result.estimated_seismic_resistance.disclaimer}
                </p>
              </div>
            </div>

            <div className="resistance-basis">
              {result.estimated_seismic_resistance.basis?.map((item) => (
                <span key={item}>
                  {item}
                </span>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3>Ball nimaga asoslandi?</h3>
          <div className="breakdown-list">
            {result.score_breakdown?.map((item) => (
              <div
                className="breakdown-item"
                key={`${item.name}-${item.points}`}
              >
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.reason}</p>
                </div>
                <span>+{item.points}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3>Asosiy omillar</h3>
          <div className="factor-list">
            {result.factors?.length > 0 ? (
              result.factors.map((factor) => (
                <span key={factor}>
                  {factor}
                </span>
              ))
            ) : (
              <span>
                Qo'shimcha xavf omili aniqlanmadi.
              </span>
            )}
          </div>
        </section>

        <section>
          <h3>Metodologiya</h3>
          <ul className="methodology-list">
            {result.methodology?.map((item) => (
              <li key={item}>
                {item}
              </li>
            ))}
          </ul>
        </section>
      </motion.div>
    </div>
  );
}

export default BuildingRisk;
