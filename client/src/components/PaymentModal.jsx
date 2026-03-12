import { useState } from 'react';
import api from '../utils/api';

export default function PaymentModal({ tournament, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const platformFee = (tournament.entry_fee * 0.10).toFixed(2);
  const total = tournament.entry_fee;

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
    } catch (err) {
      setError(err.response?.data?.error || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Payment</h2>
        <div className="payment-details">
          <p><strong>Tournament:</strong> {tournament.title}</p>
          <p><strong>Entry Fee:</strong> ${total}</p>
          <p className="fee-breakdown">Platform Fee (10%): ${platformFee}</p>
          <p className="fee-breakdown">Host Receives: ${(total - platformFee).toFixed(2)}</p>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button onClick={handlePay} disabled={loading} className="btn btn-primary">
            {loading ? 'Processing...' : `Pay $${total}`}
          </button>
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}
