import React, { useState } from "react";
import styles from "./Login.module.css";

import LoginBackground from "./LoginBackground";

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const loginResponse = await fetch(
        "https://bot.kediritechnopark.com/webhook/login/estetika-dev",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const loginDataRaw = await loginResponse.json();
      const loginData = Array.isArray(loginDataRaw)
        ? loginDataRaw[0]
        : loginDataRaw;

      if (loginData?.success && loginData?.token) {
        localStorage.setItem("token", loginData.token);
        window.location.href = "/dashboard";
      } else {
        setError(loginData?.message || "Username atau password salah");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Gagal terhubung ke server");
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <LoginBackground />

        <img src="/dentalLogin.jpg" alt="Logo" className={styles.logo} />
        <h1 className={styles.h1}>Estetika Dental AI Admin Login</h1>
        <p className={styles.subtitle}>
          Silakan masuk untuk melanjutkan ke dashboard
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            className={styles.input}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className={styles.input}
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.button}>
            Login
          </button>
        </form>
        <div className={styles.footer}>&copy; 2025 Estetika Dental</div>
      </div>
    </div>
  );
};

export default Login;
