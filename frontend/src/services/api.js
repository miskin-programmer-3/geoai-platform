// frontend/src/services/api.js

import axios from "axios";

// Backend bilan bog'lanish
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

const API = axios.create({
  baseURL: API_BASE_URL,
});

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (digits.startsWith("998") && digits.length === 12)
    return `+${digits}`;

  if (digits.length === 9)
    return `+998${digits}`;

  if (digits)
    return `+${digits}`;

  return "";
}

export async function analyzeBuildingRisk({
  yearBuilt,
  floors,
  material
}) {
  const response = await API.post(
    "/api/building-risk",
    {
      year_built: Number(yearBuilt),
      floors: Number(floors),
      material
    }
  );

  return response.data;
}

export async function createWeatherAlert({
  phone,
  isRegistered,
  alertTitle,
  alertMessage,
  severity
}) {
  const response = await API.post(
    "/api/notifications/weather-alert",
    {
      phone,
      is_registered: isRegistered,
      alert_title: alertTitle,
      alert_message: alertMessage,
      severity
    }
  );

  return response.data;
}

export async function sendPhoneVerificationCode(phone) {
  const response = await API.post(
    "/api/profile/phone/send-code",
    {
      phone: normalizePhone(phone)
    }
  );

  return response.data;
}

export async function verifyPhoneCode({
  phone,
  code
}) {
  const response = await API.post(
    "/api/profile/phone/verify-code",
    {
      phone: normalizePhone(phone),
      code
    }
  );

  return response.data;
}

export async function sendEmailVerificationCode(email) {
  const response = await API.post(
    "/api/auth/email/send-code",
    {
      email
    }
  );

  return response.data;
}

export async function verifyEmailCode({
  email,
  code
}) {
  const response = await API.post(
    "/api/auth/email/verify-code",
    {
      email,
      code
    }
  );

  return response.data;
}

export async function registerUser({
  fullName,
  method,
  phone,
  email,
  password,
  phoneVerified,
  emailVerified
}) {
  const response = await API.post(
    "/api/auth/register",
    {
      full_name: fullName,
      method,
      phone: phone ? normalizePhone(phone) : null,
      email: email || null,
      password,
      phone_verified: phoneVerified,
      email_verified: emailVerified
    }
  );

  return response.data;
}

export async function getProfile(contact) {
  const response = await API.get(
    `/api/profile/${encodeURIComponent(contact)}`
  );

  return response.data;
}

export async function updateProfile({
  contact,
  fullName,
  email,
  phone,
  city
}) {
  const response = await API.put(
    "/api/profile",
    {
      contact,
      full_name: fullName,
      email,
      phone,
      city
    }
  );

  return response.data;
}

export async function updateProfileAvatar({
  contact,
  avatarDataUrl
}) {
  const response = await API.put(
    "/api/profile/avatar",
    {
      contact,
      avatar_data_url: avatarDataUrl
    }
  );

  return response.data;
}

export async function loginUser({
  method,
  phone,
  email,
  password
}) {
  const response = await API.post(
    "/api/auth/login",
    {
      method,
      phone: phone ? normalizePhone(phone) : null,
      email: email || null,
      password
    }
  );

  return response.data;
}

export async function sendPasswordResetCode({
  method,
  phone,
  email
}) {
  const response = await API.post(
    "/api/auth/password-reset/send-code",
    {
      method,
      phone: phone ? normalizePhone(phone) : null,
      email: email || null
    }
  );

  return response.data;
}

export async function verifyPasswordResetCode({
  method,
  phone,
  email,
  code
}) {
  const response = await API.post(
    "/api/auth/password-reset/verify-code",
    {
      method,
      phone: phone ? normalizePhone(phone) : null,
      email: email || null,
      code
    }
  );

  return response.data;
}

export async function confirmPasswordReset({
  method,
  phone,
  email,
  newPassword
}) {
  const response = await API.post(
    "/api/auth/password-reset/confirm",
    {
      method,
      phone: phone ? normalizePhone(phone) : null,
      email: email || null,
      new_password: newPassword
    }
  );

  return response.data;
}

export async function getAuthStats() {
  const response = await API.get("/api/auth/stats");

  return response.data;
}

export async function sendOnlineHeartbeat(contact) {
  const response = await API.post(
    "/api/auth/online",
    {
      contact
    }
  );

  return response.data;
}

export default API;
