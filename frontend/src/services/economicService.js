function isKarakalpakstanLocation(cityName, locationData) {
  const normalizedCity = cityName?.toLowerCase() || "";
  const state =
    locationData?.address?.state?.toLowerCase() || "";
  const region =
    locationData?.address?.region?.toLowerCase() || "";

  return (
    normalizedCity.includes("nukus") ||
    state.includes("karakalpak") ||
    region.includes("karakalpak") ||
    state.includes("qoraqalpog") ||
    region.includes("qoraqalpog")
  );
}

export function getKarakalpakstanEconomicIndicators() {
  return {
    areaName: "Qoraqalpog'iston Respublikasi",
    cityNote:
      "Nukus shahri bo'yicha alohida YaIM va o'rtacha oylik ochiq API topilmadi. Shuning uchun Nukus joylashgan Qoraqalpog'iston Respublikasi ko'rsatkichlari berildi.",
    grossRegionalProduct: {
      label: "Yalpi hududiy mahsulot",
      value: "54 076.9 mlrd so'm",
      year: "2025",
      note: "Hududiy YaHM, shahar YaIMi emas.",
      sourceName: "Qoraqalpog'iston statistika boshqarmasi",
      sourceUrl:
        "https://www.qrstat.uz/uz/matbuot-xizmati/qo-mita-yangiliklar/20272-qoraqalpog-iston-respublikasi-bo-yicha-yalpi-hududiy-mahsulot-hajmi-6"
    },
    grpGrowth: {
      label: "YaHM o'sishi",
      value: "7.2%",
      year: "2025",
      note: "2024-yilning yanvar-dekabr oylariga nisbatan real o'sish.",
      sourceName: "Qoraqalpog'iston statistika boshqarmasi",
      sourceUrl:
        "https://www.qrstat.uz/uz/matbuot-xizmati/qo-mita-yangiliklar/20272-qoraqalpog-iston-respublikasi-bo-yicha-yalpi-hududiy-mahsulot-hajmi-6"
    },
    averageSalary: {
      label: "O'rtacha oylik ish haqi",
      value: "4.16 mln so'm",
      year: "2024, yanvar-iyun",
      note: "Hudud bo'yicha nominal hisoblangan o'rtacha oylik.",
      sourceName: "UzDaily / Statistics Agency",
      sourceUrl:
        "https://www.uzdaily.uz/en/average-monthly-salary-in-uzbekistan-reaches-509-million-soums/"
    },
    population: {
      label: "Doimiy aholi soni",
      value: "2 053 173 kishi",
      year: "2026-yil 1-yanvar",
      note: "Qoraqalpog'iston Respublikasi bo'yicha doimiy aholi.",
      sourceName: "National Statistics Committee",
      sourceUrl:
        "https://stat.uz/en/press-center/news-of-committee/66829-ududlar-statistikasi-ora-alpo-iston-respublikasining-izhtimoij-i-tisodij-olati-ra-amlarda-4"
    },
    grpPerCapita: {
      label: "Aholi jon boshiga YaHM",
      value: "26.3 mln so'm",
      year: "2025",
      note:
        "54 076.9 mlrd so'm YaHM 2 053 173 kishiga bo'lindi. Bu hududiy yaqin hisob-kitob.",
      sourceName: "Hisob-kitob: YaHM / doimiy aholi",
      sourceUrl:
        "https://www.qrstat.uz/uz/matbuot-xizmati/qo-mita-yangiliklar/20272-qoraqalpog-iston-respublikasi-bo-yicha-yalpi-hududiy-mahsulot-hajmi-6"
    },
    aiGrowthAnalysis: [
      {
        title: "Sanoat qo'shilgan qiymatini oshirish",
        impact: "Yuqori",
        recommendation:
          "Nukus va yaqin tumanlarda qayta ishlash sanoati, qurilish materiallari va mahalliy xomashyoni tayyor mahsulotga aylantirish loyihalarini ko'paytirish kerak.",
        reason:
          "YaHM tezroq o'sishi uchun faqat xomashyo emas, yuqori qo'shilgan qiymat beradigan mahsulot ishlab chiqarish muhim."
      },
      {
        title: "Qishloq xo'jaligini raqamlashtirish",
        impact: "O'rta-yuqori",
        recommendation:
          "Suv tejamkor texnologiyalar, hosildorlik monitoringi va agro-logistika xaritalarini joriy qilish kerak.",
        reason:
          "Qoraqalpog'istonda suv resurslari va yer unumdorligi muhim omil, aniq geoma'lumotlar xarajatni kamaytiradi."
      },
      {
        title: "Xizmatlar va turizmni kengaytirish",
        impact: "O'rta",
        recommendation:
          "Nukusdagi Savitskiy muzeyi, Orolbo'yi turizmi va servis infratuzilmasi atrofida yangi xizmatlar klasterini rivojlantirish kerak.",
        reason:
          "Xizmatlar sohasi tez ish o'rni yaratadi va shahardagi daromad aylanishini oshiradi."
      },
      {
        title: "Transport-logistika markazlarini kuchaytirish",
        impact: "O'rta",
        recommendation:
          "Yo'l, omborxona va hududlararo yetkazib berish zanjirlarini geotahlil asosida optimallashtirish kerak.",
        reason:
          "Logistika xarajatlari kamayganda mahalliy biznesning foydasi va hududiy raqobatbardoshlik oshadi."
      },
      {
        title: "Oyliklarni oshirish uchun malaka dasturlari",
        impact: "Uzoq muddatli",
        recommendation:
          "IT, muhandislik, servis va sanoat kasblari bo'yicha qisqa muddatli amaliy o'quv dasturlarini kengaytirish kerak.",
        reason:
          "Mehnat unumdorligi oshsa, o'rtacha oylik va aholi daromadi ham barqaror o'sadi."
      }
    ]
  };
}

export async function getCityEconomicIndicators({
  cityName,
  locationData
}) {
  if (isKarakalpakstanLocation(cityName, locationData)) {
    return getKarakalpakstanEconomicIndicators();
  }

  return getKarakalpakstanEconomicIndicators();
}
