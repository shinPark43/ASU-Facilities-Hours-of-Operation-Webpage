import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Gym from './pages/Gym';
import Library from './pages/Library';
import Dining from './pages/Dining';
import RamTram from './pages/RamTram';
import Tutoring from './pages/Tutoring';
import About from './pages/About';
import HowToInstall from './pages/HowToInstall';
import Landing from './pages/Landing';
import './styles/Layout.css';

function App() {
  return (
    <Router basename="/ASU-Facilities-Hours-of-Operation-Webpage">
      <Layout>
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/library" element={<Library />} />
          <Route path="/gym" element={<Gym />} />
          <Route path="/dining" element={<Dining />} />
          <Route path="/ramtram" element={<RamTram />} />
          <Route path="/tutoring" element={<Tutoring />} />
          <Route path="/about" element={<About />} />
          <Route path="/install" element={<HowToInstall />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
          {/* Catch all undefined routes and redirect to home */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
