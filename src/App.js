import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Streamer from './pages/Streamer';
import Viewer from './pages/Viewer';
import Watch from './pages/Watch'; // <-- Add this import

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/streamer/:username" element={<Streamer />} />
        <Route path="/viewer/:username" element={<Viewer />} />
        <Route path="/watch/:videoName" element={<Watch />} /> {/* New route */}
        <Route path="*" element={<div>No such stream found</div>} />
      </Routes>
    </Router>
  );
}

export default App;