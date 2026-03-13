import React, { useState, useEffect } from 'react';
import { getReviews, addReview } from '../api';

interface Review {
  id: number;
  author: string;
  comment: string;
  rating?: number;
  created_at?: string;
}

export default function ReviewSection({ tournamentId }: { tournamentId: number | string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [author, setAuthor] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const res = await getReviews(Number(tournamentId));
      setReviews(Array.isArray(res.data) ? res.data : res.data.reviews || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, [tournamentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !comment.trim()) return;
    setError('');
    try {
      await addReview(Number(tournamentId), {
        author: author.trim(),
        comment: comment.trim(),
        rating: rating ? Number(rating) : undefined,
      });
      setAuthor('');
      setComment('');
      setRating('');
      await fetchReviews();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    }
  };

  if (loading) return <div className="text-center py-10 text-gray-500 italic">Retreiving comments...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Reviews & Feedback</h3>
        <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full">{reviews.length} Comments</span>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Your name"
            className="flex-1 bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 outline-none transition"
            value={author}
            onChange={e => setAuthor(e.target.value)}
            required
          />
          <select
            className="bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:border-blue-500 outline-none transition"
            value={rating}
            onChange={e => setRating(e.target.value)}
          >
            <option value="">Rating (optional)</option>
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} ★</option>)}
          </select>
        </div>
        <textarea
          placeholder="Share your thoughts on this tournament..."
          className="w-full bg-gray-50 border border-transparent rounded-2xl px-4 py-3 text-sm focus:bg-white focus:border-blue-500 outline-none transition"
          value={comment}
          onChange={e => setComment(e.target.value)}
          required
          rows={3}
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold hover:bg-blue-700 transition shadow-md"
        >
          Post Comment
        </button>
        {error && <p className="text-xs text-red-500 font-bold text-center mt-2">⚠️ {error}</p>}
      </form>

      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed text-gray-400 text-sm">No reviews yet. Be the first to share your experience!</div>
      ) : (
        <div className="grid gap-4">
          {reviews.map(r => (
            <div key={r.id} className="bg-white p-5 rounded-2xl border border-gray-50 shadow-sm hover:shadow-md transition group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-gray-900">{r.author}</span>
                  <span className="text-[10px] text-gray-400 font-medium">{r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recent'}</span>
                </div>
                {r.rating && (
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n} className={n <= r.rating! ? 'text-yellow-400 text-xs' : 'text-gray-200 text-xs'}>★</span>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
