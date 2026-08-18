import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Mail, Smartphone, CheckCircle2 } from "lucide-react";
import "./loginPage.css";
import "./forgotPassword.css";

type Step = "request" | "reset" | "done";

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("request");
  const [channel, setChannel] = useState<"email" | "mobile">("email");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, channel }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setInfo(data.message);
        setStep("reset");
      } else {
        setError(data.message || "Failed to send verification code.");
      }
    } catch (err) {
      console.error("Request OTP error:", err);
      setError("Cannot connect to the server. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setInfo("");
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, channel }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setInfo("A new code has been sent.");
      } else {
        setError(data.message || "Failed to resend the code.");
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      setError("Cannot connect to the server. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, channel, otp, newPassword }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setStep("done");
      } else {
        setError(data.message || "Failed to reset password.");
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setError("Cannot connect to the server. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-banner">
        <h1 className="banner-text">
          Forgot your
          <br />
          password?
        </h1>
      </div>

      <div className="login-form-section">
        <div className="form-wrapper">
          {step === "done" ? (
            <div className="fp-success-state">
              <CheckCircle2 size={48} color="#0D47A1" />
              <h2 className="title">Password reset!</h2>
              <p className="subtitle">
                Your password has been changed successfully. You can now log in.
              </p>
              <button className="login-button" onClick={() => navigate("/login")}>
                Back to Login
              </button>
            </div>
          ) : (
            <>
              <div className="form-header">
                <h2 className="title">Reset your password</h2>
                <p className="subtitle">
                  {step === "request"
                    ? "Tell us how to reach you and we'll send a verification code."
                    : `Enter the code sent to your ${
                        channel === "email" ? "email" : "mobile number"
                      } and choose a new password.`}
                </p>
              </div>

              {error && <div className="error-message">{error}</div>}
              {info && !error && <div className="fp-info-message">{info}</div>}

              {step === "request" ? (
                <form onSubmit={handleRequestOtp} className="login-form">
                  <div className="fp-channel-toggle">
                    <button
                      type="button"
                      className={`fp-channel-btn ${channel === "email" ? "active" : ""}`}
                      onClick={() => setChannel("email")}
                    >
                      <Mail size={16} /> Email
                    </button>
                    <button
                      type="button"
                      className={`fp-channel-btn ${channel === "mobile" ? "active" : ""}`}
                      onClick={() => setChannel("mobile")}
                    >
                      <Smartphone size={16} /> Mobile
                    </button>
                  </div>

                  <div className="input-group">
                    <label htmlFor="identifier">
                      {channel === "email" ? "Email Address" : "Mobile Number"}
                    </label>
                    <input
                      type={channel === "email" ? "email" : "tel"}
                      id="identifier"
                      placeholder={channel === "email" ? "you@example.com" : "07XXXXXXXX"}
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="login-button" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Verification Code"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleReset} className="login-form">
                  <div className="input-group">
                    <label htmlFor="otp">Verification Code</label>
                    <input
                      type="text"
                      id="otp"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      className="fp-otp-input"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="newPassword">New Password</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="newPassword"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="login-button" disabled={isLoading}>
                    {isLoading ? "Resetting..." : "Reset Password"}
                  </button>

                  <div className="fp-resend-row">
                    <button
                      type="button"
                      className="fp-resend-link"
                      onClick={handleResendOtp}
                      disabled={isLoading}
                    >
                      Resend code
                    </button>
                    <button
                      type="button"
                      className="fp-resend-link"
                      onClick={() => {
                        setStep("request");
                        setOtp("");
                        setError("");
                        setInfo("");
                      }}
                    >
                      Change {channel === "email" ? "email" : "mobile number"}
                    </button>
                  </div>
                </form>
              )}

              <p className="signup-prompt">
                Remembered your password?{" "}
                <Link to="/login" className="signup-link">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
