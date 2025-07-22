import React, { useState, useEffect, useRef } from 'react';
import styles from './Camera.module.css';

const CameraModal = ({ isOpen, onClose, onUpload }) => {
  const [flashOn, setFlashOn] = useState(false);
  const [image, setImage] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isUploadedFile, setIsUploadedFile] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
    }
  };

  const captureImage = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImage(dataUrl);
      setIsCameraActive(false);
      setIsUploadedFile(false);
    }
  };

  const toggleFlash = () => {
    setFlashOn(prev => !prev);
    const track = videoRef.current?.srcObject?.getVideoTracks?.()[0];
    if (track && track.getCapabilities().torch) {
      track.applyConstraints({
        advanced: [{ torch: !flashOn }]
      }).catch(e => console.warn("Flash not supported:", e));
    }
  };


  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
      setIsCameraActive(false);
      setIsUploadedFile(true);
    };
    reader.readAsDataURL(file);
  };

  const resetCapture = () => {
    setImage(null);
    setIsCameraActive(true);
    setIsUploadedFile(false);
    startCamera();
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <button onClick={onClose} style={closeButtonStyle}>✖</button>
        <div style={cameraWrapperStyle}>
          {isCameraActive ? (
            <video ref={videoRef} autoPlay playsInline style={videoStyle} />
          ) : (
            image && (
              <img
                src={image}
                alt="Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: isUploadedFile ? 'contain' : 'cover',
                  background: '#000',
                }}
              />
            )
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>

        <div style={buttonGroupStyle}>
          {isCameraActive ? (
            <>
              <button className={styles.buttonYellow} onClick={toggleFlash} style={flashButtonStyle}>
                {flashOn ? "💡 Flash: ON" : "💡 Flash: OFF"}
              </button>
              <button className={styles.buttonGreen} onClick={captureImage} style={buttonStyle}>📸 Ambil</button>
              <button className={styles.buttonGreen} onClick={triggerFileInput} style={buttonStyle}>🖼 Upload</button>
            </>
          ) : (
            <>
              <button className={styles.buttonGreen} onClick={resetCapture} style={buttonStyle}>🔁 Ulangi</button>
              <button className={styles.buttonGreen} onClick={() => onUpload(image)} style={buttonStyle}>✅ Kirim</button>
            </>
          )}
        </div>
                
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
};

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalStyle = {
  backgroundColor: '#fefefe',
  borderRadius: '16px',
  overflow: 'hidden',
  width: '90%',
  maxWidth: '420px',
  position: 'relative',
  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
  fontFamily: '"Segoe UI", sans-serif',
  paddingBottom: '1rem',
};

const cameraWrapperStyle = {
  width: '100%',
  height: '300px',
  backgroundColor: '#000',
  position: 'relative',
  zIndex: 1,
};

const videoStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const closeButtonStyle = {
  position: 'absolute',
  top: '10px',
  right: '10px',
  background: 'transparent',
  border: 'none',
  fontSize: '18px',
  cursor: 'pointer',
  zIndex: 2,
};

const buttonGroupStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-evenly',
  padding: '1rem 0.5rem 0 0.5rem',
  gap: '10px',
};

const buttonStyle = {
  padding: '0.6rem 1.2rem',
  fontSize: '0.9rem',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  backgroundColor: '#28a745',
  color: '#fff',
  transition: 'background-color 0.3s',
};

const flashButtonStyle = {
  ...buttonStyle,
  backgroundColor: '#ffc107',
  color: '#333',
};


export default CameraModal;