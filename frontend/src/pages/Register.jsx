import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Mail,
  Phone,
  ShieldCheck,
  UserPlus
} from "lucide-react";

import {
  registerUser,
  sendEmailVerificationCode,
  sendPhoneVerificationCode,
  verifyEmailCode,
  verifyPhoneCode
} from "../services/api";

import "./Auth.css";

function Register() {
  const navigate = useNavigate();
  const [method, setMethod] =
    useState("email");
  const [fullName, setFullName] =
    useState("");
  const [phone, setPhone] =
    useState("");
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);
  const [code, setCode] =
    useState("");
  const [phoneVerified, setPhoneVerified] =
    useState(false);
  const [emailVerified, setEmailVerified] =
    useState(false);
  const [codeSent, setCodeSent] =
    useState(false);
  const [loading, setLoading] =
    useState(false);
  const [toast, setToast] =
    useState(null);

  const registerButtonLabel = (() => {
    if (loading)
      return "Tekshirilmoqda...";

    if (method === "phone" && !codeSent && !phoneVerified)
      return "SMS kod yuborish";

    if (method === "email" && !codeSent && !emailVerified)
      return "Email kod yuborish";

    return "Ro'yxatdan o'tish";
  })();

  function showToast(type, message) {
    setToast({
      type,
      message
    });

    window.setTimeout(
      () => setToast(null),
      4200
    );
  }

  function changeMethod(nextMethod) {
    setMethod(nextMethod);
    setCode("");
    setCodeSent(false);
    setPhoneVerified(false);
    setEmailVerified(false);
  }

  function validatePasswords() {
    if (password.length < 6) {
      showToast("error", "Parol kamida 6 ta belgidan iborat bo'lishi kerak.");
      return false;
    }

    if (password !== confirmPassword) {
      showToast("error", "Parollar bir xil emas.");
      return false;
    }

    return true;
  }

  async function handleSendCode() {
    if (!phone.trim()) {
      showToast("error", "Telefon raqamni kiriting.");
      return;
    }

    try {
      setLoading(true);
      const response =
        await sendPhoneVerificationCode(phone);

      if (response.status === "already_registered") {
        showToast("error", "Bu raqam oldin ro'yxatdan o'tgan.");
        return;
      }

      if (!response.sms_ready) {
        showToast("error", response.message || "SMS yuborilmadi.");
        return;
      }

      setCodeSent(true);
      showToast("success", response.message || "Bir martalik SMS kod yuborildi.");
    } catch (error) {
      console.error(error);
      showToast("error", "Serverda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    try {
      setLoading(true);
      const response = method === "phone"
        ? await verifyPhoneCode({
          phone,
          code
        })
        : await verifyEmailCode({
          email,
          code
        });

      if (!response.verified) {
        showToast("error", response.message);
        return;
      }

      if (method === "phone")
        setPhoneVerified(true);
      else
        setEmailVerified(true);

      await completeRegistration({
        isPhoneVerified: method === "phone" ? true : phoneVerified,
        isEmailVerified: method === "email" ? true : emailVerified
      });
    } catch (error) {
      console.error(error);
      showToast("error", "Serverda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  }

  async function completeRegistration({
    isPhoneVerified = phoneVerified,
    isEmailVerified = emailVerified
  } = {}) {
    const response =
      await registerUser({
        fullName,
        method,
        phone,
        email,
        password,
        phoneVerified: isPhoneVerified,
        emailVerified: isEmailVerified
      });

    if (response.status === "already_registered") {
      showToast("error", response.message);
      return;
    }

    if (!response.registered) {
      showToast("error", response.message);
      return;
    }

    window.localStorage.setItem(
      "geoai_user",
      JSON.stringify(response.user)
    );
    showToast("success", "Siz muvaffaqiyatli ro'yxatdan o'tdingiz.");
    window.setTimeout(
      () => navigate("/profile"),
      800
    );
  }

  async function handleRegister() {
    if (!fullName.trim()) {
      showToast("error", "Ismingizni kiriting.");
      return;
    }

    if (!validatePasswords())
      return;

    if (method === "phone") {
      if (!phone.trim()) {
        showToast("error", "Telefon raqamni kiriting.");
        return;
      }

      if (!codeSent && !phoneVerified) {
        await handleSendCode();
        return;
      }

      if (codeSent && !phoneVerified) {
        showToast("error", "SMS kodni kiriting va Tasdiqlash tugmasini bosing.");
        return;
      }
    }

    if (method === "email") {
      if (!email.trim()) {
        showToast("error", "Email manzilni kiriting.");
        return;
      }

      if (!codeSent && !emailVerified) {
        try {
          setLoading(true);
          const response =
            await sendEmailVerificationCode(email);

          if (response.status === "already_registered") {
            showToast("error", response.message);
            return;
          }

          if (!response.email_ready) {
            showToast("error", response.message || "Email kodi yuborilmadi.");
            return;
          }

          setCodeSent(true);
          showToast("success", response.message || "Bir martalik email kodi yuborildi.");
        } catch (error) {
          console.error(error);
          showToast("error", "Serverda xatolik yuz berdi.");
        } finally {
          setLoading(false);
        }

        return;
      }

      if (codeSent && !emailVerified) {
        showToast("error", "Email kodni kiriting va Tasdiqlash tugmasini bosing.");
        return;
      }
    }

    try {
      setLoading(true);
      await completeRegistration();
    } catch (error) {
      console.error(error);
      showToast("error", "Serverda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      {toast && (
        <div className={`auth-toast ${toast.type}`}>
          {toast.type === "success" ? (
            <CheckCircle2 size={22} />
          ) : (
            <AlertTriangle size={22} />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <section className="auth-panel">
        <div className="auth-icon">
          <UserPlus size={30} />
        </div>

        <h1>Ro'yxatdan o'tish</h1>
        <p>
          SMS ogohlantirishlar va shaxsiy geoma'lumot monitoringi uchun hisob yarating.
        </p>

        <div className="auth-segmented">
          <button
            type="button"
            className={method === "phone" ? "active" : ""}
            onClick={() => changeMethod("phone")}
          >
            <Phone size={17} />
            Telefon
          </button>
          <button
            type="button"
            className={method === "email" ? "active" : ""}
            onClick={() => changeMethod("email")}
          >
            <Mail size={17} />
            Email
          </button>
        </div>

        <form className="auth-form">
          <label>
            Ism
            <div className="auth-input">
              <UserPlus size={18} />
              <input
                type="text"
                placeholder="Ismingiz"
                value={fullName}
                onChange={(event) =>
                  setFullName(event.target.value)
                }
              />
            </div>
          </label>

          {method === "phone" ? (
            <div className="auth-verification-block">
              <label>
                Telefon raqam
                <div className="auth-input">
                  <Phone size={18} />
                  <input
                    type="tel"
                    placeholder="+998 90 123 45 67"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setPhoneVerified(false);
                      setCodeSent(false);
                    }}
                  />
                </div>
              </label>

              {codeSent && !phoneVerified && (
                <div className="auth-code-row">
                  <div className="auth-input">
                    <ShieldCheck size={18} />
                    <input
                      inputMode="numeric"
                      placeholder="Bir martalik kod"
                      value={code}
                      onChange={(event) =>
                        setCode(event.target.value)
                      }
                    />
                  </div>
                  <button
                    type="button"
                    disabled={loading || code.length < 4}
                    onClick={handleVerifyCode}
                  >
                    Tasdiqlash
                  </button>
                </div>
              )}

            </div>
          ) : (
            <label>
              Email
              <div className="auth-input">
                <Mail size={18} />
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailVerified(false);
                    setCodeSent(false);
                  }}
                />
              </div>
            </label>
          )}

          {method === "email" && codeSent && !emailVerified && (
            <div className="auth-verification-block">
              <div className="auth-code-row">
                <div className="auth-input">
                  <ShieldCheck size={18} />
                  <input
                    inputMode="numeric"
                    placeholder="Email tasdiqlash kodi"
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value)
                    }
                  />
                </div>
                <button
                  type="button"
                  disabled={loading || code.length < 4}
                  onClick={handleVerifyCode}
                >
                  Tasdiqlash
                </button>
              </div>

            </div>
          )}

          <label>
            Parol
            <div className="auth-input">
              <ShieldCheck size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Kuchli parol"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
              />
              <button
                type="button"
                className="auth-password-toggle"
                aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                onClick={() =>
                  setShowPassword((current) => !current)
                }
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label>
            Parolni takrorlang
            <div className="auth-input">
              <ShieldCheck size={18} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Parolni qayta kiriting"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
              />
              <button
                type="button"
                className="auth-password-toggle"
                aria-label={showConfirmPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                onClick={() =>
                  setShowConfirmPassword((current) => !current)
                }
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button
            type="button"
            disabled={loading}
            onClick={handleRegister}
          >
            <UserPlus size={18} />
            {registerButtonLabel}
          </button>
        </form>
      </section>
    </div>
  );
}

export default Register;
