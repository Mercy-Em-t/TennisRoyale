import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TournamentList from './pages/TournamentList';
import HostDashboard from './pages/HostDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<TournamentList />} />
          <Route path="/tournaments/:id" element={<HostDashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
