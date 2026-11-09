import React, { useState } from 'react';
import { X, ShieldAlert, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { submitReport } from '../services/firebase.ts';

interface ReportModalProps {
  isOpen: boolean;
  targetType: 'user' | 'group' | 'message' | 'review';
  targetId: string;
  targetName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  targetType,
  targetId,
  targetName,
  onClose,
  onSuccess
}) => {
  const { userProfile } = useAuth();
  const [reason, setReason] = useState('Hành vi không phù hợp / Thiếu tôn trọng');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !userProfile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Vui lòng cung cấp mô tả chi tiết lý do báo cáo.');
      return;
    }

    setLoading(true);
    try {
      await submitReport({
        reporterId: userProfile.id,
        reporterName: userProfile.displayName,
        targetType,
        targetId,
        targetName: targetName || 'Đối tượng',
        reason,
        description: description.trim()
      });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi gửi báo cáo.');
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
        <div className="bg-rose-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-200" />
            <div>
              <h3 className="font-bold text-base">Báo cáo vi phạm</h3>
              <p className="text-xs text-rose-100">Gửi phản ánh tới Ban Quản trị SkillSwap</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
            Đối tượng báo cáo: <strong className="text-slate-800">{targetName || targetId}</strong> ({targetType})
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lý do báo cáo <span className="text-rose-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-rose-500 outline-hidden bg-white"
            >
              <option value="Hành vi không phù hợp / Thiếu tôn trọng">Hành vi không phù hợp / Thiếu tôn trọng</option>
              <option value="Bỏ lịch học không báo trước">Bỏ lịch học không báo trước nhiều lần</option>
              <option value="Spam / Quảng cáo thương mại">Spam / Quảng cáo dịch vụ thương mại</option>
              <option value="Cung cấp thông tin kỹ năng sai sự thật">Cung cấp thông tin kỹ năng sai sự thật</option>
              <option value="Lý do khác">Lý do khác</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mô tả chi tiết vi phạm <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder="Vui lòng cung cấp chi tiết thời gian, nội dung vi phạm để Ban Quản trị xem xét và có biện pháp xử lý kịp thời..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-rose-500 outline-hidden"
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
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              {loading ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
