import React, { useRef, useState, useEffect } from "react";
import styles from "./Dashboard.module.css";
import { useNavigate } from "react-router-dom";

import Modal from "./Modal";
import Conversations from "./Conversations";
import DiscussedTopics from "./DiscussedTopics";
import StatCard from "./StatCard";

import FollowUps from "./FollowUps";

import Chart from "chart.js/auto";
import NotificationPrompt from "./NotificationPrompt";

const Dashboard = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [discussedTopics, setDiscussedTopics] = useState([]);
  const [modalContent, setModalContent] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true); // ⬅️ Tambahkan state loading
  const [fileList, setFileList] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [updateDetected, setUpdateDetected] = useState([]);

  const [stats, setStats] = useState({
    totalChats: 0,
    botMessages: 0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const navigate = useNavigate();

  const handleFiles = async (files) => {
    const filteredFiles = [];

    for (const file of files) {
      const lowerName = file.name.toLowerCase();
      const nameWithoutExt = lowerName.replace(/\.[^/.]+$/, "");

      // 1️⃣ Cegah duplikat dari file yang sudah dipilih sebelumnya
      const alreadySelected = selectedFiles.some(
        (f) => f.name.toLowerCase() === file.name.toLowerCase()
      );
      if (alreadySelected) continue;

      // 2️⃣ Cek apakah ada file server dengan nama persis
      const exactMatch = fileList.find((f) => {
        const serverKey = f.json.Key;
        console.log(`Checking: "${serverKey}" === "${file.name}"`);
        return serverKey === file.name;
      });

      if (exactMatch) {
        const confirmOverwrite = window.confirm(
          `File "${file.name}" sudah ada di server sebagai "${exactMatch.json.Key}".\nIngin menimpa file tersebut?`
        );

        if (confirmOverwrite) {
          // Ganti nama agar ditimpa
          Object.defineProperty(file, "name", {
            writable: true,
            value: exactMatch.json.Key,
          });
          filteredFiles.push(file);
        } else {
          let counter = 1;
          const extMatch = file.name.match(/(\.[^/.]+)$/);
          const extension = extMatch ? extMatch[1] : "";
          const baseName = file.name.replace(/\.[^/.]+$/, "");

          let tryName = `${baseName} (${counter})${extension}`.trim();

          const existingNames = [
            ...fileList.map((f) => f.json.Key.toLowerCase()),
            ...selectedFiles.map((f) => f.name.toLowerCase()),
          ];

          while (existingNames.includes(tryName.toLowerCase())) {
            counter++;
            tryName = `${baseName} (${counter})${extension}`.trim();
          }

          Object.defineProperty(file, "name", {
            writable: true,
            value: tryName,
          });

          filteredFiles.push(file);
        }
        continue; // Lewati ke file berikutnya karena sudah ditangani
      }

      // 3️⃣ Jika tidak ada yang sama persis, cari yang mirip
      const similarFile = fileList.find((f) => {
        const serverName = f.json.Key.toLowerCase();
        const serverNameWithoutExt = serverName.replace(/\.[^/.]+$/, "");

        return (
          serverName.includes(lowerName) ||
          lowerName.includes(serverName) ||
          serverNameWithoutExt.includes(nameWithoutExt) ||
          nameWithoutExt.includes(serverNameWithoutExt)
        );
      });

      if (similarFile) {
        const confirmOverwrite = window.confirm(
          `File "${file.name}" mirip atau mengandung "${similarFile.json.Key}" di server.\nIngin menimpa file tersebut?`
        );

        if (confirmOverwrite) {
          Object.defineProperty(file, "name", {
            writable: true,
            value: similarFile.json.Key,
          });
          filteredFiles.push(file);
        } else {
          Object.defineProperty(file, "name", {
            writable: true,
            value: file.name.replace(/(\.[^/.]+)$/, " (1)$1"),
          });
          filteredFiles.push(file);
        }
      } else {
        filteredFiles.push(file);
      }
    }

    if (filteredFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...filteredFiles]);
    }
  };

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

  const menuRef = useRef(null);

  // Close dropdown if click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

        // if (!response.ok) {
        //   throw new Error('Fetch gagal dengan status: ' + response.status);
        // }

        const data = await response.json();
        console.log(data);
        setDiscussedTopics(data[0]?.graph[0]?.json?.result?.topics);
        setFollowUps(data[0]?.graph[0]?.json?.result?.interested_users);
        setFileList(data[0]?.files);
        setUpdateDetected(data[1]?.updateDetected);
        const graphObj = data[0]?.graph[0]?.json?.result?.graph;
        console.log(graphObj);
        const rawDataArray = Object.entries(graphObj).map(([hour, sesi]) => ({
          hour,
          sesi,
        }));
        setRawData(rawDataArray);
        let totalSessions = new Set();
        let botMessages = 0;

        rawDataArray.forEach(({ sesi }) => {
          Object.values(sesi).forEach((messages) => {
            messages.forEach((msg) => {
              totalSessions.add(msg.session_id);
              if (msg.message.type === "ai") botMessages++;
            });
          });
        });

        setStats({
          totalChats: totalSessions.size,
          botMessages,
        });

        setLoading(false); // ⬅️ Setelah berhasil, hilangkan loading
      } catch (error) {
        console.error("Error:", error);

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

    fetchData(); // Jalankan langsung saat komponen di-mount
    const interval = setInterval(fetchData, 60000); // Jalankan setiap 30 detik
    return () => clearInterval(interval); // Bersihkan interval saat komponen unmount
  }, [navigate]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          // Belum subscribe → tampilkan prompt
          setModalContent(
            <NotificationPrompt
              onAllow={subscribeUser}
              onDismiss={() => setModalContent("")}
            />
          );
        } else {
          // Sudah subscribe → tidak perlu panggil subscribeUser lagi
          console.log("User is already subscribed.");
          setModalContent("");
          subscribeUser();
        }
      });
    }
  }, []);

  const subscribeUser = async () => {
    setModalContent("");
    const registration = await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        "BPT-ypQB0Z7HndmeFhRR7AMjDujCLSbOQ21VoVHLQg9MOfWhEZ7SKH5cMjLqkXHl2sTuxdY2rjHDOAxhRK2G2K4"
      ),
    });

    const token = localStorage.getItem("token");

    await fetch(
      "https://bot.kediritechnopark.com/webhook/subscribe/estetika-dev",
      {
        method: "POST",
        body: JSON.stringify({ subscription }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setModalContent("");
  };

  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }

  const openConversationsModal = () => {
    setModalContent(<Conversations conversations={conversations} />);
  };

  const openTopicsModal = () => {
    setModalContent(<DiscussedTopics topics={discussedTopics} />);
  };

  useEffect(() => {
    if (!rawData.length) return;

    const ctx = chartRef.current?.getContext("2d");
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const prefixLabelMap = {
      WEB: "Web App",
      TGG: "Telegram",
      WGG: "Whatsapp",
      IGG: "Instagram",
    };

    const prefixColors = {
      WEB: { border: "#e2b834", background: "rgba(226,184,52,0.6)" },
      TGG: { border: "#24A1DE", background: "rgba(36,161,222,0.6)" },
      WGG: { border: "#25d366", background: "rgba(37,211,102,0.6)" },
      IGG: { border: "#d62976", background: "rgba(214,41,118,0.6)" },
    };

    const prefixes = Object.keys(prefixLabelMap);
    const parsedHours = rawData.map((d) => new Date(d.hour));
    parsedHours.sort((a, b) => a - b);

    // Extract only the date (no timezone shifting)
    const getDateStr = (date) =>
      date.getFullYear() +
      "-" +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      "-" +
      date.getDate().toString().padStart(2, "0");

    const hours = parsedHours.map((date, index) => {
      const timeStr =
        date.getHours().toString().padStart(2, "0") +
        ":" +
        date.getMinutes().toString().padStart(2, "0");
      return index === parsedHours.length - 1 ? "Now" : timeStr;
    });

    const counts = {};
    prefixes.forEach((prefix) => {
      counts[prefix] = hours.map(() => 0);
    });

    rawData.forEach(({ sesi }, index) => {
      prefixes.forEach((prefix) => {
        if (Array.isArray(sesi[prefix])) {
          counts[prefix][index] = sesi[prefix].length;
        }
      });
    });

    const datasets = prefixes.map((prefix) => ({
      label: prefixLabelMap[prefix],
      data: counts[prefix],
      borderColor: prefixColors[prefix].border,
      backgroundColor: prefixColors[prefix].background,
      fill: true,
      tension: 0.3,
    }));

    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: hours,
        datasets,
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: {
              boxWidth: 15,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
          x: {
            ticks: {
              font: {
                size: 10, // 👈 set your desired font size here
              },
            },
          },
        },
      },
    });
  }, [rawData]);

  const handleDeleteFile = async (key) => {
    if (!window.confirm(`Yakin ingin menghapus "${key}"?`)) return;
    const token = localStorage.getItem("token");

    try {
      await fetch(
        "https://bot.kediritechnopark.com/webhook/estetika-dev/files/delete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ key }),
        }
      );

      // fetchFiles(); // Refresh list
    } catch (error) {
      console.error("Gagal menghapus file:", error);
    }
  };

  const handleBatchDownload = async () => {
    const token = localStorage.getItem("token");
    for (const key of selectedKeys) {
      try {
        const response = await fetch(
          `https://bot.kediritechnopark.com/webhook/estetika-dev/files/download?key=${encodeURIComponent(
            key
          )}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) throw new Error("Gagal download");

        const blob = await response.blob();

        // Coba ambil nama file dari header Content-Disposition (jika tersedia)
        let filename = key;
        const disposition = response.headers.get("Content-Disposition");
        if (disposition && disposition.includes("filename=")) {
          const match = disposition.match(/filename="?(.+?)"?$/);
          if (match) filename = match[1];
        }

        // Buat URL dan download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error(`Gagal download ${key}:`, err);
      }
    }
  };

  const handleBatchUpload = async () => {
    const token = localStorage.getItem("token");
    const newFiles = [];

    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append("file", file, file.name);

      const response = await fetch(
        "https://bot.kediritechnopark.com/webhook/estetika-dev/files/upload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        const newFile = {
          json: {
            Key: file.name,
            LastModified: new Date().toISOString(),
            Size: file.size,
            StorageClass: "STANDARD",
          },
        };

        // 1️⃣ Hapus file lama dari fileList yang punya nama sama
        setFileList((prev) => {
          const filtered = prev.filter((f) => f.json.Key !== file.name);
          return [...filtered, newFile];
        });

        newFiles.push(newFile);
        setUpdateDetected(true);
      } else {
        console.error(`Upload gagal untuk file ${file.name}`);
      }
    }

    alert("Upload selesai");
    setSelectedFiles([]);
  };

  const handleBatchDelete = async () => {
    if (!window.confirm(`Yakin ingin menghapus ${selectedKeys.length} file?`))
      return;

    const token = localStorage.getItem("token");
    const successKeys = [];
    const failedKeys = [];

    for (const key of selectedKeys) {
      try {
        const response = await fetch(
          `https://bot.kediritechnopark.com/webhook/estetika-dev/files/delete?key=${encodeURIComponent(
            key
          )}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          successKeys.push(key);
        } else {
          failedKeys.push(key);
        }
      } catch (err) {
        console.error(`Gagal menghapus ${key}`, err);
        failedKeys.push(key);
      }
    }

    // ✅ Update fileList sekaligus
    setFileList((prev) =>
      prev.filter((file) => !successKeys.includes(file.json.Key))
    );

    // ✅ Kosongkan selected
    setSelectedKeys([]);

    // ✅ Beri feedback ke user
    if (failedKeys.length === 0) {
      alert("File berhasil dihapus.");
    } else {
      alert(`Sebagian gagal dihapus:\n${failedKeys.join("\n")}`);
    }
  };

  const handleBatchPush = async () => {
    if (!window.confirm(`Yakin ingin mengupdate pengetahuan AI?`)) return;

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `https://bot.kediritechnopark.com/webhook/estetika-dev/files/push`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        alert("Pengetahuan berhasil diperbarui.");
      } else {
        alert(`Gagal memperbarui pengetahuan AI`);
      }
    } catch (err) {
      alert(`Gagal memperbarui pengetahuan AI`);
    }
  };

  // ⬇️ Jika masih loading, tampilkan full white screen
  if (loading) {
    return (
      <div
        style={{ backgroundColor: "white", width: "100vw", height: "100vh" }}
      />
    );
  }

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
                onClick={() => navigate("/profile")}
                className={styles.dropdownItem}
              >
                Profile
              </button>
              <button onClick={handleLogout} className={styles.dropdownItem}>
                Logout
              </button>
            </div>
          )}
        </div>
        <img src="/dermalounge.jpg" alt="Bot Avatar" />
        <div>
          <h1 className={styles.h1}>Dermalounge AI Admin Dashboard</h1>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h2>{stats.totalChats}</h2>
          <p>TOTAL USER PER DAY</p>
        </div>
        <div className={styles.statCard}>
          <h2>{stats.botMessages}</h2>
          <p>AI RESPONSE</p>
        </div>
        <StatCard followUps={followUps} setModalContent={setModalContent} />
        <div className={styles.statCard} onClick={openTopicsModal}>
          <h2 style={{ fontSize: "17px" }}>{discussedTopics[0]?.topic}</h2>
          <p>Top topic</p>
        </div>
      </div>

      <div className={styles.chartSection}>
        <h2 className={styles.chartTitle}>Interactions</h2>
        <canvas ref={chartRef}></canvas>
      </div>
      <div className={styles.chartSection}>
        <h2 className={styles.chartTitle}>Update AI data</h2>

        {/* ✅ TOMBOL AKSI */}
        <div className={styles.actionBar}>
          <button
            onClick={handleBatchDownload}
            disabled={selectedKeys.length < 1}
          >
            ⬇️ Download
          </button>
          <button
            onClick={handleBatchDelete}
            disabled={selectedKeys.length < 1}
          >
            🗑️ Delete
          </button>
          {updateDetected && (
            <button onClick={handleBatchPush}>🔄 Update</button>
          )}
        </div>

        {/* ✅ AREA UPLOAD */}
        <div
          className={`${styles.uploadContainer} ${
            isDragging ? styles.dragActive : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const files = Array.from(e.dataTransfer.files);
            handleFiles(files);
          }}
        >
          {/* ✅ TABEL FILE */}
          <table className={styles.fileTable}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      fileList.length > 0 &&
                      selectedKeys.length === fileList.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedKeys(fileList.map((f) => f.json.Key));
                      } else {
                        setSelectedKeys([]);
                      }
                    }}
                  />
                </th>
                <th>select all</th>
              </tr>
            </thead>
            <tbody>
              {fileList.map((file, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedKeys.includes(file.json.Key)}
                      onChange={() => {
                        setSelectedKeys((prev) =>
                          prev.includes(file.json.Key)
                            ? prev.filter((key) => key !== file.json.Key)
                            : [...prev, file.json.Key]
                        );
                      }}
                    />
                  </td>
                  <td>{file.json.Key}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className={styles.desktopText}>
            Drop file here, or{" "}
            <span
              onClick={() => document.getElementById("fileInput").click()}
              className={styles.uploadLink}
            >
              Click to upload
            </span>
          </p>
          <p
            className={styles.mobileText}
            onClick={() => document.getElementById("fileInput").click()}
          >
            Click to upload
          </p>

          <div>
            {selectedFiles.length > 0 &&
              selectedFiles.map((file, index) => (
                <div key={index}>
                  <div key={index} className={styles.fileInfo}>
                    <strong>{file.name}</strong>
                  </div>
                  <div
                    className={styles.fileInfoClose}
                    onClick={() =>
                      setSelectedFiles((prev) =>
                        prev.filter((_, i) => i !== index)
                      )
                    }
                  >
                    X
                  </div>
                </div>
              ))}

            {selectedFiles.length > 0 && (
              <div>
                <div
                  onClick={() => handleBatchUpload()}
                  className={styles.fileUpload}
                >
                  <strong>Upload</strong>
                </div>
              </div>
            )}
          </div>
          <input
            id="fileInput"
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => {
              const files = Array.from(e.target.files);
              handleFiles(files);
            }}
          />
        </div>
      </div>

      <div className={styles.footer}>&copy; 2025 Dermalounge</div>

      {modalContent && (
        <Modal onClose={() => setModalContent(null)}>{modalContent}</Modal>
      )}
    </div>
  );
};

export default Dashboard;
