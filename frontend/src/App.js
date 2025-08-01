import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Gym from './pages/Gym';
import Library from './pages/Library';
import Dining from './pages/Dining';
import RamTram from './pages/RamTram';
import About from './pages/About';
import './styles/Layout.css';

function App() {
  return (
    <Router basename="/ASU-Facilities-Hours-of-Operation-Webpage">
      <Layout>
        <Routes>
          <Route path="/library" element={<Library />} />
          <Route path="/gym" element={<Gym />} />
          <Route path="/dining" element={<Dining />} />
          <Route path="/ramtram" element={<RamTram />} />
          <Route path="/about" element={<About />} />
          <Route path="/" element={<Navigate to="/library" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
