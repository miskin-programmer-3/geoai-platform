from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import date, datetime, timedelta
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path
import hashlib
import html
import json
import os
import secrets
import smtplib
import socket
import ssl
import urllib.error
import urllib.parse
import urllib.request

app = FastAPI(
    title="GeoAI Backend",
    description="Open source geodata analysis and visualization API.",
    version="0.1.0",
)


class BuildingRiskRequest(BaseModel):
    year_built: int = Field(..., ge=1800, le=2100)
    floors: int = Field(..., ge=1, le=200)
    material: str = Field(..., pattern="^(brick|concrete|steel)$")


class BuildingRiskResponse(BaseModel):
    score: int
    level: str
    risk_color: str
    confidence: str
    summary: str
    recommendation: str
    estimated_seismic_resistance: dict
    factors: list[str]
    score_breakdown: list[dict]
    methodology: list[str]


class WeatherAlertRequest(BaseModel):
    phone: str | None = None
    is_registered: bool = False
    alert_title: str
    alert_message: str
    severity: str = Field(..., pattern="^(low|medium|high)$")


class WeatherAlertResponse(BaseModel):
    status: str
    sms_ready: bool
    message: str


class PhoneCodeRequest(BaseModel):
    phone: str = Field(..., min_length=7, max_length=24)


class PhoneCodeResponse(BaseModel):
    status: str
    sms_ready: bool
    message: str
    expires_in_seconds: int
    demo_code: str | None = None


class PhoneVerifyRequest(BaseModel):
    phone: str = Field(..., min_length=7, max_length=24)
    code: str = Field(..., min_length=4, max_length=8)


class PhoneVerifyResponse(BaseModel):
    status: str
    verified: bool
    message: str


class EmailCodeRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)


class EmailCodeResponse(BaseModel):
    status: str
    email_ready: bool
    message: str
    expires_in_seconds: int
    demo_code: str | None = None


class EmailVerifyRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    code: str = Field(..., min_length=4, max_length=8)


class EmailVerifyResponse(BaseModel):
    status: str
    verified: bool
    message: str


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=80)
    method: str = Field(..., pattern="^(phone|email)$")
    phone: str | None = Field(default=None, min_length=7, max_length=24)
    email: str | None = Field(default=None, min_length=5, max_length=120)
    password: str = Field(..., min_length=6, max_length=128)
    phone_verified: bool = False
    email_verified: bool = False


class RegisterResponse(BaseModel):
    status: str
    registered: bool
    message: str
    user: dict | None = None


class LoginRequest(BaseModel):
    method: str = Field(..., pattern="^(phone|email)$")
    phone: str | None = Field(default=None, min_length=7, max_length=24)
    email: str | None = Field(default=None, min_length=5, max_length=120)
    password: str = Field(..., min_length=1, max_length=128)


class LoginResponse(BaseModel):
    status: str
    logged_in: bool
    message: str
    user: dict | None = None


class AuthStatsResponse(BaseModel):
    registered_users: int
    online_users: int
    message: str


class OnlineHeartbeatRequest(BaseModel):
    contact: str = Field(..., min_length=5, max_length=120)


class OnlineHeartbeatResponse(BaseModel):
    status: str
    online_users: int
    message: str


class PasswordResetCodeRequest(BaseModel):
    method: str = Field(..., pattern="^(phone|email)$")
    phone: str | None = Field(default=None, min_length=7, max_length=24)
    email: str | None = Field(default=None, min_length=5, max_length=120)


class PasswordResetCodeResponse(BaseModel):
    status: str
    code_ready: bool
    message: str
    expires_in_seconds: int
    demo_code: str | None = None


class PasswordResetVerifyRequest(BaseModel):
    method: str = Field(..., pattern="^(phone|email)$")
    phone: str | None = Field(default=None, min_length=7, max_length=24)
    email: str | None = Field(default=None, min_length=5, max_length=120)
    code: str = Field(..., min_length=4, max_length=8)


class PasswordResetVerifyResponse(BaseModel):
    status: str
    verified: bool
    message: str


class PasswordResetConfirmRequest(BaseModel):
    method: str = Field(..., pattern="^(phone|email)$")
    phone: str | None = Field(default=None, min_length=7, max_length=24)
    email: str | None = Field(default=None, min_length=5, max_length=120)
    new_password: str = Field(..., min_length=6, max_length=128)


class PasswordResetConfirmResponse(BaseModel):
    status: str
    updated: bool
    message: str


class ProfileResponse(BaseModel):
    status: str
    profile: dict | None = None
    message: str


class ProfileUpdateRequest(BaseModel):
    contact: str = Field(..., min_length=5, max_length=120)
    full_name: str | None = Field(default=None, min_length=2, max_length=80)
    email: str | None = Field(default=None, min_length=5, max_length=120)
    phone: str | None = Field(default=None, min_length=7, max_length=24)
    city: str | None = Field(default=None, min_length=2, max_length=80)


class AvatarUpdateRequest(BaseModel):
    contact: str = Field(..., min_length=5, max_length=120)
    avatar_data_url: str = Field(..., min_length=20, max_length=1200000)


phone_otp_store: dict[str, dict] = {}
email_otp_store: dict[str, dict] = {}
password_reset_store: dict[str, dict] = {}
registered_users: dict[str, dict] = {}
online_users: set[str] = set()
online_sessions: dict[str, datetime] = {}
sms_events: list[dict] = []
email_events: list[dict] = []
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
USERS_FILE = DATA_DIR / "users.json"


def load_env_file():
    env_path = BASE_DIR / ".env"

    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        clean = line.strip()

        if not clean or clean.startswith("#") or "=" not in clean:
            continue

        key, value = clean.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file()


def normalize_contact(value: str | None):
    if not value:
        return ""

    return value.strip().lower().replace(" ", "")


def normalize_phone_contact(value: str | None):
    if not value:
        return ""

    digits = "".join(ch for ch in value if ch.isdigit())

    if digits.startswith("998") and len(digits) == 12:
        return f"+{digits}"

    if len(digits) == 9:
        return f"+998{digits}"

    if digits:
        return f"+{digits}"

    return normalize_contact(value)


