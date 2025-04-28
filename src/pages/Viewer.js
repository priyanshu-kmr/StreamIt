import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams, useNavigate } from 'react-router-dom';
import './Viewer.css';
import '../pages/Home.css';

const Viewer = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Initializing...');
  const [name, setName] = useState('');
  const [liveStreamers, setLiveStreamers] = useState([]);
  const videoRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const queueRef = useRef([]);
  const initAppendedRef = useRef(false);

  useEffect(() => {
    // Fetch live streamers for sidebar
    const socketSidebar = io('http://localhost:4040', { transports: ['websocket'] });
    socketSidebar.emit('getLiveStreamers');
    socketSidebar.on('liveStreamers', (list) => setLiveStreamers(list));
    return () => socketSidebar.disconnect();
  }, []);

  useEffect(() => {
    // Setup Socket.IO client
    const socket = io('http://localhost:4040', { transports: ['websocket'] });
    socket.io.binaryType = 'arraybuffer';

    // Setup MediaSource and attach to video element
    const video = videoRef.current;
    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;
    video.src = URL.createObjectURL(mediaSource);

    const appendFromQueue = () => {
      const sb = sourceBufferRef.current;
      if (sb && !sb.updating && queueRef.current.length > 0) {
        const buffer = queueRef.current.shift();
        try {
          sb.appendBuffer(buffer);
        } catch (e) {
          console.error('Append error:', e);
        }
      }
    };

    // 3. When MediaSource is open, configure SourceBuffer and join room
    mediaSource.addEventListener('sourceopen', () => {
      setStatus('MediaSource ready');
      const mimeType = 'video/webm; codecs="vp9,opus"';
      if (!MediaSource.isTypeSupported(mimeType)) {
        console.error('MIME not supported:', mimeType);
        setStatus('Unsupported MIME');
        return;
      }

      const sb = mediaSource.addSourceBuffer(mimeType);
      sourceBufferRef.current = sb;
      sb.mode = 'segments';

      sb.addEventListener('updateend', () => {
        // On first append (init segment), start playback
        if (!initAppendedRef.current) {
          initAppendedRef.current = true;
          video.play().catch(err => console.warn('Play error:', err));
          setStatus('Playing');
        }
        // Append next queued buffer
        appendFromQueue();
      });

      socket.emit('joinRoom', username);
      setStatus('Joined room, waiting for init segment...');
    });

    socket.on('videoInitSegment', (data) => {
      queueRef.current = [];
      queueRef.current.push(data);
      appendFromQueue();
    });

    socket.on('videoChunk', (data) => {
      queueRef.current.push(data);
      appendFromQueue();
    });

    socket.on('message', (msg) => {
      if (!msg || !msg.type) return;
      if (msg.type === 'streamEnd') {
        setStatus('Stream has ended');
        if (videoRef.current) videoRef.current.pause();
      } else if (msg.type === 'streamPause') {
        setStatus('Stream is paused');
      }
    });

    socket.on('connect', () => setStatus('Connected to server'));
    socket.on('connect_error', (err) => {
      setStatus('Connection Error');
    });

    // Cleanup on unmount
    return () => {
      if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
        mediaSourceRef.current.endOfStream();
      }
      if (video) {
        video.pause();
        video.src = '';
      }
      socket.disconnect();
    };
  }, [username]);

  const handleStreamer = () => {
    if (name.trim()) {
      navigate(`/streamer/${name}`);
    } else {
      alert('Please enter a valid name');
    }
  };

  return (
    <div className="main-layout">
      {/* Topbar */}
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
      <div className="main-content">
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
          <h2 className="viewer-title">Viewing: {username}</h2>
          <p className="viewer-status">{status}</p>
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            className="viewer-video"
          />
          <button
            className="back-home-btn"
            style={{
              marginTop: 20,
              padding: '4px 10px',      // Less horizontal padding
              borderRadius: 6,
              fontSize: '0.85rem',
              fontWeight: 500,
              minWidth: 'unset',        // Remove minWidth
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
            onClick={() => navigate('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Viewer;
