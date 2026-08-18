import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff } from "lucide-react";
import "./loginPage.css";

const REMEMBER_EMAIL_KEY = "medilink_remembered_email";
const REMEMBER_PASSWORD_KEY = "medilink_remembered_password";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Shared by both the email/password and Google sign-in paths: stash the
// account and route by role the same way regardless of how they logged in.
const routeAfterLogin = (
  data: any,
  navigate: ReturnType<typeof useNavigate>
) => {
  localStorage.setItem("user", JSON.stringify(data));

  if (data.role === "doctor") {
    // Doctor portal (video calls, chatbot, journals) runs on its own
    // JWT-gated routes, so it needs its own localStorage keys set too.
    localStorage.setItem("medilink_token", data.token || "");
    localStorage.setItem("medilink_logged_in", "true");
    localStorage.setItem(
      "medilink_user_info",
      JSON.stringify({ id: data._id, name: data.name, role: data.role, email: data.email })
    );
    // Full navigation (not React Router's navigate) so App.tsx remounts
    // and picks up the freshly-written medilink_logged_in flag.
    window.location.href = "/video-call";
  } else if (data.role === "admin") {
    // Admin dashboard's own API layer (src/api/api.ts) reads this
    // specific key for its Authorization header on every request.
    localStorage.setItem("medilink_auth_token", data.token || "");
    window.location.href = "/admin-dashboard";
  } else {
    navigate("/dashboard");
  }
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Pre-fill from a previous "Remember me" login, if any.
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    const savedPassword = localStorage.getItem(REMEMBER_PASSWORD_KEY);
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_EMAIL_KEY, email);
          localStorage.setItem(REMEMBER_PASSWORD_KEY, password);
        } else {
          localStorage.removeItem(REMEMBER_EMAIL_KEY);
          localStorage.removeItem(REMEMBER_PASSWORD_KEY);
        }

        routeAfterLogin(data, navigate);
      } else {
        setError(
          data.message || "Login failed. Please check your credentials."
        );
      }
    } catch (err) {
      console.error("Login Error details:", err);
      setError("Cannot connect to the server. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError("");
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenResponse.access_token }),
        });

        const data = await response.json();

        if (response.ok) {
          routeAfterLogin(data, navigate);
        } else {
          setError(data.message || "Google authentication failed.");
        }
      } catch (err) {
        console.error("Google Login Error:", err);
        setError("Cannot connect to the server for Google login.");
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setError("Google login was closed or failed.");
    },
  });

  return (
    <div className="login-container">
      {/* Left Panel: Blue Gradient Banner */}
      <div className="login-banner">
        <h1 className="banner-text">
          Your safe space is just
          <br />a tap away
        </h1>
      </div>

      {/* Right Panel: Login Form */}
      <div className="login-form-section">
        <div className="form-wrapper">
          <div className="form-header">
            <h2 className="title">Welcome back</h2>
            <p className="subtitle">
              Log in to your account and we will get you in to see our doctors
            </p>
          </div>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="forgot-password">
                Forgot Password?
              </Link>
            </div>

            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log in"}
            </button>

            <div className="divider">
              <span>or</span>
            </div>

            <button
              type="button"
              className="google-button"
              onClick={() => handleGoogleLogin()}
              disabled={isLoading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                width="20px"
                height="20px"
              >
                <path
                  fill="#FFC107"
                  d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                />
              </svg>
              Continue with google
            </button>
          </form>

          <p className="signup-prompt">
            Do Not Have Account?{" "}
            <Link to="/register" className="signup-link">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
