import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import "./loginPage.css";

interface LoginProps {
  onSubmit?: () => Promise<void>;
  onGoogleSignIn?: () => Promise<void>;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
}

const Login: React.FC<LoginProps> = ({
  onSubmit,
  onGoogleSignIn,
  onForgotPassword,
  onSignUp,
}) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (onSubmit) {
        await onSubmit();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleClick = async (): Promise<void> => {
    try {
      if (onGoogleSignIn) {
        await onGoogleSignIn();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  };

  const handleForgotPasswordClick = (): void => {
    if (onForgotPassword) {
      onForgotPassword();
    }
  };

  const handleSignUpClick = (): void => {
    if (onSignUp) {
      onSignUp();
    }
  };

  return (
    <div className="login-container">
      {/* Left Side - Blue Section */}
      <div className="login-left-section">
        <div className="login-tagline-wrapper">
          <h1 className="login-tagline">Your safe space is just a tap away</h1>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="login-right-section">
        <div className="login-form-wrapper">
          {/* Header */}
          <div className="login-header">
            <h2 className="login-title">Welcome back</h2>
            <p className="login-subtitle">
              Log in to your account and we will get you in to see our doctors
            </p>
          </div>

          {/* Error Message */}
          {error && <div className="login-error-message">{error}</div>}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="login-form">
            {/* Email Input */}
            <div className="login-form-group">
              <label htmlFor="email" className="login-label">
                Email Address
              </label>
              <div className="login-input-wrapper">
                <input
                  id="email"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="login-input"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="login-form-group">
              <label htmlFor="password" className="login-label">
                Password
              </label>
              <div className="login-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="login-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="login-password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="login-form-footer">
              <label htmlFor="rememberMe" className="login-checkbox-label">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                  className="login-checkbox"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPasswordClick}
                disabled={isLoading}
                className="login-forgot-password-btn"
              >
                Forgot Password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="login-submit-btn"
            >
              {isLoading ? (
                <>
                  <div className="login-spinner"></div>
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Log in</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="login-divider">
            <span>or</span>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={isLoading}
            className="login-google-btn"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span>Continue with google</span>
          </button>

          {/* Sign Up Link */}
          <p className="login-signup-text">
            Do Not Have Account?{" "}
            <button
              type="button"
              onClick={handleSignUpClick}
              className="login-signup-btn"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
