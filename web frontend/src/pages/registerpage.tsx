import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./RegisterPage.css";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    gender: "",
    city: "",
    dob: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          password: formData.password,
          gender: formData.gender,
          city: formData.city,
          dob: formData.dob,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // SUCCESS: The backend saved the user. Go to login!
        navigate("/login");
      } else {
        // ERROR: Show the error from the backend (e.g. "Email already exists")
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

          {error && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                color: "#ef4444",
                padding: "10px",
                borderRadius: "8px",
                marginBottom: "15px",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="register-form">
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
                required
              />
            </div>

            <div className="form-row-2">
              <div className="input-group">
                <label htmlFor="gender">Gender</label>
                <input
                  type="text"
                  id="gender"
                  name="gender"
                  placeholder="Gender"
                  value={formData.gender}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="city">city</label>
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
                <label htmlFor="dob">date of birth</label>
                <input
                  type="text"
                  id="dob"
                  name="dob"
                  placeholder="YYYY/MM/DD"
                  value={formData.dob}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="input-group empty-group"></div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className="signup-button"
              disabled={isLoading}
            >
              {isLoading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

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
