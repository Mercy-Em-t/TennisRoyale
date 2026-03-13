import React, { useState } from 'react';
import { addRegistration } from '../api';

interface RegistrationFormProps {
  tournamentId: number | string;
  onRegistered?: () => void;
}

export default function RegistrationForm({ tournamentId, onRegistered }: RegistrationFormProps) {
  const [playerName, setPlayerName] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !playerEmail.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await addRegistration(Number(tournamentId), {
        name: playerName.trim(),
        email: playerEmail.trim()
      });
      setPlayerName('');
      setPlayerEmail('');
      if (onRegistered) onRegistered();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm max-w-md mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Tournament Entry</h3>
        <p className="text-gray-400 text-sm mt-1">Register to secure your spot in the competition</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Full Name</label>
          <input
            type="text"
            placeholder="e.g. Roger Federer"
            className="w-full bg-gray-50 border border-transparent rounded-2xl px-5 py-3 text-sm focus:bg-white focus:border-blue-500 outline-none transition"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">Email Address</label>
          <input
            type="email"
            placeholder="roger@example.com"
            className="w-full bg-gray-50 border border-transparent rounded-2xl px-5 py-3 text-sm focus:bg-white focus:border-blue-500 outline-none transition"
            value={playerEmail}
            onChange={(e) => setPlayerEmail(e.target.value)}
            required
          />
        </div>

        {error && <p className="bg-red-50 text-red-500 p-3 rounded-xl text-xs text-center border border-red-100 italic">⚠️ {error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition shadow-lg disabled:bg-gray-300 transform active:scale-95 duration-75 mt-4"
        >
          {submitting ? 'Processing...' : 'Complete Registration'}
        </button>
      </form>
    </div>
  );
}
