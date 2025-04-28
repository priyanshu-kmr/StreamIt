import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import './Watch.css'

const Watch = () => {
  const { videoName } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [status, setStatus] = useState('Loading...');
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    const socket = io('http://localhost:4040', { transports: ['websocket'] });
    let chunks = [];

    socket.emit('watch', { videoName });

    socket.on('videoMeta', (meta) => {
      setStatus(`Receiving video: ${meta.name} (${(meta.size / 1024 / 1024).toFixed(2)} MB)`);
    });

    socket.on('videoChunk', (chunk) => {
      chunks.push(new Uint8Array(chunk));
    });

    socket.on('videoEnd', () => {
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setStatus('Ready');
    });

    socket.on('videoError', (err) => {
      setStatus(err.message || 'Error receiving video');
    });

    return () => {
      socket.disconnect();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoName]);

  return (
    <div className="watch-container">
      <h2 className="watch-title">Watching: {videoName}</h2>
      <p className="watch-status">{status}</p>
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          autoPlay
          className="watch-video"
        />
      )}
      <button className="back-home-btn" onClick={() => navigate('/')}>Back to Home</button>
    </div>
  );
};

export default Watch;