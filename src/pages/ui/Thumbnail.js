import React, { useRef, useEffect, useState } from 'react';
import './Thumbnail.css';

const Thumbnail = ({ name, thumbnail, pngData, videoUrl }) => {
  const [duration, setDuration] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoUrl) return;
    const video = document.createElement('video');
    video.src = videoUrl;
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const d = video.duration;
      const minutes = Math.floor(d / 60);
      const seconds = Math.floor(d % 60).toString().padStart(2, '0');
      setDuration(`${minutes}:${seconds}`);
    };
  }, [videoUrl]);

  // Prefer pngData if available, else fallback to thumbnail URL
  const imgSrc = pngData || thumbnail;

  return (
    <div className="thumbnail-container">
      <div className="thumbnail-image-wrapper">
        <img
          src={imgSrc}
          alt={name}
          className="thumbnail-image"
        />
      </div>
      <div className="thumbnail-name">{name}</div>
    </div>
  );
};

export default Thumbnail;