import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell,
  Camera,
  CheckCircle2,
  CloudSun,
  LogIn,
  MapPin,
  MessageCircle,
  Phone,
  RadioTower,
  Save,
  Send,
  ShieldCheck,
  Smartphone,
  User,
  UserPlus,
  Waves
} from "lucide-react";

import { LocationContext } from "../context/locationContextValue";
import {
  getProfile,
  sendPhoneVerificationCode,
  updateProfile as saveProfile,
  updateProfileAvatar,
  verifyPhoneCode
} from "../services/api";

import "./Profile.css";

const alertOptions = [
  {
    key: "weather",
    label: "Ob-havo ogohlantirishlari",
    description: "Kuchli shamol, issiq havo yoki yomg'ir xavfi bo'lsa SMS yuboriladi.",
    icon: CloudSun
  },
  {
    key: "seismic",
    label: "Zilzila monitoringi",
    description: "Yaqin hududdagi sezilarli seysmik hodisalar haqida ogohlantiradi.",
    icon: Waves
  },
  {
    key: "air",
    label: "Havo sifati",
    description: "AQI yomonlashganda tashqariga chiqish bo'yicha tavsiya beradi.",
    icon: RadioTower
  }
];

const contactLinks = [
  {
    label: "Telegram",
    value: "@shatl1k_bazarbayev",
    href: "https://t.me/shatl1k_bazarbayev",
    icon: Send,
    tone: "telegram"
  },
  {
    label: "Instagram",
    value: "@shatl1k_bazarbayev",
    href: "https://instagram.com/shatl1k_bazarbayev",
    icon: MessageCircle,
    tone: "instagram"
  },
  {
    label: "Telefon",
    value: "+998 91 300 02 03",
    href: "tel:+998913000203",
    icon: Phone,
    tone: "phone"
  }
];

const MAX_AVATAR_SIZE_MB = 5;
const MAX_AVATAR_DIMENSION = 900;
const AVATAR_QUALITY = 0.82;

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Rasmni o'qib bo'lmadi."));
    image.src = dataUrl;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Faylni o'qishda xatolik yuz berdi."));
    reader.readAsDataURL(file);
  });
}

async function prepareAvatarDataUrl(file) {
  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const scale = Math.min(
    1,
    MAX_AVATAR_DIMENSION / image.width,
    MAX_AVATAR_DIMENSION / image.height
  );
  const canvas = document.createElement("canvas");

  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");

  if (!context)
    return originalDataUrl;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL("image/jpeg", AVATAR_QUALITY);
}

function mapApiProfileToState(apiProfile, fallback = {}) {
  return {
    ...fallback,
    fullName: apiProfile.full_name || "GeoAI foydalanuvchi",
    email: apiProfile.email || "",
    phone: apiProfile.phone || "",
    city: apiProfile.city || "Nukus",
    contact: apiProfile.contact || "",
    avatarDataUrl: apiProfile.avatar_data_url || "",
    isRegistered: true
  };
}

function getStoredProfileState() {
  const defaultProfile = {
    fullName: "",
    email: "",
    phone: "",
    city: "Nukus",
    contact: "",
    avatarDataUrl: "",
    isRegistered: false
  };

  try {
    const savedUser = window.localStorage.getItem("geoai_user");

    if (!savedUser)
      return defaultProfile;

    return mapApiProfileToState(
      JSON.parse(savedUser),
      defaultProfile
    );
  } catch (error) {
    console.error(error);
    window.localStorage.removeItem("geoai_user");
    return defaultProfile;
  }
}

