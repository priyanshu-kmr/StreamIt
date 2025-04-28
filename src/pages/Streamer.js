import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useParams, useNavigate } from 'react-router-dom';
import './Streamer.css'

const Streamer = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null); 
  const socketRef = useRef(null);
  const initSegmentSent = useRef(false);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    // Initialize Socket.IO client with WebSocket transport
    const socket = io('http://localhost:4040', { transports: ['websocket'] });
    socketRef.current = socket;

    // Join room with username
    socket.emit('joinRoom', username);

    socket.on('connect', () => console.log('Connected to server'));
    socket.on('connect_error', (err) => console.error('Connection error:', err));

    return () => {
      stopStream();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [username]);

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: { ideal: 30 } }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn('Playback error:', playError);
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codec=vp9,opus',
        videoBitsPerSecond: 1000000
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.onstart = () => {
        console.log('[Streamer] recorder started – requesting init segment');
        mediaRecorder.requestData();
      };

      mediaRecorder.ondataavailable = async (event) => {
        console.log('[Streamer] ondataavailable, size=', event.data.size);
        if (!event.data || event.data.size === 0) return;
        // send the video as a byte stream
        try {
          const buffer = new Uint8Array(await event.data.arrayBuffer());
          const payload = { room: username, data: buffer };

          if (!initSegmentSent.current) {
            console.log('[Streamer] sending INIT segment');
            socketRef.current.emit('videoInitSegment', payload);
            initSegmentSent.current = true;
          } else {
            console.log('[Streamer] sending media chunk');
            socketRef.current.emit('videoChunk', payload);
          }
        } catch (error) {
          console.error('Error processing recorded data:', error);
        }
      };

      mediaRecorder.start(200);
      setIsStreaming(true);
    } catch (err) {
      console.error('Error accessing media devices:', err);
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    initSegmentSent.current = false;
    socketRef.current.send({ type: 'StreamPause', room: username });
    console.log('sent stream pause message')
  };

  const goToHome = () => {
    stopStream();
    navigate('/');
    socketRef.current.emit('streamEnd', { room: username });

  };

  return (
    <div className="streamer-container">
      <div className="streamer-header">
        <h1 className="streamer-title">Streaming as: {username}</h1>
        <p className="streamer-status">
          {isStreaming ? 'You are live!' : 'Click Start Streaming to go live.'}
        </p>
      </div>
      <video 
        ref={videoRef} 
        muted 
        playsInline 
        className="streamer-video"
      />
      <div className="streamer-btn-group">
        {!isStreaming ? (
          <button className="stream-btn" onClick={startStream}>Start Stream</button>
        ) : (
          <button className="stream-btn" onClick={stopStream}>Stop Stream</button>
        )}
        <button 
          className="back-home-btn"
          onClick={goToHome}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default Streamer;
