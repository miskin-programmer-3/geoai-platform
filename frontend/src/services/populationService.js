import axios from "axios";

function parsePopulationClaims(entity) {
  const claims = entity?.claims?.P1082 || [];

  return claims
    .map((claim) => {
      const amount =
        claim?.mainsnak?.datavalue?.value?.amount;
      const time =
        claim?.qualifiers?.P585?.[0]?.datavalue?.value?.time;

      if (!amount || !time)
        return null;

      return {
        year: time.slice(1, 5),
        population: Math.round(Number(amount.replace("+", "")))
      };
    })
    .filter(Boolean)
    .reduce((items, item) => {
      const existing = items.find(
        (entry) => entry.year === item.year
      );

      if (!existing)
        items.push(item);

      return items;
    }, [])
    .sort((a, b) => Number(a.year) - Number(b.year));
}

function addGrowthRates(data) {
  return data.map((item, index) => {
    if (index === 0)
      return {
        ...item,
        growthRate: null
      };

    const previous = data[index - 1];
    const yearDiff =
      Number(item.year) - Number(previous.year);
    const growthRate =
      (Math.pow(item.population / previous.population, 1 / yearDiff) - 1) * 100;

    return {
      ...item,
      growthRate: Number(growthRate.toFixed(2))
    };
  });
}

function getAverageGrowthRate(data) {
  const growthItems = data.filter(
    (item) => typeof item.growthRate === "number"
  );

  if (growthItems.length === 0)
    return null;

  const total = growthItems.reduce(
    (sum, item) => sum + item.growthRate,
    0
  );

  return Number((total / growthItems.length).toFixed(2));
}

function buildPopulationForecast(data, targetYear = 2030) {
  const latest = data[data.length - 1];
  const averageGrowthRate = getAverageGrowthRate(data);

  if (!latest || averageGrowthRate === null)
    return [];

  const forecast = [];
  let population = latest.population;

  for (
    let year = Number(latest.year) + 1;
    year <= targetYear;
    year += 1
  ) {
    population = Math.round(
      population * (1 + averageGrowthRate / 100)
    );

    forecast.push({
      year: String(year),
      population: null,
      growthRate: null,
      forecastPopulation: population,
      forecastGrowthRate: averageGrowthRate
    });
  }

  return forecast;
}

async function searchWikidataCity(cityName) {
  const response = await axios.get(
    "https://www.wikidata.org/w/api.php",
    {
      params: {
        action: "wbsearchentities",
        search: cityName,
        language: "en",
        format: "json",
        origin: "*",
        limit: 1
      }
    }
  );

  return response.data.search?.[0]?.id;
}

async function getWikidataEntity(entityId) {
  const response = await axios.get(
    `https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`
  );

  return response.data.entities?.[entityId];
}

export async function getCityPopulationHistory({
  cityName,
  locationData
}) {
  const osmWikidataId =
    locationData?.extratags?.wikidata;
  const entityId =
    osmWikidataId || await searchWikidataCity(cityName);

  if (!entityId)
    return {
      cityName,
      entityId: null,
      data: [],
      averageGrowthRate: null,
      latestPopulation: null,
      latestYear: null,
      source: "Wikidata",
      note: "Shahar uchun Wikidata ID topilmadi."
    };

  const entity = await getWikidataEntity(entityId);
  const data = addGrowthRates(
    parsePopulationClaims(entity)
  ).map((item) => ({
    ...item,
    forecastPopulation: null,
    forecastGrowthRate: null
  }));
  const latest = data[data.length - 1];
  const forecast = buildPopulationForecast(data);
  const averageGrowthRate = getAverageGrowthRate(data);

  return {
    cityName,
    entityId,
    data: [...data, ...forecast],
    historicalData: data,
    forecast,
    averageGrowthRate,
    latestPopulation: latest?.population ?? null,
    latestYear: latest?.year ?? null,
    source: "Wikidata",
    note: data.length > 1
      ? "O'sish foizi ochiq manbadagi mavjud yillar orasida yillik o'rtacha o'sish sifatida hisoblandi."
      : "Ochiq manbada yillik population qatori yetarli emas."
  };
}
