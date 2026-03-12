import { useState, useEffect } from 'react';
import { listReviews, addReview } from '../utils/api';

export default function ReviewSection({ tournamentId }) {
  const [reviews, setReviews] = useState([]);
  const [author, setAuthor] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const data = await listReviews(tournamentId);
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [tournamentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!author.trim() || !comment.trim()) return;
    setError('');
    try {
      await addReview(tournamentId, {
        author: author.trim(),
        comment: comment.trim(),
        rating: rating ? Number(rating) : undefined,
      });
      setAuthor('');
      setComment('');
      setRating('');
      await fetchReviews();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <p>Loading reviews…</p>;

  return (
    <div className="review-section">
      <h3>Reviews &amp; Comments</h3>
      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSubmit} className="review-form">
        <input type="text" placeholder="Your name" value={author} onChange={e => setAuthor(e.target.value)} required />
        <select value={rating} onChange={e => setRating(e.target.value)}>
          <option value="">Rating (optional)</option>
          {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} ★</option>)}
        </select>
        <textarea placeholder="Write your review…" value={comment} onChange={e => setComment(e.target.value)} required rows="2" />
        <button type="submit">Post Review</button>
      </form>

      {reviews.length === 0 ? (
        <p className="empty">No reviews yet.</p>
      ) : (
        <div className="review-list">
          {reviews.map(r => (
            <div key={r.id} className="review-card">
              <div className="review-header">
                <strong>{r.author}</strong>
                {r.rating && <span className="review-rating">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>}
                <span className="review-date">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
              </div>
              <p className="review-comment">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
