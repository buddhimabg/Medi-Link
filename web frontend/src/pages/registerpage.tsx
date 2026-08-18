import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./RegisterPage.css";
import { useGoogleLogin } from "@react-oauth/google";
import { Eye, EyeOff, ChevronDown } from "lucide-react";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    gender: "",
    city: "",
    dob: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    mobile?: string;
    confirmPassword?: string;
  }>({});

  const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  // Sri Lankan mobile numbers: 07XXXXXXXX, +947XXXXXXXX, or 947XXXXXXXX
  const MOBILE_REGEX = /^(?:\+?94|0)7\d{8}$/;

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) return "Email address is required.";
    if (!EMAIL_REGEX.test(value.trim())) return "Please enter a valid email address.";
    return undefined;
  };

  const validateMobile = (value: string): string | undefined => {
    const cleaned = value.trim().replace(/[\s-]/g, "");
    if (!cleaned) return "Mobile number is required.";
    if (!MOBILE_REGEX.test(cleaned)) {
      return "Enter a valid Sri Lankan mobile number (e.g. 07XXXXXXXX or +947XXXXXXXX).";
    }
    return undefined;
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
    if (!confirmPassword) return "Please confirm your password.";
    if (password !== confirmPassword) return "Password not matching.";
    return undefined;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);

    // Re-check the match live once both password fields have been touched,
    // so correcting a typo clears the error immediately instead of only on blur.
    if ((name === "password" || name === "confirmPassword") && updated.confirmPassword) {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: validateConfirmPassword(updated.password, updated.confirmPassword),
      }));
    }

    // Once the email field has an error showing, re-validate live so it
    // clears the moment the address becomes valid instead of waiting for blur.
    if (name === "email" && fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "email") {
      setFieldErrors((prev) => ({ ...prev, email: validateEmail(value) }));
    } else if (name === "mobile") {
      setFieldErrors((prev) => ({ ...prev, mobile: validateMobile(value) }));
    } else if (name === "confirmPassword") {
      setFieldErrors((prev) => ({
        ...prev,
        confirmPassword: validateConfirmPassword(formData.password, value),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailError = validateEmail(formData.email);
    const mobileError = validateMobile(formData.mobile);
    const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
    if (emailError || mobileError || confirmPasswordError) {
      setFieldErrors({ email: emailError, mobile: mobileError, confirmPassword: confirmPasswordError });
      setError(confirmPasswordError === "Password not matching." ? "Password not matching." : "Please fix the highlighted fields before continuing.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email.trim(),
          mobile: formData.mobile.trim().replace(/[\s-]/g, ""),
          password: formData.password,
          gender: formData.gender,
          city: formData.city,
          dob: formData.dob,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        navigate("/login");
      } else {
        setError(data.message || "Registration failed.");
      }
    } catch {
      setError(
        "Cannot connect to the server. Please ensure the backend is running."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Google Login Handler
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setError("");

      try {
        // Send the Google Access Token to your backend
        const response = await fetch("http://localhost:5000/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenResponse.access_token }),
        });

        const data = await response.json();

        if (response.ok) {
          navigate("/login");
        } else {
          setError(data.message || "Google authentication failed.");
        }
      } catch (err) {
        console.error("Google Login Error:", err);
        setError("Cannot connect to server for Google Login.");
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      setError("Google Login was closed or failed.");
    },
  });

  return (
    <div className="register-container">
      <div className="register-banner">
        <h1 className="register-quote">
          Your privacy is our
          <br />
          priority. Create your
          <br />
          secure health portal
          <br />
          now
        </h1>
      </div>

      <div className="register-form-section">
        <div className="register-form-wrapper">
          <h2 className="register-title">Create an Account</h2>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="register-form" noValidate>
            <div className="input-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                placeholder="Full name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="email">E-mail</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                className={fieldErrors.email ? "input-invalid" : ""}
                required
              />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>

            <div className="form-row-2">
              <div className="input-group">
                <label htmlFor="gender">Gender</label>
                <div className="select-wrapper">
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="modern-select"
                    required
                  >
                    <option value="" disabled>
                      Gender
                    </option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown size={18} className="select-chevron" />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="city">City</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  placeholder="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="input-group">
                <label htmlFor="dob">Date of Birth</label>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-group">
                <label htmlFor="mobile">Mobile Number</label>
                <input
                  type="tel"
                  id="mobile"
                  name="mobile"
                  placeholder="07X XXX XXXX"
                  value={formData.mobile}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={fieldErrors.mobile ? "input-invalid" : ""}
                  required
                />
                {fieldErrors.mobile && <span className="field-error">{fieldErrors.mobile}</span>}
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={fieldErrors.confirmPassword ? "input-invalid" : ""}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <span className="field-error">{fieldErrors.confirmPassword}</span>
              )}
            </div>

            <button
              type="submit"
              className="signup-button"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          <div className="divider-container">
            <span className="divider-line"></span>
            <span className="divider-text">or</span>
            <span className="divider-line"></span>
          </div>

          <button
            type="button"
            className="google-auth-button"
            onClick={() => handleGoogleLogin()}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path
                  fill="#4285F4"
                  d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"
                />
                <path
                  fill="#34A853"
                  d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"
                />
                <path
                  fill="#FBBC05"
                  d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"
                />
                <path
                  fill="#EA4335"
                  d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"
                />
              </g>
            </svg>
            Continue with Google
          </button>

          <p className="login-prompt">
            I have an Account?{" "}
            <Link to="/login" className="login-link">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
