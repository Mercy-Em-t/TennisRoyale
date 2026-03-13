import React, { useState } from 'react';
import api from '../api';

interface PaymentModalProps {
  tournament: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({ tournament, onClose, onSuccess }: PaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = Number(tournament.entry_fee);
  const platformFee = (total * 0.10).toFixed(2);
  const hostReceives = (total - Number(platformFee)).toFixed(2);

  const handlePay = async () => {
    setLoading(true);
    setError('');
    try {
      const initRes = await api.post('/payments/initiate', {
        tournament_id: tournament.id,
      });

      // Simulate payment (in production, redirect to payment provider)
      await api.post(`/payments/simulate/${initRes.data.payment_id}`);

      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">💳</div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Secure Checkout</h2>
            <p className="text-gray-400 text-sm mt-1">Review your tournament entry details</p>
          </div>

          <div className="bg-gray-50 rounded-[2rem] p-6 mb-8 border border-gray-100 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Tournament</span>
              <span className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{tournament.title}</span>
            </div>
            <div className="h-px bg-gray-200/50"></div>
            <div className="flex justify-between items-center text-gray-500 text-xs">
              <span>Host Proceeds</span>
              <span>${hostReceives}</span>
            </div>
            <div className="flex justify-between items-center text-gray-500 text-xs">
              <span>Platform Fee (10%)</span>
              <span>${platformFee}</span>
            </div>
            <div className="h-px bg-gray-200/50"></div>
            <div className="flex justify-between items-center py-1">
              <span className="text-sm font-black text-gray-900 uppercase tracking-tighter">Total Due</span>
              <span className="text-2xl font-black text-blue-600 tracking-tighter">${total.toFixed(2)}</span>
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-xs text-center border border-red-100 mb-6 italic">⚠️ {error}</div>}

          <div className="flex flex-col gap-3">
            <button
              onClick={handlePay}
              disabled={loading}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition shadow-xl disabled:bg-gray-300 active:scale-95 duration-75"
            >
              {loading ? 'Processing Transaction...' : `Pay $${total.toFixed(2)} Now`}
            </button>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl text-xs font-bold text-gray-400 hover:text-gray-600 transition"
            >
              Cancel and Return
            </button>
          </div>
        </div>
        <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
          <span className="text-[9px] font-bold text-gray-300 uppercase tracking-[.2em]">🔒 SSL Encrypted & Secure</span>
        </div>
      </div>
    </div>
  );
}
