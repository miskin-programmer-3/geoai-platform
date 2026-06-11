import { useContext, useEffect, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  MapPin,
  TrendingUp,
  Users
} from "lucide-react";

import { LocationContext } from "../context/locationContextValue";
import { getLocationInfo } from "../services/locationService";
import { getCityPopulationHistory } from "../services/populationService";
import {
  getCityEconomicIndicators,
  getKarakalpakstanEconomicIndicators
} from "../services/economicService";
import PopulationChart from "../components/PopulationChart";
import "./Population.css";

const NUKUS_LOCATION = {
  latitude: 42.4619,
  longitude: 59.6166,
  label: "Nukus"
};

function formatNumber(value) {
  if (!value)
    return "-";

  return value.toLocaleString("uz-UZ");
}

function Population() {
  const { latitude, longitude } =
    useContext(LocationContext);

  const hasUserLocation =
    typeof latitude === "number" &&
    typeof longitude === "number";

  const activeLatitude =
    hasUserLocation ? latitude : NUKUS_LOCATION.latitude;

  const activeLongitude =
    hasUserLocation ? longitude : NUKUS_LOCATION.longitude;

  const [city, setCity] =
    useState(NUKUS_LOCATION.label);

  const [populationInfo, setPopulationInfo] =
    useState(null);

  const [economicInfo, setEconomicInfo] =
    useState(getKarakalpakstanEconomicIndicators());

  const [loading, setLoading] =
    useState(true);

  const [lastLoaded, setLastLoaded] =
    useState(null);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadPopulationData() {
      try {
        setLoading(true);
        setError("");

        const locationData =
          await getLocationInfo(activeLatitude, activeLongitude);

        const detectedCity =
          locationData.address.city ||
          locationData.address.town ||
          locationData.address.village ||
          locationData.address.county ||
          "Noma'lum";

        setCity(detectedCity);

        const [populationData, economicData] =
          await Promise.all([
            getCityPopulationHistory({
              cityName: detectedCity,
              locationData
            }),
            getCityEconomicIndicators({
              cityName: detectedCity,
              locationData
            })
          ]);

        setPopulationInfo(populationData);
        setEconomicInfo(economicData);
        setLastLoaded(new Date());
      } catch (loadError) {
        console.error(loadError);
        setError("Aholi statistikasi ma'lumotlarini yuklashda xatolik yuz berdi.");
      } finally {
        setLoading(false);
      }
    }

    loadPopulationData();
  }, [activeLatitude, activeLongitude]);

  const latestForecast =
    populationInfo?.forecast?.[populationInfo.forecast.length - 1];

  return (
    <div className="population-page">
      <div className="population-hero">
        <div>
          <h1>Aholi statistikasi</h1>
          <p>
            <MapPin size={18} />
            Joylashuv: {city}
            {!hasUserLocation && " (standart lokatsiya)"}
          </p>
          <p>
            Ma'lumot yuklangan vaqt:
            {" "}
            {lastLoaded
              ? lastLoaded.toLocaleTimeString(
                "uz-UZ",
                {
                  hour: "2-digit",
                  minute: "2-digit"
                }
              )
              : "Kutilmoqda"}
          </p>
        </div>

        <div className="source-pill">
          Manba: {populationInfo?.source ?? "Wikidata"} / rasmiy statistika
        </div>
      </div>

      {error && (
        <div className="population-alert">
          {error}
        </div>
      )}

      <section className="population-card">
        <div className="population-section-title">
          <Users size={24} />
          <div>
            <h2>{city} aholisi o'sishi</h2>
            <p>
              {populationInfo?.note ||
                "Ochiq manbadan aholi soni olinmoqda."}
            </p>
          </div>
        </div>

        <div className="population-stats">
          <div>
            <span>So'nggi aholi soni</span>
            <strong>
              {loading
                ? "..."
                : formatNumber(populationInfo?.latestPopulation)}
            </strong>
            <small>{populationInfo?.latestYear ?? "-"}</small>
          </div>

          <div>
            <span>Yillik o'rtacha o'sish</span>
            <strong>
              {populationInfo?.averageGrowthRate !== null &&
              populationInfo?.averageGrowthRate !== undefined
                ? `${populationInfo.averageGrowthRate}%`
                : "-"}
            </strong>
            <small>Mavjud yillar oralig'ida</small>
          </div>

          <div>
            <span>2030 AI taxmin</span>
            <strong>
              {latestForecast
                ? formatNumber(latestForecast.forecastPopulation)
                : "-"}
            </strong>
            <small>O'rtacha o'sish asosida</small>
          </div>
        </div>

        <PopulationChart data={populationInfo?.data ?? []} />
      </section>

      <section className="population-card">
        <div className="population-section-title">
          <TrendingUp size={24} />
          <div>
            <h2>2030-yilgacha yilma-yil AI taxmin</h2>
            <p>
              Taxmin ochiq manbadagi tarixiy aholi soni va yillik o'rtacha o'sish asosida hisoblandi.
            </p>
          </div>
        </div>

        {populationInfo?.forecast?.length > 0 ? (
          <div className="population-forecast-grid">
            {populationInfo.forecast.map((item) => (
              <div
                className="population-forecast-item"
                key={item.year}
              >
                <span>{item.year}</span>
                <strong>
                  {formatNumber(item.forecastPopulation)}
                </strong>
                <small>
                  +{item.forecastGrowthRate}% yillik taxmin
                </small>
              </div>
            ))}
          </div>
        ) : (
          <p>
            Taxmin qilish uchun kamida ikki tarixiy aholi ko'rsatkichi kerak.
          </p>
        )}
      </section>

      <section className="population-card">
        <div className="population-section-title">
          <BarChart3 size={24} />
          <div>
            <h2>Iqtisodiy ko'rsatkichlar</h2>
            <p>
              {economicInfo?.cityNote ||
                "Hududiy iqtisodiy ko'rsatkichlar yuklanmoqda."}
            </p>
          </div>
        </div>

        <div className="economic-grid">
          <EconomicCard
            icon={<BarChart3 size={22} />}
            item={economicInfo?.grossRegionalProduct}
          />
          <EconomicCard
            icon={<TrendingUp size={22} />}
            item={economicInfo?.grpGrowth}
          />
          <EconomicCard
            icon={<BriefcaseBusiness size={22} />}
            item={economicInfo?.averageSalary}
          />
          <EconomicCard
            icon={<Users size={22} />}
            item={economicInfo?.population}
          />
          <EconomicCard
            icon={<TrendingUp size={22} />}
            item={economicInfo?.grpPerCapita}
          />
        </div>
      </section>

      <section className="population-card">
        <div className="population-section-title">
          <TrendingUp size={24} />
          <div>
            <h2>YaHMni oshirish uchun AI tahlil</h2>
            <p>
              Tavsiyalar hududiy iqtisodiyot tarkibi, aholi, xizmatlar, sanoat va geoma'lumotlardan foydalanish imkoniyatlari asosida tuzildi.
            </p>
          </div>
        </div>

        <div className="ai-analysis-grid">
          {(economicInfo?.aiGrowthAnalysis ?? []).length > 0 ? (
            economicInfo.aiGrowthAnalysis.map((item) => (
              <div
                className="ai-analysis-card"
                key={item.title}
              >
                <div>
                  <span>{item.impact} ta'sir</span>
                  <h3>{item.title}</h3>
                </div>
                <p>{item.recommendation}</p>
                <small>{item.reason}</small>
              </div>
            ))
          ) : (
            <div className="ai-analysis-card">
              <div>
                <span>Ma'lumot kutilmoqda</span>
                <h3>AI tahlil tayyorlanmoqda</h3>
              </div>
              <p>
                Iqtisodiy ko'rsatkichlar yuklangandan keyin tavsiyalar ko'rsatiladi.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function EconomicCard({ icon, item }) {
  if (!item) {
    return (
      <div className="economic-card muted">
        <span>Ma'lumot mavjud emas</span>
        <strong>-</strong>
        <small>Ishonchli ochiq manba ulanmagan.</small>
      </div>
    );
  }

  return (
    <div className="economic-card">
      <div className="economic-icon">
        {icon}
      </div>
      <span>{item.label}</span>
      <strong>{item.value}</strong>
      <small>{item.year}</small>
      <p>{item.note}</p>
      <a
        href={item.sourceUrl}
        target="_blank"
        rel="noreferrer"
      >
        {item.sourceName}
      </a>
    </div>
  );
}

export default Population;
