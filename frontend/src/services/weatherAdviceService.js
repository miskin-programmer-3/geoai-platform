export function getAirQualityLevel(aqi) {
  if (aqi === null || aqi === undefined)
    return {
      label: "Noma'lum",
      tone: "neutral",
      recommendation: "Havo sifati ma'lumoti hozircha mavjud emas."
    };

  if (aqi <= 20)
    return {
      label: "Juda yaxshi",
      tone: "good",
      recommendation: "Havo toza, tashqarida faol harakat qilish mumkin."
    };

  if (aqi <= 40)
    return {
      label: "Yaxshi",
      tone: "good",
      recommendation: "Sayr va yengil sport uchun mos."
    };

  if (aqi <= 60)
    return {
      label: "O'rtacha",
      tone: "medium",
      recommendation: "Uzoq sayrda ehtiyot bo'lish tavsiya etiladi."
    };

  return {
    label: "Yomon",
    tone: "danger",
    recommendation: "Tashqarida uzoq qolmaslik tavsiya etiladi."
  };
}

export function getAirQualityReason(currentAir) {
  if (!currentAir)
    return "Havo sifati sababini aniqlash uchun ma'lumot hali yuklanmagan.";

  const pollutants = [
    {
      key: "pm2_5",
      label: "PM2.5 mayda chang zarralari",
      value: currentAir.pm2_5,
      limit: 15,
      reason: "mayda chang zarralari nafas yo'llariga chuqur kirishi mumkin"
    },
    {
      key: "pm10",
      label: "PM10 chang zarralari",
      value: currentAir.pm10,
      limit: 45,
      reason: "ko'cha changi va yirikroq zarrachalar ko'paygan"
    },
    {
      key: "nitrogen_dioxide",
      label: "Azot dioksidi",
      value: currentAir.nitrogen_dioxide,
      limit: 25,
      reason: "transport va yonish manbalari ta'siri sezilmoqda"
    },
    {
      key: "ozone",
      label: "Ozon",
      value: currentAir.ozone,
      limit: 100,
      reason: "quyoshli va issiq havoda ozon miqdori oshishi mumkin"
    },
    {
      key: "carbon_monoxide",
      label: "Uglerod oksidi",
      value: currentAir.carbon_monoxide,
      limit: 4000,
      reason: "yonish gazlari miqdori yuqorilagan"
    }
  ];

  const mainPollutant = pollutants
    .filter((item) => typeof item.value === "number")
    .map((item) => ({
      ...item,
      ratio: item.value / item.limit
    }))
    .sort((a, b) => b.ratio - a.ratio)[0];

  if (!mainPollutant)
    return "Havo sifati sababi bo'yicha yetarli ko'rsatkich kelmadi.";

  if (mainPollutant.ratio < 0.8)
    return `Asosiy ko'rsatkich: ${mainPollutant.label}. Hozircha me'yorga yaqin.`;

  return `${mainPollutant.label} yuqoriroq: ${mainPollutant.reason}. Ko'rsatkich: ${mainPollutant.value}.`;
}

export function getOutdoorAdvice({
  temperature,
  humidity,
  rainProbability,
  windSpeed,
  aqi,
  airReason
}) {
  if (temperature >= 36)
    return "Havo juda issiq va quyosh ta'siri kuchli bo'lishi mumkin. Soyada yurish, suv ichish va tush payti ko'chaga kamroq chiqish tavsiya etiladi.";

  if (rainProbability >= 70)
    return "Yomg'ir ehtimoli yuqori. AI tavsiya: ko'chaga chiqsangiz soyabon olib oling yoki sayrni keyinga qoldiring.";

  if (windSpeed >= 45)
    return "Shamol kuchli. Ochiq joylarda ehtiyot bo'lish kerak.";

  if (humidity >= 85)
    return "Namlik yuqori. Uzoq piyoda yurish noqulay bo'lishi mumkin.";

  if (aqi > 60)
    return `Havo sifati past. Sabab: ${airReason} Niqob taqish yoki tashqarida kamroq yurish tavsiya qilinadi.`;

  if (temperature >= 18 && temperature <= 30 && rainProbability < 40 && aqi <= 60)
    return "Ko'chaga chiqish va sayr qilish uchun havo mos.";

  return "Ko'chaga chiqish mumkin, lekin ob-havo sharoitini kuzatib boring.";
}

export function getOutdoorAdviceLevel({
  temperature,
  humidity,
  rainProbability,
  windSpeed,
  aqi
}) {
  if (temperature >= 36 || windSpeed >= 45)
    return {
      level: "danger",
      label: "Xavfli"
    };

  if (rainProbability >= 70 || aqi > 60)
    return {
      level: "bad",
      label: "Yomon"
    };

  if (humidity >= 85 || rainProbability >= 35 || aqi > 40)
    return {
      level: "medium",
      label: "O'rtacha"
    };

  return {
    level: "good",
    label: "Yaxshi"
  };
}

export function getUnifiedOutdoorTip(options) {
  return {
    ...getOutdoorAdviceLevel(options),
    text: getOutdoorAdvice(options)
  };
}