def hash_password(password: str):
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def password_matches(saved_password: str | None, raw_password: str):
    if not saved_password:
        return False

    if saved_password == raw_password:
        return True

    return saved_password == hash_password(raw_password)


def save_users():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    USERS_FILE.write_text(
        json.dumps(registered_users, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_users():
    if not USERS_FILE.exists():
        return

    try:
        registered_users.update(
            json.loads(USERS_FILE.read_text(encoding="utf-8"))
        )
    except (json.JSONDecodeError, OSError):
        registered_users.clear()


def public_user(contact: str, user: dict):
    return {
        "full_name": user.get("full_name", "GeoAI foydalanuvchi"),
        "method": user.get("method"),
        "contact": contact,
        "email": user.get("email", ""),
        "phone": normalize_phone_contact(user.get("phone", "")) if user.get("phone") else "",
        "city": user.get("city", "Nukus"),
        "avatar_data_url": user.get("avatar_data_url", ""),
        "created_at": user.get("created_at"),
    }


def remember_sms_event(phone: str, status: str, detail: str, provider_response=None):
    sms_events.append({
        "time": datetime.utcnow().isoformat(),
        "phone_tail": normalize_phone_for_sms(phone)[-4:],
        "status": status,
        "detail": detail,
        "provider_response": provider_response,
    })

    if len(sms_events) > 20:
        sms_events.pop(0)


def remember_email_event(to_email: str, status: str, detail: str):
    safe_email = normalize_contact(to_email)
    email_events.append({
        "time": datetime.utcnow().isoformat(),
        "email_hint": (
            f"{safe_email[:2]}***@{safe_email.split('@', 1)[1]}"
            if "@" in safe_email
            else "***"
        ),
        "status": status,
        "detail": detail,
    })

    if len(email_events) > 20:
        email_events.pop(0)


def normalize_phone_for_sms(phone: str):
    digits = "".join(ch for ch in phone if ch.isdigit())

    if digits.startswith("998"):
        return f"+{digits}"

    if len(digits) == 9:
        return f"+998{digits}"

    return phone.strip()


def simcard_success(response_data):
    if response_data.get("success") is True:
        return True

    status = str(response_data.get("status", "")).lower()
    return status in {"queued", "sent", "delivered"}


def post_simcard_payload(api_key: str, payload: dict, as_json=False):
    if as_json:
        send_payload = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        content_type = "application/json"
    else:
        send_payload = urllib.parse.urlencode(payload, doseq=True).encode("utf-8")
        content_type = "application/x-www-form-urlencoded"

    send_request = urllib.request.Request(
        "https://simcard.uz/gateway/services/send.php",
        data=send_payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": content_type,
        },
        method="POST",
    )

    with urllib.request.urlopen(send_request, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def get_simcard_payload(api_key: str, payload: dict):
    query = urllib.parse.urlencode({
        "key": api_key,
        **payload,
    })
    request = urllib.request.Request(
        f"https://simcard.uz/gateway/services/send.php?{query}",
        method="GET",
    )

    with urllib.request.urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode("utf-8"))


def send_simcard_sms(phone: str, message: str):
    api_key = os.getenv("SIMCARD_API_KEY", "").strip()
    device_id = os.getenv("SIMCARD_DEVICE_ID", "").strip()
    sim_slot = os.getenv("SIMCARD_SIM_SLOT", "").strip()

    if not api_key:
        return False, "SIMCARD.UZ sozlanmagan. Backend .env fayliga SIMCARD_API_KEY kiriting."

    phone_with_plus = normalize_phone_for_sms(phone)
    phone_digits = "".join(ch for ch in phone_with_plus if ch.isdigit())
    base_payload = {
        "phone": normalize_phone_for_sms(phone),
        "message": message[:160],
    }

    if device_id:
        base_payload["device_id"] = device_id
    if sim_slot:
        base_payload["sim_slot"] = sim_slot

    try:
        attempts = [
            ("get_key_number", {
                "number": phone_with_plus,
                "message": message[:160],
            }, "get"),
            ("form_phone_plus", base_payload, False),
            ("form_phone_digits", {**base_payload, "phone": phone_digits}, False),
            ("form_phone_number", {
                **base_payload,
                "phone_number": phone_with_plus,
            }, False),
            ("form_phones_array", {
                **{key: value for key, value in base_payload.items() if key != "phone"},
                "phones[]": [phone_with_plus],
            }, False),
            ("json_phone_plus", base_payload, True),
        ]
        responses = []

        for attempt_name, payload, mode in attempts:
            if mode == "get":
                response_data = get_simcard_payload(api_key, payload)
            else:
                response_data = post_simcard_payload(api_key, payload, mode)

            responses.append({
                "attempt": attempt_name,
                "response": response_data,
            })

            if simcard_success(response_data):
                provider_response = {
                    "attempt": attempt_name,
                    "response": response_data,
                }
                remember_sms_event(
                    phone,
                    "queued",
                    "SIMCARD.UZ xabarni navbatga oldi.",
                    provider_response,
                )
                return True, "SMS kodi SIMCARD.UZ orqali real telefon raqamga yuborildi."

            error_message = str(
                response_data.get("error", {}).get("message", "")
            )
            if "No active device" in error_message:
                remember_sms_event(
                    phone,
                    "device_offline",
                    "SIMCARD.UZ akkauntida aktiv qurilma topilmadi.",
                    {
                        "attempt": attempt_name,
                        "response": response_data,
                    },
                )
                return False, (
                    "SIMCARD.UZ akkauntingizda aktiv qurilma topilmadi. "
                    "SMS yuborish uchun SIMCARD.UZ Android ilovasini telefonga o'rnating, "
                    "akkauntga ulang va qurilma online holatda bo'lishi kerak."
                )

        remember_sms_event(
            phone,
            "rejected",
            "SIMCARD.UZ SMS yuborishni rad etdi.",
            responses,
        )
        return False, f"SIMCARD.UZ SMS yuborishni rad etdi: {responses[-1]['response']}"
    except urllib.error.HTTPError as error:
        error_body = error.read().decode("utf-8", errors="replace")
        remember_sms_event(
            phone,
            "http_error",
            f"HTTP {error.code}",
            error_body[:500],
        )
        return False, f"SIMCARD.UZ HTTP xatolik qaytardi: {error.code}. {error_body[:180]}"
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        remember_sms_event(
            phone,
            "error",
            str(error),
            None,
        )
        return False, f"SIMCARD.UZ orqali SMS yuborishda xatolik: {error}"

def send_eskiz_sms(phone: str, message: str):
    eskiz_token = os.getenv("ESKIZ_TOKEN", "").strip()
    eskiz_email = os.getenv("ESKIZ_EMAIL", "").strip()
    eskiz_password = os.getenv("ESKIZ_PASSWORD", "").strip()
    sms_from = os.getenv("ESKIZ_FROM", "4546").strip()

    if not eskiz_token and not (eskiz_email and eskiz_password):
        return False, "SMS xizmati sozlanmagan. Backend .env fayliga ESKIZ_EMAIL va ESKIZ_PASSWORD kiriting."

    try:
        if not eskiz_token:
            login_payload = urllib.parse.urlencode({
                "email": eskiz_email,
                "password": eskiz_password,
            }).encode("utf-8")
            login_request = urllib.request.Request(
                "https://notify.eskiz.uz/api/auth/login",
                data=login_payload,
                method="POST",
            )

            with urllib.request.urlopen(login_request, timeout=15) as response:
                login_data = json.loads(response.read().decode("utf-8"))
                eskiz_token = login_data.get("data", {}).get("token", "")

        if not eskiz_token:
            return False, "SMS token olinmadi. Eskiz credentiallarini tekshiring."

        numeric_phone = "".join(ch for ch in normalize_phone_for_sms(phone) if ch.isdigit())
        send_payload = urllib.parse.urlencode({
            "mobile_phone": numeric_phone,
            "message": message,
            "from": sms_from,
        }).encode("utf-8")
        send_request = urllib.request.Request(
            "https://notify.eskiz.uz/api/message/sms/send",
            data=send_payload,
            headers={
                "Authorization": f"Bearer {eskiz_token}",
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method="POST",
        )

        with urllib.request.urlopen(send_request, timeout=15) as response:
            response_body = response.read().decode("utf-8", errors="replace")

        provider_response = None
        if response_body:
            try:
                provider_response = json.loads(response_body)
            except json.JSONDecodeError:
                provider_response = {"raw": response_body[:500]}

        remember_sms_event(
            phone,
            "sent",
            "Eskiz SMS xabarni qabul qildi.",
            provider_response,
        )
        return True, "SMS tasdiqlash kodi real telefon raqamga yuborildi."
    except urllib.error.HTTPError as error:
        error_body = error.read().decode("utf-8", errors="replace")
        remember_sms_event(
            phone,
            "http_error",
            f"Eskiz HTTP {error.code}",
            error_body[:500],
        )

        if (
            error.code == 400
            and (
                "Для теста можно использовать" in error_body
                or "This is test from Eskiz" in error_body
            )
        ):
            return False, (
                "Eskiz akkauntingiz hozir test rejimida. Real tasdiqlash kodini yuborish "
                "uchun Eskiz kabinetida SMS xizmatini to'liq aktivlashtiring, senderni "
                "tasdiqlating va balans/limit holatini tekshiring. Test rejimida Eskiz "
                "faqat o'zining tayyor test matnlarini yuborishga ruxsat beradi."
            )

        return False, f"Eskiz SMS xizmati xatolik qaytardi: {error.code}. {error_body[:180]}"
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        remember_sms_event(
            phone,
            "error",
            str(error),
            None,
        )
        return False, f"SMS yuborishda xatolik: {error}"


def send_real_sms(phone: str, message: str):
    sms_provider = os.getenv("SMS_PROVIDER", "").strip().lower()
    simcard_api_key = os.getenv("SIMCARD_API_KEY", "").strip()
    eskiz_email = os.getenv("ESKIZ_EMAIL", "").strip()
    eskiz_password = os.getenv("ESKIZ_PASSWORD", "").strip()
    eskiz_token = os.getenv("ESKIZ_TOKEN", "").strip()

    if sms_provider == "simcard":
        return send_simcard_sms(phone, message)

    if sms_provider == "eskiz":
        return send_eskiz_sms(phone, message)

    if simcard_api_key:
        return send_simcard_sms(phone, message)

    if eskiz_token or (eskiz_email and eskiz_password):
        return send_eskiz_sms(phone, message)

    return False, (
        "SMS xizmati sozlanmagan. Railway Variables ichiga SMS_PROVIDER=eskiz "
        "va ESKIZ_EMAIL, ESKIZ_PASSWORD qiymatlarini kiriting."
    )


def send_real_email(to_email: str, subject: str, message: str):
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_from = os.getenv("SMTP_FROM", smtp_user).strip()
    smtp_from_name = os.getenv("SMTP_FROM_NAME", "GeoAI Platformasi").strip()
    smtp_use_ssl = os.getenv("SMTP_USE_SSL", "").strip().lower() in {
        "1",
        "true",
        "yes",
    }

    if not smtp_host or not smtp_user or not smtp_password or not smtp_from:
        remember_email_event(
            to_email,
            "not_configured",
            "SMTP sozlamalari to'liq emas.",
        )
        return False, "Email xizmati sozlanmagan. Backend .env fayliga SMTP sozlamalarini kiriting."

    email = EmailMessage()
    email["From"] = formataddr((smtp_from_name, smtp_from))
    email["To"] = to_email
    email["Subject"] = subject
    email["Reply-To"] = smtp_from
    email.set_content(message)
    email.add_alternative(
        f"""
        <html>
          <body style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
            <div style="max-width:520px;margin:auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
              <h2 style="margin:0 0 12px;color:#075985;">GeoAI tasdiqlash kodi</h2>
              <p style="font-size:15px;line-height:1.5;margin:0 0 16px;">
                GeoAI platformasida ro'yxatdan o'tishni yakunlash uchun quyidagi kodni kiriting.
              </p>
              <div style="font-size:34px;font-weight:800;letter-spacing:6px;color:#0284c7;background:#e0f2fe;border-radius:10px;padding:16px;text-align:center;">
                {html.escape(subject.rsplit(':', 1)[-1].strip())}
              </div>
              <p style="font-size:13px;color:#64748b;margin:16px 0 0;">
                Kod 5 daqiqa amal qiladi. Agar bu so'rovni siz yubormagan bo'lsangiz, xabarni e'tiborsiz qoldiring.
              </p>
            </div>
          </body>
        </html>
        """,
        subtype="html",
    )

    def create_ipv4_connection(host: str, port: int, timeout: int):
        last_error = None

        for address in socket.getaddrinfo(
            host,
            port,
            socket.AF_INET,
            socket.SOCK_STREAM,
        ):
            family, socket_type, proto, _, socket_address = address

            try:
                smtp_socket = socket.socket(family, socket_type, proto)
                smtp_socket.settimeout(timeout)
                smtp_socket.connect(socket_address)
                return smtp_socket
            except OSError as error:
                last_error = error
                try:
                    smtp_socket.close()
                except OSError:
                    pass

        if last_error:
            raise last_error

        raise OSError(f"{host}:{port} uchun IPv4 manzil topilmadi.")

    def send_with_smtp(port: int, use_ssl: bool, force_ipv4=False):
        context = ssl.create_default_context()

        if force_ipv4:
            smtp_socket = create_ipv4_connection(smtp_host, port, 20)

            if use_ssl:
                smtp_socket = context.wrap_socket(
                    smtp_socket,
                    server_hostname=smtp_host,
                )

            server_context = smtplib.SMTP(timeout=20)
            server_context.sock = smtp_socket
            server_context.file = None
            server_context.helo_resp = None
            server_context.ehlo_resp = None
            server_context.esmtp_features = {}
            server_context.does_esmtp = False
            server_context.set_debuglevel(0)
            server_context.getreply()
        elif use_ssl:
            server_context = smtplib.SMTP_SSL(
                smtp_host,
                port,
                timeout=20,
                context=context,
            )
        else:
            server_context = smtplib.SMTP(smtp_host, port, timeout=20)

        with server_context as server:
            if not use_ssl:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()

            server.login(smtp_user, smtp_password)
            server.send_message(email)

    try:
        send_with_smtp(smtp_port, smtp_use_ssl or smtp_port == 465)

        remember_email_event(
            to_email,
            "sent",
            f"SMTP xabarni qabul qildi. Host: {smtp_host}:{smtp_port}. From: {smtp_from}",
        )
        return True, "Email tasdiqlash kodi real email manzilga yuborildi."
    except (OSError, smtplib.SMTPException) as error:
        try:
            send_with_smtp(smtp_port, smtp_use_ssl or smtp_port == 465, True)

            remember_email_event(
                to_email,
                "sent",
                f"SMTP IPv4 fallback xabarni qabul qildi. Host: {smtp_host}:{smtp_port}. From: {smtp_from}",
            )
            return True, "Email tasdiqlash kodi real email manzilga yuborildi."
        except (OSError, smtplib.SMTPException) as ipv4_error:
            remember_email_event(
                to_email,
                "ipv4_error",
                f"Default error: {error}; IPv4 fallback error: {ipv4_error}",
            )

        if smtp_port != 465 and not smtp_use_ssl:
            try:
                send_with_smtp(465, True)

                remember_email_event(
                    to_email,
                    "sent",
                    f"SMTP SSL fallback xabarni qabul qildi. Host: {smtp_host}:465. From: {smtp_from}",
                )
                return True, "Email tasdiqlash kodi real email manzilga yuborildi."
            except (OSError, smtplib.SMTPException) as fallback_error:
                remember_email_event(
                    to_email,
                    "error",
                    f"STARTTLS error: {error}; SSL fallback error: {fallback_error}",
                )
                return False, (
                    "Email yuborishda SMTP ulanish xatoligi: "
                    f"{fallback_error}. Railway Variables ichida SMTP_PORT=465 "
                    "va SMTP_USE_SSL=true qilib qayta deploy qiling."
                )

        remember_email_event(
            to_email,
            "error",
            str(error),
        )
        return False, f"Email yuborishda xatolik: {error}"


def get_contact_from_payload(method: str, phone: str | None, email: str | None):
    if method == "phone":
        return normalize_phone_contact(phone)

    return normalize_contact(email)


def find_user_contact(method: str, contact: str):
    if not contact:
        return ""

    if contact in registered_users:
        return contact

    for saved_contact, user in registered_users.items():
        if method == "phone":
            if normalize_phone_contact(user.get("phone")) == contact:
                return saved_contact
        elif normalize_contact(user.get("email")) == contact:
            return saved_contact

    return ""


def find_any_user_contact(contact: str):
    if not contact:
        return ""

    normalized_contact = normalize_contact(contact)
    normalized_phone = normalize_phone_contact(contact)

    if normalized_contact in registered_users:
        return normalized_contact

    if normalized_phone in registered_users:
        return normalized_phone

    for saved_contact, user in registered_users.items():
        if normalize_contact(user.get("email")) == normalized_contact:
            return saved_contact

        if normalize_phone_contact(user.get("phone")) == normalized_phone:
            return saved_contact

    return ""


def prune_online_sessions():
    active_until = datetime.utcnow() - timedelta(seconds=45)
    expired_contacts = [
        contact
        for contact, seen_at in online_sessions.items()
        if seen_at < active_until
    ]

    for contact in expired_contacts:
        online_sessions.pop(contact, None)
        online_users.discard(contact)


def mark_user_online(contact: str):
    if not contact:
        return

    normalized_contact = normalize_contact(contact)
    online_sessions[normalized_contact] = datetime.utcnow()
    online_users.add(normalized_contact)
    prune_online_sessions()


def count_online_users():
    prune_online_sessions()
    return len(online_sessions)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_users()


@app.get("/")
def home():
    return {
        "message": "GeoAI backend ishlayapti"
    }


@app.get("/api/debug/config")
def get_config_status():
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_from = os.getenv("SMTP_FROM", smtp_user).strip()
    smtp_port = os.getenv("SMTP_PORT", "").strip()
    smtp_use_ssl = os.getenv("SMTP_USE_SSL", "").strip()
    simcard_api_key = os.getenv("SIMCARD_API_KEY", "").strip()
    eskiz_email = os.getenv("ESKIZ_EMAIL", "").strip()
    eskiz_password = os.getenv("ESKIZ_PASSWORD", "").strip()
    eskiz_token = os.getenv("ESKIZ_TOKEN", "").strip()
    sms_provider = os.getenv("SMS_PROVIDER", "").strip().lower()

    return {
        "email": {
            "smtp_ready": bool(
                smtp_host and smtp_user and smtp_password and smtp_from
            ),
            "smtp_host_set": bool(smtp_host),
            "smtp_user_set": bool(smtp_user),
            "smtp_password_set": bool(smtp_password),
            "smtp_from_set": bool(smtp_from),
            "smtp_port": smtp_port or "587",
            "smtp_use_ssl": smtp_use_ssl or "false",
        },
        "sms": {
            "provider": sms_provider or (
                "simcard"
                if simcard_api_key
                else "eskiz"
                if eskiz_token or (eskiz_email and eskiz_password)
                else "not_configured"
            ),
            "simcard_ready": bool(simcard_api_key),
            "eskiz_ready": bool(eskiz_token or (eskiz_email and eskiz_password)),
            "eskiz_email_set": bool(eskiz_email),
            "eskiz_password_set": bool(eskiz_password),
            "eskiz_token_set": bool(eskiz_token),
        },
    }


@app.post("/api/building-risk", response_model=BuildingRiskResponse)
def analyze_building_risk(payload: BuildingRiskRequest):
    score = 0
    factors = []
    score_breakdown = []
    current_year = date.today().year
    age = current_year - payload.year_built

    if age > 40:
        score += 30
        factors.append("Bino yoshi 40 yildan katta")
        score_breakdown.append({
            "name": "Bino yoshi",
            "points": 30,
            "reason": "Eski binolarda konstruktiv eskirish, ta'mirlash sifati va seysmik me'yorlar farqi xavfni oshiradi.",
        })
    elif age > 20:
        score += 15
        factors.append("Bino yoshi 20 yildan katta")
        score_breakdown.append({
            "name": "Bino yoshi",
            "points": 15,
            "reason": "Bino yangi emas, shuning uchun davriy texnik monitoring talab qilinadi.",
        })
    else:
        score_breakdown.append({
            "name": "Bino yoshi",
            "points": 5,
            "reason": "Bino nisbatan yangi, lekin loyiha va qurilish sifati baribir tekshirilishi kerak.",
        })
        score += 5

    if payload.floors > 10:
        score += 20
        factors.append("Bino 10 qavatdan baland")
        score_breakdown.append({
            "name": "Qavatlar soni",
            "points": 20,
            "reason": "Baland binolarda shamol, evakuatsiya va seysmik yuklama ta'siri kuchliroq bo'ladi.",
        })
    elif payload.floors > 5:
        score += 10
        factors.append("Bino 5 qavatdan baland")
        score_breakdown.append({
            "name": "Qavatlar soni",
            "points": 10,
            "reason": "O'rta balandlikdagi binoda evakuatsiya va konstruktiv barqarorlik alohida baholanadi.",
        })
    else:
        score_breakdown.append({
            "name": "Qavatlar soni",
            "points": 4,
            "reason": "Past qavatli bino umumiy riskni kamaytiradi.",
        })
        score += 4

    material_scores = {
        "brick": 25,
        "concrete": 10,
        "steel": 5,
    }
    material_names = {
        "brick": "g'isht",
        "concrete": "beton",
        "steel": "po'lat",
    }
    material_score = material_scores[payload.material]
    score += material_score
    factors.append(f"Material xavf omili: {material_names[payload.material]}")
    material_reasons = {
        "brick": "G'ishtli binolarda armatura va bog'lovchi konstruksiya yetarli bo'lmasa seysmik xavf oshadi.",
        "concrete": "Beton binolar nisbatan mustahkam, lekin armatura sifati va yoriqlar holati muhim.",
        "steel": "Po'lat konstruksiya mos loyiha qilingan bo'lsa seysmik moslashuvchanlik yuqoriroq bo'ladi.",
    }
    score_breakdown.append({
        "name": "Konstruksiya materiali",
        "points": material_score,
        "reason": material_reasons[payload.material],
    })

    if age > 40 and payload.material == "brick":
        score += 12
        factors.append("Eski g'ishtli bino qo'shimcha xavf beradi")
        score_breakdown.append({
            "name": "Yosh + material kombinatsiyasi",
            "points": 12,
            "reason": "Eski g'ishtli binolarda seysmik mustahkamlash bo'lmasa xavf sezilarli oshadi.",
        })

    if payload.floors > 10 and payload.material != "steel":
        score += 8
        factors.append("Baland bino va material kombinatsiyasi qo'shimcha tekshiruv talab qiladi")
        score_breakdown.append({
            "name": "Balandlik + material kombinatsiyasi",
            "points": 8,
            "reason": "Baland binolarda konstruksiya turi va seysmik loyiha sifati xavfga kuchli ta'sir qiladi.",
        })

    score = min(score, 100)

    resistance_ball = 8
    resistance_reasons = []

    if payload.material == "steel":
        resistance_ball = 9
        resistance_reasons.append("Po'lat konstruksiya seysmik yuklamaga moslashuvchanroq bo'lishi mumkin.")
    elif payload.material == "concrete":
        resistance_ball = 8
        resistance_reasons.append("Beton konstruksiya to'g'ri armaturalangan bo'lsa yuqori bardoshlilik beradi.")
    else:
        resistance_ball = 7
        resistance_reasons.append("G'ishtli konstruksiya seysmik mustahkamlashga ko'proq bog'liq.")

    if age > 40:
        resistance_ball -= 1
        resistance_reasons.append("Bino eski bo'lgani uchun eski seysmik me'yorlar asosida qurilgan bo'lishi mumkin.")
    elif age <= 15:
        resistance_reasons.append("Bino nisbatan yangi, zamonaviy seysmik me'yorlarga yaqin bo'lishi ehtimoli yuqori.")

    if payload.floors > 10:
        resistance_ball -= 1
        resistance_reasons.append("Qavatlar soni ko'p bo'lgani uchun seysmik yuklama va evakuatsiya xavfi ortadi.")
    elif payload.floors <= 3:
        resistance_reasons.append("Past qavatli bino seysmik yuklamani nisbatan yengilroq qabul qiladi.")

    if payload.material == "brick" and age > 40:
        resistance_ball -= 1
        resistance_reasons.append("Eski g'ishtli bino mustahkamlashsiz bo'lsa bardoshlilik pastroq baholanadi.")

    resistance_ball = max(5, min(resistance_ball, 9))
    estimated_seismic_resistance = {
        "ball": resistance_ball,
        "label": f"{resistance_ball} ballgacha",
        "basis": resistance_reasons,
        "disclaimer": (
            "Bu taxminiy AI baholash. Aniq bardoshlilik muhandislik ekspertizasi, "
            "loyiha hujjatlari, poydevor va konstruktiv tekshiruv orqali aniqlanadi."
        ),
    }

    level = "Past xavf"
    risk_color = "green"
    confidence = "O'rtacha"
    summary = "Bino bo'yicha kiritilgan parametrlar umumiy xavfni past ko'rsatmoqda."
    recommendation = "Bino nisbatan xavfsiz ko'rinadi."

    if score > 60:
        level = "Yuqori xavf"
        risk_color = "red"
        confidence = "Yuqori"
        summary = "Kiritilgan parametrlar bino konstruktiv xavfi yuqori bo'lishi mumkinligini ko'rsatmoqda."
        recommendation = "Zudlik bilan konstruktiv tekshiruv tavsiya etiladi."
    elif score > 30:
        level = "O'rtacha xavf"
        risk_color = "yellow"
        confidence = "O'rtacha"
        summary = "Bino bo'yicha ayrim xavf omillari bor, davriy monitoring zarur."
        recommendation = "Davriy monitoring tavsiya etiladi."

    return {
        "score": score,
        "level": level,
        "risk_color": risk_color,
        "confidence": confidence,
        "summary": summary,
        "recommendation": recommendation,
        "estimated_seismic_resistance": estimated_seismic_resistance,
        "factors": factors,
        "score_breakdown": score_breakdown,
        "methodology": [
            "Tahlil bino yoshi, qavatlar soni va konstruksiya materiali asosida hisoblandi.",
            "Natija muhandislik ekspertizasi o'rnini bosa olmaydi, dastlabki AI baholash sifatida ishlatiladi.",
            "Aniq xulosa uchun poydevor, yoriqlar, loyiha hujjati va seysmik mustahkamlash holati tekshirilishi kerak.",
        ],
    }


@app.post("/api/notifications/weather-alert", response_model=WeatherAlertResponse)
def create_weather_alert(payload: WeatherAlertRequest):
    if not payload.is_registered:
        return {
            "status": "not_sent",
            "sms_ready": False,
            "message": "SMS yuborilmadi: foydalanuvchi ro'yxatdan o'tmagan.",
        }

    if not payload.phone:
        return {
            "status": "not_sent",
            "sms_ready": False,
            "message": "SMS yuborilmadi: telefon raqami kiritilmagan.",
        }

    sent, message = send_real_sms(
        payload.phone,
        f"GeoAI ogohlantirish: {payload.alert_title}. {payload.alert_message}",
    )

    if not sent:
        return {
            "status": "provider_not_ready",
            "sms_ready": False,
            "message": message,
        }

    return {
        "status": "sent",
        "sms_ready": True,
        "message": message,
    }


@app.post("/api/profile/phone/send-code", response_model=PhoneCodeResponse)
def send_phone_verification_code(payload: PhoneCodeRequest):
    normalized_phone = normalize_phone_contact(payload.phone)

    if find_user_contact("phone", normalized_phone):
        return {
            "status": "already_registered",
            "sms_ready": False,
            "message": "Bu raqam oldin ro'yxatdan o'tgan.",
            "expires_in_seconds": 0,
            "demo_code": None,
        }

    code = str(secrets.randbelow(900000) + 100000)
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    phone_otp_store[normalized_phone] = {
        "code": code,
        "expires_at": expires_at,
    }

    sms_sent, sms_message = send_real_sms(
        normalized_phone,
        f"GeoAI tasdiqlash kodi: {code}. Kod 5 daqiqa amal qiladi.",
    )

    if not sms_sent:
        phone_otp_store.pop(normalized_phone, None)
        return {
            "status": "provider_not_ready",
            "sms_ready": False,
            "message": sms_message,
            "expires_in_seconds": 0,
            "demo_code": None,
        }

    return {
        "status": "sent",
        "sms_ready": True,
        "message": sms_message,
        "expires_in_seconds": 300,
        "demo_code": None,
    }


@app.post("/api/profile/phone/verify-code", response_model=PhoneVerifyResponse)
def verify_phone_code(payload: PhoneVerifyRequest):
    normalized_phone = normalize_phone_contact(payload.phone)
    otp_record = phone_otp_store.get(normalized_phone)

    if not otp_record:
        return {
            "status": "not_found",
            "verified": False,
            "message": "Bu telefon raqami uchun aktiv tasdiqlash kodi topilmadi.",
        }

    if datetime.utcnow() > otp_record["expires_at"]:
        phone_otp_store.pop(normalized_phone, None)
        return {
            "status": "expired",
            "verified": False,
            "message": "Tasdiqlash kodi muddati tugagan. Yangi kod yuboring.",
        }

    if payload.code != otp_record["code"]:
        return {
            "status": "invalid",
            "verified": False,
            "message": "Tasdiqlash kodi noto'g'ri kiritildi.",
        }

    phone_otp_store.pop(normalized_phone, None)

    return {
        "status": "verified",
        "verified": True,
        "message": "Telefon raqami muvaffaqiyatli tasdiqlandi.",
    }


@app.post("/api/auth/email/send-code", response_model=EmailCodeResponse)
def send_email_verification_code(payload: EmailCodeRequest):
    normalized_email = normalize_contact(payload.email)

    if find_user_contact("email", normalized_email):
        return {
            "status": "already_registered",
            "email_ready": False,
            "message": "Bu email oldin ro'yxatdan o'tgan.",
            "expires_in_seconds": 0,
            "demo_code": None,
        }

    code = str(secrets.randbelow(900000) + 100000)
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    email_otp_store[normalized_email] = {
        "code": code,
        "expires_at": expires_at,
    }

    email_sent, email_message = send_real_email(
        normalized_email,
        f"GeoAI tasdiqlash kodi: {code}",
        (
            "GeoAI platformasida ro'yxatdan o'tish uchun tasdiqlash "
            f"kodingiz: {code}\n\nKod 5 daqiqa amal qiladi."
        ),
    )

    if not email_sent:
        email_otp_store.pop(normalized_email, None)
        return {
            "status": "provider_not_ready",
            "email_ready": False,
            "message": email_message,
            "expires_in_seconds": 0,
            "demo_code": None,
        }

    return {
        "status": "sent",
        "email_ready": True,
        "message": email_message,
        "expires_in_seconds": 300,
        "demo_code": None,
    }


@app.post("/api/auth/email/verify-code", response_model=EmailVerifyResponse)
def verify_email_code(payload: EmailVerifyRequest):
    normalized_email = normalize_contact(payload.email)
    otp_record = email_otp_store.get(normalized_email)

    if not otp_record:
        return {
            "status": "not_found",
            "verified": False,
            "message": "Bu email uchun aktiv tasdiqlash kodi topilmadi.",
        }

    if datetime.utcnow() > otp_record["expires_at"]:
        email_otp_store.pop(normalized_email, None)
        return {
            "status": "expired",
            "verified": False,
            "message": "Tasdiqlash kodi muddati tugagan. Yangi kod yuboring.",
        }

    if payload.code != otp_record["code"]:
        return {
            "status": "invalid",
            "verified": False,
            "message": "Tasdiqlash kodi noto'g'ri kiritildi.",
        }

    email_otp_store.pop(normalized_email, None)

    return {
        "status": "verified",
        "verified": True,
        "message": "Email manzil muvaffaqiyatli tasdiqlandi.",
    }


@app.post("/api/auth/register", response_model=RegisterResponse)
def register_user(payload: RegisterRequest):
    if payload.method == "phone":
        contact = normalize_phone_contact(payload.phone)

        if not contact:
            return {
                "status": "missing_phone",
                "registered": False,
                "message": "Telefon raqam kiritilmagan.",
            }

        if find_user_contact("phone", contact):
            return {
                "status": "already_registered",
                "registered": False,
                "message": "Bu raqam oldin ro'yxatdan o'tgan.",
            }

        if not payload.phone_verified:
            return {
                "status": "phone_not_verified",
                "registered": False,
                "message": "Telefon raqam tasdiqlanmagan.",
            }
    else:
        contact = normalize_contact(payload.email)

        if not contact:
            return {
                "status": "missing_email",
                "registered": False,
                "message": "Email kiritilmagan.",
            }

        if find_user_contact("email", contact):
            return {
                "status": "already_registered",
                "registered": False,
                "message": "Bu email oldin ro'yxatdan o'tgan.",
            }

        if not payload.email_verified:
            return {
                "status": "email_not_verified",
                "registered": False,
                "message": "Email manzil tasdiqlanmagan.",
            }

    registered_users[contact] = {
        "full_name": payload.full_name,
        "method": payload.method,
        "phone": normalize_phone_contact(payload.phone),
        "email": normalize_contact(payload.email),
        "city": "Nukus",
        "password": hash_password(payload.password),
        "created_at": datetime.utcnow().isoformat(),
    }
    mark_user_online(contact)
    save_users()

    return {
        "status": "registered",
        "registered": True,
        "message": "Siz muvaffaqiyatli ro'yxatdan o'tdingiz.",
        "user": public_user(contact, registered_users[contact]),
    }


@app.post("/api/auth/login", response_model=LoginResponse)
def login_user(payload: LoginRequest):
    contact = get_contact_from_payload(
        payload.method,
        payload.phone,
        payload.email,
    )

    saved_contact = find_user_contact(payload.method, contact)

    if not contact or not saved_contact:
        return {
            "status": "not_registered",
            "logged_in": False,
            "message": "Bunday foydalanuvchi ro'yxatdan o'tmagan.",
            "user": None,
        }

    user = registered_users[saved_contact]

    if not password_matches(user.get("password"), payload.password):
        contact_label = (
            "telefon raqam"
            if payload.method == "phone"
            else "email"
        )

        return {
            "status": "invalid_credentials",
            "logged_in": False,
            "message": f"Bu {contact_label} oldin ro'yxatdan o'tgan, lekin parol noto'g'ri.",
            "user": None,
        }

    mark_user_online(saved_contact)

    return {
        "status": "logged_in",
        "logged_in": True,
        "message": "Tizimga muvaffaqiyatli kirdingiz.",
        "user": {
            **public_user(contact, user),
            **public_user(saved_contact, user),
        },
    }


@app.get("/api/auth/stats", response_model=AuthStatsResponse)
def get_auth_stats():
    return {
        "registered_users": len(registered_users),
        "online_users": count_online_users(),
        "message": "Foydalanuvchilar statistikasi saqlangan profil ma'lumotlari asosida hisoblandi.",
    }


@app.post("/api/auth/online", response_model=OnlineHeartbeatResponse)
def update_online_status(payload: OnlineHeartbeatRequest):
    contact = normalize_contact(payload.contact)

    saved_contact = find_any_user_contact(contact)

    if not contact or not saved_contact:
        return {
            "status": "not_registered",
            "online_users": count_online_users(),
            "message": "Online holat uchun ro'yxatdan o'tgan foydalanuvchi topilmadi.",
        }

    mark_user_online(saved_contact)

    return {
        "status": "online",
        "online_users": count_online_users(),
        "message": "Foydalanuvchi online holatda.",
    }


@app.get("/api/debug/sms-events")
def get_sms_events():
    return {
        "events": sms_events[-10:],
    }


@app.get("/api/debug/email-events")
def get_email_events():
    return {
        "events": email_events[-10:],
    }


@app.post("/api/auth/password-reset/send-code", response_model=PasswordResetCodeResponse)
def send_password_reset_code(payload: PasswordResetCodeRequest):
    contact = get_contact_from_payload(
        payload.method,
        payload.phone,
        payload.email,
    )
    saved_contact = find_user_contact(payload.method, contact)

    if not contact or not saved_contact:
        return {
            "status": "not_registered",
            "code_ready": False,
            "message": "Bu telefon raqam yoki email ro'yxatdan o'tmagan.",
            "expires_in_seconds": 0,
            "demo_code": None,
        }

    code = str(secrets.randbelow(900000) + 100000)
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    password_reset_store[saved_contact] = {
        "code": code,
        "expires_at": expires_at,
        "verified": False,
    }

    if payload.method == "phone":
        sent, message = send_real_sms(
            contact,
            f"GeoAI parolni tiklash kodi: {code}. Kod 5 daqiqa amal qiladi.",
        )
    else:
        sent, message = send_real_email(
            contact,
            "GeoAI parolni tiklash kodi",
            f"GeoAI platformasi uchun parolni tiklash kodingiz: {code}\n\nKod 5 daqiqa amal qiladi.",
        )

    if not sent:
        password_reset_store.pop(saved_contact, None)
        return {
            "status": "provider_not_ready",
            "code_ready": False,
            "message": message,
            "expires_in_seconds": 0,
            "demo_code": None,
        }

    return {
        "status": "sent",
        "code_ready": True,
        "message": message,
        "expires_in_seconds": 300,
        "demo_code": None,
    }


@app.post("/api/auth/password-reset/verify-code", response_model=PasswordResetVerifyResponse)
def verify_password_reset_code(payload: PasswordResetVerifyRequest):
    contact = get_contact_from_payload(
        payload.method,
        payload.phone,
        payload.email,
    )
    saved_contact = find_user_contact(payload.method, contact)
    reset_record = password_reset_store.get(saved_contact)

    if not reset_record:
        return {
            "status": "not_found",
            "verified": False,
            "message": "Aktiv tiklash kodi topilmadi.",
        }

    if datetime.utcnow() > reset_record["expires_at"]:
        password_reset_store.pop(saved_contact, None)
        return {
            "status": "expired",
            "verified": False,
            "message": "Tiklash kodi muddati tugagan.",
        }

    if payload.code != reset_record["code"]:
        return {
            "status": "invalid",
            "verified": False,
            "message": "Tiklash kodi noto'g'ri.",
        }

    reset_record["verified"] = True

    return {
        "status": "verified",
        "verified": True,
        "message": "Kod tasdiqlandi. Endi yangi parol o'rnating.",
    }


@app.post("/api/auth/password-reset/confirm", response_model=PasswordResetConfirmResponse)
def confirm_password_reset(payload: PasswordResetConfirmRequest):
    contact = get_contact_from_payload(
        payload.method,
        payload.phone,
        payload.email,
    )
    saved_contact = find_user_contact(payload.method, contact)
    reset_record = password_reset_store.get(saved_contact)

    if not contact or not saved_contact:
        return {
            "status": "not_registered",
            "updated": False,
            "message": "Bu foydalanuvchi ro'yxatdan o'tmagan.",
        }

    if not reset_record or not reset_record.get("verified"):
        return {
            "status": "not_verified",
            "updated": False,
            "message": "Avval tiklash kodini tasdiqlang.",
        }

    registered_users[saved_contact]["password"] = hash_password(payload.new_password)
    password_reset_store.pop(saved_contact, None)
    save_users()

    return {
        "status": "updated",
        "updated": True,
        "message": "Yangi parol muvaffaqiyatli o'rnatildi.",
    }


@app.get("/api/profile/{contact}", response_model=ProfileResponse)
def get_profile(contact: str):
    normalized_contact = normalize_contact(contact)
    user = registered_users.get(normalized_contact)

    if not user:
        return {
            "status": "not_registered",
            "profile": None,
            "message": "Profil topilmadi. Avval ro'yxatdan o'ting yoki tizimga kiring.",
        }

    return {
        "status": "found",
        "profile": public_user(normalized_contact, user),
        "message": "Profil ma'lumotlari yuklandi.",
    }


@app.put("/api/profile", response_model=ProfileResponse)
def update_profile(payload: ProfileUpdateRequest):
    contact = normalize_contact(payload.contact)
    user = registered_users.get(contact)

    if not user:
        return {
            "status": "not_registered",
            "profile": None,
            "message": "Profil topilmadi.",
        }

    if payload.full_name:
        user["full_name"] = payload.full_name
    if payload.email:
        user["email"] = normalize_contact(payload.email)
    if payload.phone:
        user["phone"] = normalize_phone_contact(payload.phone)
    if payload.city:
        user["city"] = payload.city

    save_users()

    return {
        "status": "updated",
        "profile": public_user(contact, user),
        "message": "Profil ma'lumotlari saqlandi.",
    }


@app.put("/api/profile/avatar", response_model=ProfileResponse)
def update_profile_avatar(payload: AvatarUpdateRequest):
    contact = normalize_contact(payload.contact)
    user = registered_users.get(contact)

    if not user:
        return {
            "status": "not_registered",
            "profile": None,
            "message": "Profil topilmadi.",
        }

    if not payload.avatar_data_url.startswith("data:image/"):
        return {
            "status": "invalid_image",
            "profile": public_user(contact, user),
            "message": "Faqat rasm faylini yuklash mumkin.",
        }

    user["avatar_data_url"] = payload.avatar_data_url
    save_users()

    return {
        "status": "updated",
        "profile": public_user(contact, user),
        "message": "Profil rasmi yangilandi.",
    }