function Profile() {
  const { latitude, longitude } =
    useContext(LocationContext);

  const [profile, setProfile] =
    useState(getStoredProfileState);

  const [settings, setSettings] =
    useState({
      weather: true,
      seismic: true,
      air: false,
      sms: true,
      push: true
    });

  const [pendingPhone, setPendingPhone] =
    useState(() => getStoredProfileState().phone);

  const [verificationCode, setVerificationCode] =
    useState("");

  const [phoneStatus, setPhoneStatus] =
    useState("");

  const [codeSent, setCodeSent] =
    useState(false);

  const [phoneLoading, setPhoneLoading] =
    useState(false);

  const [profileStatus, setProfileStatus] =
    useState("");

  const [profileLoading, setProfileLoading] =
    useState(false);

  const [avatarLoading, setAvatarLoading] =
    useState(false);

  const locationLabel = useMemo(
    () => {
      if (
        typeof latitude === "number" &&
        typeof longitude === "number"
      )
        return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      return "Nukus standart lokatsiyasi";
    },
    [latitude, longitude]
  );

  const loadProfile = useCallback(async (contact) => {
    try {
      setProfileLoading(true);
      const response = await getProfile(contact);

      if (!response.profile) {
        window.localStorage.removeItem("geoai_user");
        setProfile((current) => ({
          ...current,
          isRegistered: false
        }));
        return;
      }

      window.localStorage.setItem(
        "geoai_user",
        JSON.stringify(response.profile)
      );
      setProfile((current) =>
        mapApiProfileToState(response.profile, current)
      );
      setPendingPhone(response.profile.phone || "");
    } catch (error) {
      console.error(error);
      setProfileStatus("Profil ma'lumotlarini yuklashda xatolik yuz berdi.");
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(
    () => {
      if (!profile.contact)
        return undefined;

      const timer = window.setTimeout(
        () => loadProfile(profile.contact),
        0
      );

      return () => window.clearTimeout(timer);
    },
    [loadProfile, profile.contact]
  );

  function updateProfile(field, value) {
    setProfile((current) => ({
      ...current,
      [field]: value
    }));
  }

  function toggleSetting(key) {
    setSettings((current) => ({
      ...current,
      [key]: !current[key]
    }));
  }

  async function handleSaveProfile(nextPhone = profile.phone) {
    if (!profile.contact)
      return;

    try {
      setProfileLoading(true);
      const response = await saveProfile({
        contact: profile.contact,
        fullName: profile.fullName,
        email: profile.email,
        phone: nextPhone,
        city: profile.city
      });

      if (!response.profile) {
        setProfileStatus(response.message);
        return;
      }

      window.localStorage.setItem(
        "geoai_user",
        JSON.stringify(response.profile)
      );
      setProfile((current) =>
        mapApiProfileToState(response.profile, current)
      );
      setPendingPhone(response.profile.phone || "");
      setProfileStatus(response.message);
    } catch (error) {
      console.error(error);
      setProfileStatus("Profilni saqlashda xatolik yuz berdi.");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];

    if (!file || !profile.contact)
      return;

    if (!file.type.startsWith("image/")) {
      setProfileStatus("Faqat rasm faylini tanlang.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
      setProfileStatus(`Rasm hajmi ${MAX_AVATAR_SIZE_MB} MB dan oshmasligi kerak.`);
      event.target.value = "";
      return;
    }

    try {
      setAvatarLoading(true);
      setProfileStatus("Profil rasmi yuklanmoqda...");

      const avatarDataUrl = await prepareAvatarDataUrl(file);
      const response = await updateProfileAvatar({
        contact: profile.contact,
        avatarDataUrl
      });

      if (!response.profile) {
        setProfileStatus(response.message);
        return;
      }

      window.localStorage.setItem(
        "geoai_user",
        JSON.stringify(response.profile)
      );
      setProfile((current) =>
        mapApiProfileToState(response.profile, current)
      );
      setProfileStatus(response.message);
    } catch (error) {
      console.error(error);
      setProfileStatus("Profil rasmini yuklashda xatolik yuz berdi.");
    } finally {
      setAvatarLoading(false);
      event.target.value = "";
    }
  }

  async function handleSendPhoneCode() {
    try {
      setPhoneLoading(true);
      setPhoneStatus("");

      const response =
        await sendPhoneVerificationCode(pendingPhone);

      if (!response.sms_ready) {
        setPhoneStatus(response.message);
        return;
      }

      setCodeSent(true);
      setPhoneStatus(response.message);
    } catch (error) {
      console.error(error);
      setPhoneStatus("Tasdiqlash kodini yuborishda xatolik yuz berdi.");
    } finally {
      setPhoneLoading(false);
    }
  }

  async function handleVerifyPhoneCode() {
    try {
      setPhoneLoading(true);

      const response =
        await verifyPhoneCode({
          phone: pendingPhone,
          code: verificationCode
        });

      setPhoneStatus(response.message);

      if (response.verified) {
        await handleSaveProfile(pendingPhone);
        setVerificationCode("");
        setCodeSent(false);
      }
    } catch (error) {
      console.error(error);
      setPhoneStatus("Kodni tasdiqlashda xatolik yuz berdi.");
    } finally {
      setPhoneLoading(false);
    }
  }

  return (
    <motion.div
      className="profile-page"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <section className={profile.isRegistered ? "profile-hero verified" : "profile-hero unverified"}>
        <div className="profile-avatar">
          {profile.avatarDataUrl ? (
            <img src={profile.avatarDataUrl} alt="Profil rasmi" />
          ) : (
            <User size={34} />
          )}
        </div>

        <div>
          <p>
            <ShieldCheck size={18} />
            {profile.isRegistered
              ? profileLoading ? "Profil yuklanmoqda" : "Tasdiqlangan GeoAI profili"
              : "Tasdiqlanmagan GeoAI profili"}
          </p>
          <h1>Foydalanuvchi profili</h1>
          <span>
            Shaxsiy ma'lumotlar, SMS ogohlantirishlar va monitoring sozlamalarini boshqaring.
          </span>
        </div>
      </section>

      {!profile.isRegistered && (
        <motion.section
          className="profile-card profile-auth-gate"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="profile-auth-actions">
            <Link
              className="profile-auth-button primary"
              to="/register"
            >
              <UserPlus size={18} />
              Ro'yxatdan o'tish
            </Link>

            <Link
              className="profile-auth-button secondary"
              to="/login"
            >
              <LogIn size={18} />
              Kirish
            </Link>
          </div>
        </motion.section>
      )}

      {profile.isRegistered && (
        <>
      <section className="profile-grid">
        <motion.div
          className="profile-card profile-summary"
          whileHover={{ y: -3 }}
        >
          <div className="profile-mini-avatar">
            {profile.avatarDataUrl ? (
              <img src={profile.avatarDataUrl} alt="Profil rasmi" />
            ) : (
              profile.fullName.slice(0, 1).toUpperCase()
            )}
          </div>

          <h2>{profile.fullName}</h2>
          <p>{profile.email || profile.contact}</p>

          <label className="profile-avatar-upload">
            <Camera size={18} />
            {avatarLoading ? "Yuklanmoqda..." : "Profil rasmi yuklash"}
            <input
              type="file"
              accept="image/*"
              disabled={avatarLoading || profileLoading}
              onChange={handleAvatarChange}
            />
          </label>

          <div className="profile-status-list">
            <span>
              <Phone size={17} />
              {profile.phone}
            </span>
            <span>
              <MapPin size={17} />
              {locationLabel}
            </span>
            <span>
              <Bell size={17} />
              {settings.sms ? "SMS ogohlantirish yoqilgan" : "SMS o'chirilgan"}
            </span>
            <span className={profile.isRegistered ? "account-status verified" : "account-status unverified"}>
              <ShieldCheck size={17} />
              {profile.isRegistered
                ? "Ro'yxatdan o'tgan"
                : "Ro'yxatdan o'tmagan"}
            </span>
          </div>
        </motion.div>

        <motion.form
          className="profile-card profile-form"
          whileHover={{ y: -3 }}
        >
          <div className="profile-section-title">
            <User size={22} />
            <h2>Shaxsiy ma'lumotlar</h2>
          </div>

          <label>
            F.I.Sh
            <input
              value={profile.fullName}
              onChange={(event) =>
                updateProfile("fullName", event.target.value)
              }
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={profile.email}
              onChange={(event) =>
                updateProfile("email", event.target.value)
              }
            />
          </label>

          <label>
            Telefon raqam
            <input
              type="tel"
              value={pendingPhone}
              onChange={(event) =>
                setPendingPhone(event.target.value)
              }
            />
          </label>

          <div className="phone-verification-box">
            <div>
              <Smartphone size={20} />
              <span>
                {profile.isRegistered
                  ? "Raqamni o'zgartirish uchun server bir martalik kod yuboradi."
                  : "Telefonni SMS orqali tasdiqlash uchun avval ro'yxatdan o'tish kerak."}
              </span>
            </div>

            <button
              type="button"
              className="secondary-action"
              disabled={
                !profile.isRegistered ||
                phoneLoading ||
                pendingPhone.trim() === "" ||
                pendingPhone === profile.phone
              }
              onClick={handleSendPhoneCode}
            >
              Kod yuborish
            </button>

            {codeSent && (
              <div className="verification-code-row">
                <input
                  value={verificationCode}
                  inputMode="numeric"
                  placeholder="6 xonali kod"
                  onChange={(event) =>
                    setVerificationCode(event.target.value)
                  }
                />
                <button
                  type="button"
                  disabled={phoneLoading || verificationCode.length < 4}
                  onClick={handleVerifyPhoneCode}
                >
                  Tasdiqlash
                </button>
              </div>
            )}

            {phoneStatus && (
              <p>{phoneStatus}</p>
            )}

            {!profile.isRegistered && (
              <p>
                Hozirgi profil demo holatda. Ro'yxatdan o'tgandan keyin bir martalik kod orqali telefon raqamini yangilash mumkin bo'ladi.
              </p>
            )}
          </div>

          <label>
            Asosiy shahar
            <input
              value={profile.city}
              onChange={(event) =>
                updateProfile("city", event.target.value)
              }
            />
          </label>

          <button
            type="button"
            disabled={profileLoading}
            onClick={() => handleSaveProfile()}
          >
            <Save size={18} />
            {profileLoading ? "Saqlanmoqda..." : "Saqlash"}
          </button>

          {profileStatus && (
            <p className="profile-form-status">{profileStatus}</p>
          )}
        </motion.form>
      </section>

      <section className="profile-card">
        <div className="profile-section-title">
          <Bell size={22} />
          <div>
            <h2>Ogohlantirish sozlamalari</h2>
            <p>
              Ro'yxatdan o'tgan foydalanuvchi uchun muhim xavflar telefon raqamiga SMS orqali yuboriladi.
            </p>
          </div>
        </div>

        <div className="profile-toggle-row">
          <TogglePill
            active={settings.sms}
            label="SMS"
            onClick={() => toggleSetting("sms")}
          />
          <TogglePill
            active={settings.push}
            label="Platforma bildirishnomasi"
            onClick={() => toggleSetting("push")}
          />
        </div>

        <div className="alert-preference-grid">
          {alertOptions.map((item) => {
            const Icon = item.icon;

            return (
              <button
                type="button"
                className={settings[item.key] ? "alert-preference active" : "alert-preference"}
                key={item.key}
                onClick={() => toggleSetting(item.key)}
              >
                <Icon size={22} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                {settings[item.key] && <CheckCircle2 size={20} />}
              </button>
            );
          })}
        </div>
      </section>
        </>
      )}

      <section className="profile-card profile-contact-section">
        <div className="profile-section-title">
          <Phone size={22} />
          <div>
            <h2>Bog'lanish</h2>
            <p>
              Savollar, loyiha bo'yicha fikrlar yoki hamkorlik uchun quyidagi tarmoqlar orqali bog'laning.
            </p>
          </div>
        </div>

        <div className="profile-contact-grid">
          {contactLinks.map((contact) => {
            const Icon = contact.icon;

            return (
              <motion.a
                className={`profile-contact-card ${contact.tone}`}
                href={contact.href}
                key={contact.label}
                target={contact.href.startsWith("http") ? "_blank" : undefined}
                rel={contact.href.startsWith("http") ? "noreferrer" : undefined}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="contact-icon">
                  <Icon size={24} />
                </span>
                <span>
                  <strong>{contact.label}</strong>
                  <small>{contact.value}</small>
                </span>
              </motion.a>
            );
          })}
        </div>
      </section>
    </motion.div>
  );
}

function TogglePill({ active, label, onClick }) {
  return (
    <button
      type="button"
      className={active ? "profile-toggle active" : "profile-toggle"}
      onClick={onClick}
    >
      <span />
      {label}
    </button>
  );
}

export default Profile;
