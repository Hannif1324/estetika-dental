import React, { useState, useEffect } from "react";
import styles from "./ChatBot.module.css";
import CameraModal from "./Camera";
import { useSearchParams, useNavigate } from "react-router-dom";
import ChatBotBackground from "./ChatBotBackground";

const ChatBot = ({ existingConversation }) => {
  const [visibleReplies, setVisibleReplies] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState("");
  const [isPoppedUp, setIsPoppedUp] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [hasAnimatedIntro, setHasAnimatedIntro] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isOpenCamera = searchParams.get("camera") === "open";

  useEffect(() => {
    if (existingConversation && existingConversation.length > 0) {
      setMessages(existingConversation);
    } else {
      setMessages([
        {
          sender: "bot",
          text: "Hai! Saya Maya, asisten virtual Estetika Dental. Ada yang bisa Maya bantu hari ini?",
          time: getTime(),
          quickReplies: [
            "Periksa Kesehatan Gigi",
            "Atur Jadwal",
            "Wujudkan Senyum Impian",
          ],
          animated: true,
        },
      ]);
      setHasAnimatedIntro(true);
    }
  }, [existingConversation]);

  useEffect(() => {
    if (hasAnimatedIntro) {
      let index = 0;
      const interval = setInterval(() => {
        index++;
        setVisibleReplies(index);
        if (index >= 4) clearInterval(interval);
      }, 400);
      return () => clearInterval(interval);
    }
  }, [hasAnimatedIntro]);

  useEffect(() => {
    if (!localStorage.getItem("session")) {
      function generateUUID() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
          /[xy]/g,
          function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          }
        );
      }
      const sessionId = generateUUID();
      const dateNow = new Date().toISOString();
      localStorage.setItem(
        "session",
        JSON.stringify({ sessionId, lastSeen: dateNow })
      );
    }
  }, []);

  function base64ToFile(base64Data, filename) {
    const arr = base64Data.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  }

  const askToBot = async ({ type = "text", content, tryCount = 0 }) => {
    const session = JSON.parse(localStorage.getItem("session"));
    if (!session || !session.sessionId) return;

    let body;
    let headers;
    const isBase64Image =
      type === "image" &&
      typeof content === "string" &&
      content.startsWith("data:image/");

    if (isBase64Image) {
      const file = base64ToFile(content, "photo.jpg");
      const formData = new FormData();
      formData.append("sessionId", session.sessionId);
      formData.append("lastSeen", new Date().toISOString());
      formData.append("name", session.name || "");
      formData.append("phoneNumber", session.phoneNumber || "");
      formData.append("type", type);
      formData.append("image", file);
      body = formData;
      headers = {};
    } else {
      body = JSON.stringify({
        sessionId: session.sessionId,
        lastSeen: new Date().toISOString(),
        name: session.name,
        phoneNumber: session.phoneNumber,
        pertanyaan: content,
        type: type,
      });
      headers = { "Content-Type": "application/json" };
    }

    try {
      const response = await fetch(
        "https://auto.apps.kediritechnopark.com/webhook/estetika-dev/ask",
        {
          method: "POST",
          headers,
          body,
        }
      );
      return await response.json();
    } catch (error) {
      if (tryCount < 3) {
        return new Promise((resolve) =>
          setTimeout(
            () => resolve(askToBot({ type, content, tryCount: tryCount + 1 })),
            3000
          )
        );
      } else {
        console.error("Bot unavailable:", error);
        return {
          jawaban: "Maaf saya sedang tidak tersedia sekarang, coba lagi nanti",
        };
      }
    }
  };

  const handleUploadImage = async (img) => {
    setSearchParams({});
    const newMessages = [
      ...messages,
      { sender: "user", img: img, time: getTime() },
    ];
    setMessages(newMessages);
    setIsLoading("Menganalisa gambar anda...");

    const data = await askToBot({ type: "image", content: img });
    const botAnswer =
      data.jawaban || "Maaf, saya tidak bisa menganalisis gambar tersebut.";

    setMessages((prev) => [
      ...prev,
      { sender: "bot", text: botAnswer, time: getTime() },
    ]);
    setIsLoading("");
  };

  const sendMessage = async (
    textOverride = null,
    name,
    phoneNumber,
    tryCount = 0
  ) => {
    const message = textOverride || input.trim();
    if (message === "") return;

    const session = JSON.parse(localStorage.getItem("session"));
    if (
      (!session || !session.name || !session.phoneNumber) &&
      messages.length > 2
    ) {
      setIsPoppedUp(message);
      setInput("");
      return;
    }

    setHasAnimatedIntro(false);

    const newMessages = [
      ...messages,
      { sender: "user", text: message, time: getTime() },
    ];
    setMessages(newMessages);
    setInput("");
    setIsLoading("Mengetik...");

    try {
      const data = await askToBot({ type: "text", content: message, tryCount });
      const botAnswer =
        data.jawaban ||
        "Maaf saya sedang tidak tersedia sekarang, coba lagi nanti";

      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: botAnswer, time: getTime() },
      ]);
      setIsLoading("");
    } catch (error) {
      console.error("Error sending message:", error);
      if (tryCount >= 3) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: "Maaf saya sedang tidak tersedia sekarang, coba lagi nanti",
            time: getTime(),
          },
        ]);
        setIsLoading("");
      } else {
        setTimeout(
          () => sendMessage(message, name, phoneNumber, tryCount + 1),
          3000
        );
      }
    }
  };

  function formatBoldText(text) {
    const parts = text.split(/(\*\*[^\*]+\*\*)/g);
    return parts.flatMap((part, index) => {
      const elements = [];
      if (part.startsWith("**") && part.endsWith("**")) {
        part = part.slice(2, -2);
        part.split("\n").forEach((line, i) => {
          if (i > 0) elements.push(<br key={`br-bold-${index}-${i}`} />);
          elements.push(<strong key={`bold-${index}-${i}`}>{line}</strong>);
        });
      } else {
        part.split("\n").forEach((line, i) => {
          if (i > 0) elements.push(<br key={`br-${index}-${i}`} />);
          elements.push(<span key={`text-${index}-${i}`}>{line}</span>);
        });
      }
      return elements;
    });
  }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <img src="/dental1.jpg" alt="Bot Avatar" />
        <strong>ESTETIKA DENTAL</strong>
      </div>

      <div className={styles.chatBody}>
        <ChatBotBackground />
        {isLoading && (
          <div className={`${styles.messageRow} ${styles.bot}`}>
            <div className={`${styles.message} ${styles.bot}`}>
              <em>{isLoading}</em>
            </div>
          </div>
        )}
        {messages
          .slice()
          .reverse()
          .map((msg, index) => (
            <div
              key={index}
              className={`${styles.messageRow} ${styles[msg.sender]}`}
            >
              <div
                className={`${styles.message} ${styles[msg.sender]} ${
                  msg.animated && hasAnimatedIntro ? styles.introAnimation : ""
                }`}
              >
                {msg.sender !== "bot" ? (
                  msg.text ? (
                    msg.text
                  ) : (
                    <img
                      style={{
                        maxHeight: "300px",
                        maxWidth: "240px",
                        borderRadius: "12px",
                      }}
                      src={msg.img}
                    />
                  )
                ) : (
                  formatBoldText(msg.text)
                )}
                {msg.quickReplies && (
                  <div className={styles.quickReplies}>
                    {msg.quickReplies.map((reply, i) => (
                      <div
                        key={i}
                        className={styles.quickReply}
                        onClick={() => sendMessage(reply)}
                        style={{
                          opacity: visibleReplies > i ? 1 : 0,
                          transform:
                            visibleReplies > i
                              ? "translateY(0)"
                              : "translateY(10px)",
                          transition: "all 0.3s ease",
                        }}
                      >
                        {reply}
                      </div>
                    ))}
                    <div
                      className={styles.quickReply}
                      onClick={() => setSearchParams({ camera: "open" })}
                      style={{
                        color: "white",
                        backgroundColor: "#92c43e",
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        opacity: visibleReplies > 2 ? 1 : 0,
                        transform:
                          visibleReplies > 2
                            ? "translateY(0)"
                            : "translateY(10px)",
                        transition: "all 2.3s ease",
                      }}
                    >
                      <img
                        style={{
                          marginRight: "5px",
                          height: "14px",
                          filter: "invert(1)",
                        }}
                        src="/camera.png"
                      />
                      Analisa Gambar
                    </div>
                  </div>
                )}
                <div className={styles.timestamp}>{msg.time}</div>
              </div>
            </div>
          ))}
      </div>

      <div className={styles.chatInput}>
        <input
          type="text"
          placeholder="Ketik pesan..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={!!isLoading}
        />
        <button
          onClick={() => sendMessage()}
          style={{
            marginLeft: "-40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          disabled={!!isLoading}
        >
          <img
            src="/send.png"
            alt="Kirim"
            style={{ height: "20px", filter: "invert(1)" }}
          />
        </button>
        <button
          onClick={() => setSearchParams({ camera: "open" })}
          style={{
            // marginLeft: "-40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          disabled={!!isLoading}
        >
          <img
            src="/camera.png"
            alt="Kamera"
            style={{ height: "18px", filter: "invert(1)" }}
          />
        </button>
      </div>

      {isPoppedUp !== "" && (
        <div className={styles.PopUp}>
          <div className={`${styles.message} ${styles["bot"]}`}>
            Untuk bisa membantu Anda lebih jauh, boleh saya tahu nama dan nomor
            telepon Anda? 😊
            <div
              className={styles.quickReplies}
              style={{ flexDirection: "column" }}
            >
              <input
                className={styles.quickReply}
                placeholder="Nama Lengkapmu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
              />
              <div className={styles.inputGroup}>
                <span className={styles.prefix}>+62</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={11}
                  className={styles.quickReply2}
                  placeholder="Nomor HP"
                  value={phoneNumber}
                  onChange={(e) =>
                    /^\d{0,11}$/.test(e.target.value) &&
                    setPhoneNumber(e.target.value)
                  }
                />
              </div>
              <div
                className={styles.nextButton}
                onClick={() => {
                  if (name.length > 2 && phoneNumber.length >= 10) {
                    const sessionData =
                      JSON.parse(localStorage.getItem("session")) || {};
                    sessionData.name = name;
                    sessionData.phoneNumber = phoneNumber;
                    localStorage.setItem(
                      "session",
                      JSON.stringify(sessionData)
                    );
                    setIsPoppedUp("");
                    sendMessage(isPoppedUp);
                  }
                }}
              >
                Lanjut
              </div>
            </div>
          </div>
        </div>
      )}

      <CameraModal
        isOpen={isOpenCamera}
        onClose={() => setSearchParams({})}
        onUpload={handleUploadImage}
      />
    </div>
  );
};

function getTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default ChatBot;
