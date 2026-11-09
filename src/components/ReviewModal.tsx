import React, { useState } from 'react';
import { X, Star, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { createReview } from '../services/firebase.ts';

interface ReviewModalProps {
  isOpen: boolean;
  targetType: 'user' | 'group';
  targetId: string;
  targetName: string;
  connectionId?: string;
  groupId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  targetType,
  targetId,
  targetName,
  connectionId,
  groupId,
  onClose,
  onSuccess
}) => {
  const { userProfile } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !userProfile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Vui lòng viết đôi lời nhận xét về trải nghiệm trao đổi kỹ năng.');
      return;
    }

    setLoading(true);
    try {
      await createReview({
        targetType,
        targetId,
        targetName,
        reviewerId: userProfile.id,
        reviewerName: userProfile.displayName,
        reviewerPhoto: userProfile.photoURL,
        connectionId,
        groupId,
        rating,
        comment: comment.trim()
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi gửi đánh giá.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#173B65] to-[#3478C8] p-5 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">Đánh giá & Nhận xét</h3>
            <p className="text-xs text-blue-100">Dành cho {targetName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Rating Stars */}
          <div className="text-center py-2">
            <label className="block text-xs font-semibold text-slate-600 mb-2">Mức độ hài lòng của bạn</label>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 text-amber-400 hover:scale-110 transition-transform"
                >
                  <Star 
                    className={`w-8 h-8 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} 
                  />
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-slate-700 mt-2">
              {rating === 5 && '🌟 Xuất sắc, rất tận tâm và hữu ích!'}
              {rating === 4 && '👍 Rất tốt, chia sẻ dễ hiểu.'}
              {rating === 3 && '👌 Tạm ổn, đúng kế hoạch.'}
              {rating === 2 && '😐 Cần cải thiện thêm sự chuẩn bị.'}
              {rating === 1 && '👎 Chưa đạt kỳ vọng.'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nhận xét chi tiết <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Chia sẻ về sự nhiệt tình, phương pháp hướng dẫn hoặc điểm bạn tâm đắc nhất trong buổi trao đổi..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#3478C8] hover:bg-blue-600 rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              {loading ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
