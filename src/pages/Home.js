import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Thumbnail from './ui/Thumbnail';
import './Home.css';

const Home = () => {
  const [name, setName] = useState('');
  const [videoList, setVideoList] = useState([]);
  const [liveStreamers, setLiveStreamers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = io('http://localhost:4040', { transports: ['websocket'] });
    socket.emit('requestVideoList');
    socket.on('videoList', (list) => setVideoList(list));
    socket.emit('getLiveStreamers');
    socket.on('liveStreamers', (list) => setLiveStreamers(list));
    return () => socket.disconnect();
  }, []);

  const handleStreamer = () => {
    if (name.trim()) {
      navigate(`/streamer/${name}`);
    } else {
      alert('Please enter a valid name');
    }
  };

  return (
    <>
    <div className="main-layout">
      {/* Topbar inside layout for full-width alignment */}
      <header className="topbar">
        <div className="topbar-title">🎥 StreamIt</div>
        <div className="topbar-actions">
          <input
            className="topbar-input"
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="stream-btn" onClick={handleStreamer}>
            Start Streaming
          </button>
        </div>
      </header>
  
      {/* Sidebar + Content */}
      <div className="main-content">
        {/* Sidebar */}
        <aside className="sidebar">
          <h2 className="sidebar-title">LIVE CHANNELS</h2>
          <div className="sidebar-list">
            {liveStreamers.length === 0 ? (
              <div className="sidebar-empty">No channels present.</div>
            ) : (
              liveStreamers.map((streamer, idx) => (
                <div
                  key={idx}
                  className="sidebar-channel"
                  onClick={() =>
                    navigate(`/viewer/${encodeURIComponent(streamer)}`)
                  }
                >
                  <span className="sidebar-dot" /> {streamer}
                </div>
              ))
            )}
          </div>
        </aside>
  
        {/* Main Content Area */}
        <div className="content-area">
          <h2 className="section-title">🎬 Videos</h2>
          <div className="videos-grid">
            {videoList.length === 0 && (
              <div className="no-videos">No videos available.</div>
            )}
            {videoList.map((video, idx) => (
              <div
                key={idx}
                className="video-card"
                onClick={() =>
                  navigate(`/watch/${encodeURIComponent(video.name)}`)
                }
              >
                <Thumbnail
                  name={video.name.replace(/\.mp4$/i, '')}
                  thumbnail={video.thumbnail}
                  pngData={video.pngData}
                  videoUrl={null}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </>  
  );
};

export default Home;