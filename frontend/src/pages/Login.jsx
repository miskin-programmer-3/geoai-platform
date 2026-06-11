import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  LogIn,
  Mail,
  Phone,
  ShieldCheck
} from "lucide-react";

import {
  confirmPasswordReset,
  loginUser,
  sendPasswordResetCode,
  verifyPasswordResetCode
} from "../services/api";

import "./Auth.css";

function Login() {
  const navigate = useNavigate();
  const [method, setMethod] =
    useState("email");
  const [mode, setMode] =
    useState("login");
  const [contact, setContact] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [resetCode, setResetCode] =
    useState("");
  const [resetCodeSent, setResetCodeSent] =
    useState(false);
  const [resetVerified, setResetVerified] =
    useState(false);
  const [newPassword, setNewPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const [toast, setToast] =
    useState(null);

  const isPhone = method === "phone";

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
    setContact("");
    setPassword("");
    setResetCode("");
    setResetCodeSent(false);
    setResetVerified(false);
  }

  function contactPayload() {
    return {
      method,
      phone: isPhone ? contact : "",
      email: isPhone ? "" : contact
    };
  }

  async function handleLogin() {
    if (!contact.trim()) {
      showToast("error", isPhone ? "Telefon raqamni kiriting." : "Email manzilni kiriting.");
      return;
    }

    if (!password.trim()) {
      showToast("error", "Parolni kiriting.");
      return;
    }

    try {
      setLoading(true);
      const response =
        await loginUser({
          ...contactPayload(),
          password
        });

      if (!response.logged_in) {
        showToast("error", response.message);
        return;
      }

      window.localStorage.setItem(
        "geoai_user",
        JSON.stringify(response.user)
      );
      showToast("success", response.message);
      window.setTimeout(
        () => navigate("/profile"),
        700
      );
    } catch (error) {
      console.error(error);
      showToast("error", "Serverda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendResetCode() {
    if (!contact.trim()) {
      showToast("error", isPhone ? "Telefon raqamni kiriting." : "Email manzilni kiriting.");
      return;
    }

    try {
      setLoading(true);
      const response =
        await sendPasswordResetCode(contactPayload());

      if (!response.code_ready) {
        showToast("error", response.message);
        return;
      }

      setResetCodeSent(true);
      setResetVerified(false);
      showToast("success", response.message);
    } catch (error) {
      console.error(error);
      showToast("error", "Serverda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyResetCode() {
    try {
      setLoading(true);
      const response =
        await verifyPasswordResetCode({
          ...contactPayload(),
          code: resetCode
        });

      if (!response.verified) {
        showToast("error", response.message);
        return;
      }

      setResetVerified(true);
      showToast("success", response.message);
    } catch (error) {
      console.error(error);
      showToast("error", "Serverda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmReset() {
    if (newPassword.length < 6) {
      showToast("error", "Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("error", "Yangi parollar bir xil emas.");
      return;
    }

    try {
      setLoading(true);
      const response =
        await confirmPasswordReset({
          ...contactPayload(),
          newPassword
        });

      if (!response.updated) {
        showToast("error", response.message);
        return;
      }

      showToast("success", response.message);
      setMode("login");
      setPassword("");
      setResetCode("");
      setResetCodeSent(false);
      setResetVerified(false);
      setNewPassword("");
      setConfirmPassword("");
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
          {mode === "login" ? (
            <ShieldCheck size={30} />
          ) : (
            <KeyRound size={30} />
          )}
        </div>

        <h1>{mode === "login" ? "Tizimga kirish" : "Parolni tiklash"}</h1>
        <p>
          {mode === "login"
            ? "GeoAI platformasidagi monitoring va ogohlantirish xizmatlaridan foydalaning."
            : "Telefon raqam yoki email orqali tasdiqlash kodini oling va yangi parol o'rnating."}
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
            {isPhone ? "Telefon raqam" : "Email"}
            <div className="auth-input">
              {isPhone ? <Phone size={18} /> : <Mail size={18} />}
              <input
                type={isPhone ? "tel" : "email"}
                placeholder={isPhone ? "+998 90 123 45 67" : "email@example.com"}
                value={contact}
                onChange={(event) =>
                  setContact(event.target.value)
                }
              />
            </div>
          </label>

          {mode === "login" ? (
            <>
              <label>
                Parol
                <div className="auth-input">
                  <ShieldCheck size={18} />
                  <input
                    type="password"
                    placeholder="Parolingiz"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                  />
                </div>
              </label>

              <button
                type="button"
                disabled={loading}
                onClick={handleLogin}
              >
                <LogIn size={18} />
                {loading ? "Tekshirilmoqda..." : "Kirish"}
              </button>

              <button
                type="button"
                className="auth-link-button"
                onClick={() => {
                  setMode("reset");
                  setPassword("");
                  setResetCode("");
                  setResetCodeSent(false);
                  setResetVerified(false);
                }}
              >
                Parolni unutdingizmi?
              </button>
            </>
          ) : (
            <>
              {!resetCodeSent && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSendResetCode}
                >
                  <KeyRound size={18} />
                  {loading ? "Yuborilmoqda..." : "Tiklash kodini yuborish"}
                </button>
              )}

              {resetCodeSent && !resetVerified && (
                <div className="auth-verification-block">
                  <div className="auth-code-row">
                    <div className="auth-input">
                      <ShieldCheck size={18} />
                      <input
                        inputMode="numeric"
                        placeholder="Tasdiqlash kodi"
                        value={resetCode}
                        onChange={(event) =>
                          setResetCode(event.target.value)
                        }
                      />
                    </div>
                    <button
                      type="button"
                      disabled={loading || resetCode.length < 4}
                      onClick={handleVerifyResetCode}
                    >
                      Tasdiqlash
                    </button>
                  </div>

                </div>
              )}

              {resetVerified && (
                <>
                  <label>
                    Yangi parol
                    <div className="auth-input">
                      <ShieldCheck size={18} />
                      <input
                        type="password"
                        placeholder="Yangi parol"
                        value={newPassword}
                        onChange={(event) =>
                          setNewPassword(event.target.value)
                        }
                      />
                    </div>
                  </label>

                  <label>
                    Yangi parolni takrorlang
                    <div className="auth-input">
                      <ShieldCheck size={18} />
                      <input
                        type="password"
                        placeholder="Yangi parolni qayta kiriting"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                      />
                    </div>
                  </label>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleConfirmReset}
                  >
                    <KeyRound size={18} />
                    Yangi parolni saqlash
                  </button>
                </>
              )}

              <button
                type="button"
                className="auth-link-button"
                onClick={() => {
                  setMode("login");
                  setResetCode("");
                  setResetCodeSent(false);
                  setResetVerified(false);
                }}
              >
                Kirishga qaytish
              </button>
            </>
          )}
        </form>
      </section>
    </div>
  );
}

export default Login;
