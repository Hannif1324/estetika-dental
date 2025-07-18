import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ProfileTab.module.css";

const ProfileTab = () => {
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profile, setProfile] = useState({});
  const [profileTemp, setProfileTemp] = useState({});

  const licenses = [
    {
      id: 1,
      type: "Current Subscription",
      number: "DRML-2025-AI001",
      validUntil: "June 30 2025",
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigator.serviceWorker.ready.then(function (registration) {
      registration.pushManager.getSubscription().then(function (subscription) {
        console.log(subscription);
        if (subscription) {
          subscription.unsubscribe();
        }
      });
    });

    window.location.reload();
  };

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");

      try {
        const response = await fetch(
          "https://bot.kediritechnopark.com/webhook/estetika-dev/dashboard",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 401 || response.status === 403) {
          handleLogout();
          return;
        }

        if (!response.ok) {
          throw new Error("Fetch gagal dengan status: " + response.status);
        }

        const data = await response.json();
        setProfile(data.profile_data);
        setProfileTemp(data.profile_data);
      } catch (error) {
        console.error("Fetch error:", error);

        navigator.serviceWorker.ready.then(function (registration) {
          registration.pushManager
            .getSubscription()
            .then(function (subscription) {
              console.log(subscription);
              if (subscription) {
                subscription.unsubscribe();
              }
            });
        });
        navigate("/login");
      }
    };

    fetchData();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");

      if (profile.newPassword == "" || profile.oldPassword == "") {
        alert("Password dan konfirmasi tidak boleh kosong.");
        return;
      }

      const payload = { ...profile };
      if (!payload.newPassword) {
        delete payload.newPassword;
        delete payload.oldPassword;
      }

      const response = await fetch(
        "https://bot.kediritechnopark.com/webhook/profile/estetika-dev",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) throw new Error("Gagal menyimpan profil");

      const result = await response.json();

      setIsEditing(false);
      alert("Profile saved!");
    } catch (error) {
      console.error("Error saat menyimpan profil:", error);
      alert("Terjadi kesalahan saat menyimpan profil.");
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.dashboardHeader}>
        <div className={styles.dropdownContainer} ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={styles.dropdownToggle}
          >
            ☰ Menu
          </button>

          {isMenuOpen && (
            <div className={styles.dropdownMenu}>
              <button
                onClick={() => navigate("/dashboard")}
                className={styles.dropdownItem}
              >
                Dashboard
              </button>
              <button onClick={handleLogout} className={styles.dropdownItem}>
                Logout
              </button>
            </div>
          )}
        </div>
        <img src={profile?.image || "dental1.jpg"} alt="Bot Avatar" />
        <div>
          <h1 className={styles.h1}>Estetika Dental AI Admin Profile</h1>
        </div>
      </div>

      <div className={styles.profileSection}>
        <div className={styles.profileDetails}>
          {["name", "company", "address", "email", "phone"].map((field) => (
            <div key={field} className={styles.profileInputGroup}>
              <label>
                <strong>
                  {field === "phone"
                    ? "No. Telp"
                    : field.charAt(0).toUpperCase() + field.slice(1)}
                  :
                </strong>
              </label>
              <input
                type="text"
                name={field}
                value={profile && profile[field] != null ? profile[field] : ""}
                onChange={handleChange}
                className={`${styles.editableInput} ${
                  !isEditing ? styles.readOnly : ""
                }`}
                readOnly={!isEditing}
              />
            </div>
          ))}

          {isEditing && (
            <>
              <div className={styles.profileInputGroup}>
                <label>
                  <strong>Old Password:</strong>
                </label>
                <input
                  type="password"
                  name="oldPassword"
                  onChange={handleChange}
                  className={styles.editableInput}
                />
              </div>
              <div className={styles.profileInputGroup}>
                <label>
                  <strong>New Password:</strong>
                </label>
                <input
                  type="password"
                  name="newPassword"
                  onChange={handleChange}
                  className={styles.editableInput}
                />
              </div>
            </>
          )}

          {!isEditing && (
            <div
              className={styles.licenseCard}
              style={{ marginTop: "20px", padding: "10px 16px" }}
              onClick={() => setIsEditing(true)}
            >
              Edit
            </div>
          )}
          {isEditing && (
            <div style={{ marginTop: "20px", display: "flex", gap: "10px" }}>
              {/* <div className={styles.licenseCard} style={{ flex: 1, padding: '10px 16px' }} onClick={() => {
                                        setIsEditing(false);
                                        setProfile(profileTemp);
                                    }}>
                                Batal
                            </div> */}
              <div
                className={styles.licenseCard}
                style={{ flex: 1, padding: "10px 16px" }}
                onClick={handleSave}
              >
                Save
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.licenseSection}>
        <div className={styles.licenseCards}>
          {licenses.map((item) => (
            <div className={styles.licenseCard} key={item.id}>
              <p>
                <strong>{item.type}</strong>
              </p>
              <p>{item.number}</p>
              <p>
                <strong>Free License </strong>Valid until: {item.validUntil}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footer}>&copy; 2025 Kediri Technopark</div>
    </div>
  );
};

export default ProfileTab;
