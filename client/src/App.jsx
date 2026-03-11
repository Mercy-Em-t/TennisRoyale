import { Routes, Route } from 'react-router-dom';
import TournamentList from './pages/TournamentList';
import TournamentDetail from './pages/TournamentDetail';

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1><a href="/">🎾 TennisRoyale</a></h1>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<TournamentList />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
        </Routes>
      </main>
    </div>
  );
}
