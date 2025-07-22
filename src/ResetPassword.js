import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // ⬅️ Tambahkan ini
import styles from "./Login.module.css";

const ResetPassword = () => {
  const navigate = useNavigate(); // ⬅️ Gunakan ini untuk navigasi
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Anda belum login. Silakan login terlebih dahulu.");
      return;
    }

    try {
      const response = await fetch(
        "https://auto.apps.kediritechnopark.com/webhook/profile-estetika-dev/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            password: formData.oldPassword,
            newPassword: formData.newPassword,
          }),
        }
      );

      const data = await response.json();
      if (data?.success) {
        setSuccess("Password berhasil diubah");
        setFormData({ oldPassword: "", newPassword: "" });
      } else {
        setError(data?.message || "Gagal mereset password");
      }
    } catch (err) {
      console.error("Reset Error:", err);
      setError("Gagal terhubung ke server");
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <img src="/dermalounge.jpg" alt="Logo" className={styles.logo} />
        <h1 className={styles.h1}>Ganti Password</h1>
        <p className={styles.subtitle}>Masukkan password lama dan yang baru</p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="password"
            name="oldPassword"
            placeholder="Password Lama"
            value={formData.oldPassword}
            onChange={handleChange}
            className={styles.input}
          />
          <input
            type="password"
            name="newPassword"
            placeholder="Password Baru"
            value={formData.newPassword}
            onChange={handleChange}
            className={styles.input}
          />
          {error && <p className={styles.error}>{error}</p>}
          {success && (
            <p style={{ color: "green", marginBottom: "10px" }}>{success}</p>
          )}
          <button type="submit" className={styles.button}>
            Simpan Password Baru
          </button>
        </form>

        {/* Tombol kembali */}
        <button
          onClick={() => navigate("/dashboard")}
          className={styles.button}
          style={{ marginTop: "12px", backgroundColor: "#777" }}
        >
          Kembali ke Dashboard
        </button>

        <div className={styles.footer}>
          &copy; 2025 Kloowear AI - Admin Panel
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
