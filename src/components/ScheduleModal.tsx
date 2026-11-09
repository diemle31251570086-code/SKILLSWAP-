import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  AlertCircle, 
  Sparkles, 
  Bot, 
  Check, 
  CheckCircle2 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { createSchedule, sendNotification } from '../services/firebase.ts';
import { ScheduleItem } from '../types/index.ts';
import { requestAITrialScheduleNegotiation } from '../services/aiService.ts';

interface ScheduleModalProps {
  isOpen: boolean;
  type: '1-on-1' | 'group';
  targetId: string; // connectionId or groupId
  targetName: string;
  skillName?: string;
  participants: string[];
  initialData?: Partial<ScheduleItem>;
  isTrialDefault?: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  type,
  targetId,
  targetName,
  skillName = 'Trao đổi kỹ năng',
  participants,
  initialData,
  isTrialDefault = false,
  onClose,
  onSuccess
}) => {
  const { userProfile } = useAuth();
  
  // Default helper for next day
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const [isTrialSession, setIsTrialSession] = useState(isTrialDefault || Boolean(initialData?.notes?.includes('thử nghiệm')));
  const [title, setTitle] = useState(
    initialData?.title || (isTrialDefault ? `Buổi học thử nghiệm: ${skillName}` : `Buổi trao đổi: ${skillName}`)
  );
  const [date, setDate] = useState(initialData?.date || tomorrowStr);
  const [startTime, setStartTime] = useState(initialData?.startTime || '19:30');
  const [endTime, setEndTime] = useState(initialData?.endTime || '20:30');
  const [mode, setMode] = useState<'online' | 'offline' | 'hybrid'>(initialData?.mode || 'online');
  const [locationOrLink, setLocationOrLink] = useState(initialData?.locationOrLink || 'Google Meet (SkillSwap)');
  const [notes, setNotes] = useState(initialData?.notes || (isTrialDefault ? 'Buổi học thử nghiệm 45–60 phút: Làm quen, test trình độ & thống nhất lộ trình' : ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  if (!isOpen || !userProfile) return null;

  // Check if any participant is an AI student
  const aiParticipantId = participants.find(p => p.startsWith('ai_'));

  const applySlot = (slotDate: string, start: string, end: string, slotMode: 'online' | 'offline' | 'hybrid') => {
    setDate(slotDate);
    setStartTime(start);
    setEndTime(end);
    setMode(slotMode);
    if (slotMode === 'offline') {
      setLocationOrLink('Cơ sở UEH Mekong (Phòng tự học / Thư viện)');
    } else {
      setLocationOrLink('Google Meet (SkillSwap Room)');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      setError('Vui lòng chọn ngày diễn ra buổi học.');
      return;
    }

    setLoading(true);
    setError(null);
    setAiFeedback(null);

    try {
      // If an AI participant is involved, negotiate and get immediate AI confirmation
      if (aiParticipantId) {
        try {
          const negRes = await requestAITrialScheduleNegotiation({
            aiId: aiParticipantId,
            userProposal: {
              date,
              startTime,
              endTime,
              mode,
              notes
            },
            trialType: type,
            skillName,
            senderName: userProfile.displayName
          });

          setAiFeedback(negRes.aiResponse);
        } catch (negErr) {
          console.warn('AI negotiation call skipped, saving schedule directly', negErr);
        }
      }

      await createSchedule({
        type,
        title: title.trim(),
        skillName,
        participants: Array.from(new Set([...participants, userProfile.id])),
        connectionId: type === '1-on-1' ? targetId : undefined,
        groupId: type === 'group' ? targetId : undefined,
        date,
        startTime,
        endTime,
        mode,
        locationOrLink: locationOrLink.trim(),
        notes: `${isTrialSession ? '[Buổi học thử nghiệm] ' : ''}${notes.trim()}`,
        status: 'confirmed',
        createdBy: userProfile.id
      });

      // Send notifications to other participants
      for (const pId of participants) {
        if (pId !== userProfile.id && !pId.startsWith('ai_')) {
          await sendNotification({
            userId: pId,
            title: isTrialSession ? '📅 Lịch học thử nghiệm mới!' : '📅 Lịch trao đổi kỹ năng mới!',
            message: `${userProfile.displayName} đã lên lịch cho "${title}" vào ${date} (${startTime} - ${endTime}).`,
            type: 'schedule_proposed',
            link: '/schedule'
          });
        }
      }

      onSuccess?.();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Có lỗi xảy ra khi tạo lịch học.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-[#173B65] to-[#3478C8] p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">
                  {isTrialSession ? 'Lên lịch Buổi học thử nghiệm (Trial)' : 'Lên lịch trao đổi kỹ năng'}
                </h3>
                {isTrialSession && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-slate-900">
                    Học thử 1 buổi
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-100">{type === '1-on-1' ? 'Cùng' : 'Nhóm'}: {targetName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {aiFeedback && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Sinh viên AI đã xác nhận buổi học!</p>
                <p className="italic text-emerald-800 mt-0.5">"{aiFeedback}"</p>
              </div>
            </div>
          )}

          {/* Trial Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/70 border border-blue-200/70">
            <div>
              <span className="font-bold text-xs text-slate-800 block">Đặt lịch học thử nghiệm (Trial Session)</span>
              <span className="text-[11px] text-slate-500">Giúp hai bên làm quen, test trình độ và thống nhất phương pháp trước khi học dài hạn</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !isTrialSession;
                setIsTrialSession(next);
                if (next && !title.includes('thử nghiệm')) {
                  setTitle(`Buổi học thử nghiệm: ${skillName}`);
                }
              }}
              className={`w-12 h-6 rounded-full transition-colors relative ${isTrialSession ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${isTrialSession ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Quick slot chips */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Gợi ý khung giờ nhanh (Quick Slots)
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 1);
                  applySlot(d.toISOString().split('T')[0], '19:30', '20:30', 'online');
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 text-slate-700 text-[11px] font-semibold"
              >
                Tối mai 19:30 (Online)
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 3);
                  applySlot(d.toISOString().split('T')[0], '19:00', '20:30', 'online');
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 text-slate-700 text-[11px] font-semibold"
              >
                3 ngày tới 19:00 (Online)
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + (6 - d.getDay() + 7) % 7 || 7);
                  applySlot(d.toISOString().split('T')[0], '09:00', '10:30', 'offline');
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 text-slate-700 text-[11px] font-semibold"
              >
                Thứ 7 tuần này 09:00 (Tại trường)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề buổi trao đổi</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden text-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ngày học</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Giờ bắt đầu</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden bg-white text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Giờ kết thúc</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden bg-white text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hình thức học</label>
              <select
                value={mode}
                onChange={(e: any) => setMode(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden bg-white text-slate-800"
              >
                <option value="online">Trực tuyến (Online qua Google Meet)</option>
                <option value="offline">Trực tiếp tại Cơ sở UEH Mekong</option>
                <option value="hybrid">Kết hợp linh hoạt (Hybrid)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Địa điểm hoặc Link học</label>
              <input
                type="text"
                required
                placeholder="VD: Thư viện UEH Mekong / Link Google Meet..."
                value={locationOrLink}
                onChange={(e) => setLocationOrLink(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung dự kiến & Chuẩn bị</label>
            <textarea
              rows={2}
              placeholder="VD: Mang laptop có sẵn dữ liệu thực hành hoặc chuẩn bị các thắc mắc cần giải đáp..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden text-slate-800"
            />
          </div>

          {aiParticipantId && (
            <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900 flex items-center gap-2">
              <Bot className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Buổi học có sự tham gia của Sinh viên AI – Lịch sẽ được xác nhận và đối chiếu tức thì qua Gemini.</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#3478C8] hover:bg-blue-600 rounded-xl shadow-xs transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Đang lưu lịch...' : 'Xác nhận lên lịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
