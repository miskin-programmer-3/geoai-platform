# GeoAI Project

Diplom ishi mavzusi: **Ochiq manbalardan olingan geoma'lumotlarni Python va sun'iy intellekt yordamida tahlil qilish va vizualizatsiya qilish**.

Ushbu loyiha ochiq geoma'lumotlarni yig'ish, tahlil qilish va interaktiv xaritada ko'rsatish uchun yaratilgan. Frontend qismi React orqali vizual interfeys beradi, backend qismi esa FastAPI orqali tahlil APIlarini taqdim etadi.

## Asosiy imkoniyatlar

- Foydalanuvchi joylashuvini brauzer geolocation API orqali aniqlash.
- OpenStreetMap xaritasi orqali geoma'lumotlarni vizualizatsiya qilish.
- USGS ochiq zilzila ma'lumotlarini xaritada va ro'yxatda ko'rsatish.
- Open-Meteo orqali joriy ob-havo ma'lumotlarini olish.
- Nominatim orqali koordinata bo'yicha manzil ma'lumotini aniqlash.
- Overpass API orqali yaqin atrofdagi binolar geometriyasini olish.
- FastAPI backend orqali bino riskini tahlil qilish.

## Texnologiyalar

- Frontend: React, Vite, React Router, React Leaflet, Recharts, Axios.
- Backend: Python, FastAPI, Pydantic.
- AI/analysis: rule-based building risk scoring; YOLO integratsiyasi uchun boshlang'ich modul mavjud.
- Open data sources: OpenStreetMap, Overpass API, Nominatim, Open-Meteo, USGS Earthquake API.

## Loyiha tuzilmasi

```text
geoai-project/
  backend/
    app/
      main.py
      ai.py
    requirements.txt
  frontend/
    src/
      components/
      context/
      pages/
      services/
      utils/
```

## Ishga tushirish

Backend:

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend odatda `http://localhost:5173` manzilida, backend esa `http://127.0.0.1:8001` manzilida ishlaydi.

## Diplom uchun izoh

Loyiha ochiq manbali geoma'lumotlar bilan ishlash zanjirini ko'rsatadi: ma'lumot olish, Python backendda tahlil qilish, React interfeysida xarita va grafiklar orqali vizualizatsiya qilish. Keyingi rivojlantirish bosqichida bino risk tahlilini haqiqiy machine learning modeli yoki kompyuter ko'rish modeli bilan almashtirish mumkin.
