import React, { useState } from 'react';
import { 
  X, 
  Repeat, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Sparkles, 
  Bot, 
  Calendar, 
  Clock, 
  MapPin, 
  Check, 
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { 
  createConnectionRequest, 
  createSchedule, 
  getOrCreateDirectConversation, 
  sendMessage, 
  sendNotification 
} from '../services/firebase.ts';
import { UserProfile } from '../types/index.ts';
import { 
  requestAIInvitationDecision, 
  AIInvitationDecisionResult, 
  ProposedTrialSlot 
} from '../services/aiService.ts';

interface ConnectModalProps {
  isOpen: boolean;
  targetUser: (UserProfile & { isAI?: boolean }) | null;
  onClose: () => void;
  onSuccess?: () => void;
  onNavigate?: (page: string, params?: any) => void;
}

export const ConnectModal: React.FC<ConnectModalProps> = ({
  isOpen,
  targetUser,
  onClose,
  onSuccess,
  onNavigate
}) => {
  const { userProfile } = useAuth();
  const [skillOffered, setSkillOffered] = useState('');
  const [skillWanted, setSkillWanted] = useState('');
  const [customOffered, setCustomOffered] = useState('');
  const [customWanted, setCustomWanted] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Decision & Trial Schedule States
  const [aiDecision, setAiDecision] = useState<AIInvitationDecisionResult | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [trialBookedSuccess, setTrialBookedSuccess] = useState(false);

  if (!isOpen || !targetUser || !userProfile) return null;

  const isTargetAI = targetUser.id.startsWith('ai_') || targetUser.isAI;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalOffered = skillOffered === '__custom__' ? customOffered.trim() : skillOffered;
    const finalWanted = skillWanted === '__custom__' ? customWanted.trim() : skillWanted;

    if (!finalOffered) {
      setError('Vui lòng chọn hoặc nhập kỹ năng bạn có thể chia sẻ.');
      return;
    }
    if (!finalWanted) {
      setError('Vui lòng chọn hoặc nhập kỹ năng bạn mong muốn học.');
      return;
    }

    setLoading(true);

    try {
      if (isTargetAI) {
        // INSTANT AI DECISION ENGINE VIA GEMINI API
        const decisionRes = await requestAIInvitationDecision({
          aiId: targetUser.id,
          requester: userProfile,
          offeredSkill: finalOffered,
          wantedSkill: finalWanted,
          message: message.trim() || undefined,
          demoMode: true
        });

        setAiDecision(decisionRes);

        if (decisionRes.decision === 'accept') {
          // 1. Create connection in Firestore as active 'connected'
          const connId = await createConnectionRequest({
            requester: userProfile,
            recipient: targetUser,
            requesterSkillOffered: finalOffered,
            requesterSkillWanted: finalWanted,
            message: message.trim() || undefined,
            initialStatus: 'connected'
          });

          // 2. Setup direct conversation and send initial welcoming message from AI
          try {
            const convId = await getOrCreateDirectConversation(userProfile.id, targetUser.id);
            if (decisionRes.initialChatMessage) {
              await sendMessage({
                conversationId: convId,
                senderId: targetUser.id,
                senderName: `${targetUser.displayName} (Sinh viên AI)`,
                senderPhoto: targetUser.photoURL,
                text: `${decisionRes.initialChatMessage}\n\n${decisionRes.counterQuestions?.[0] ? `*Câu hỏi nhỏ:* ${decisionRes.counterQuestions[0]}` : ''}`
              });
            }
          } catch (convErr) {
            console.warn('Could not auto-send initial message', convErr);
          }

          // 3. Notify user
          await sendNotification({
            userId: userProfile.id,
            title: '🎉 Lời mời trao đổi đã được chấp nhận!',
            message: `${targetUser.displayName} (AI) đã đồng ý kết nối học tập môn "${finalWanted}" cùng bạn.`,
            type: 'connection_accepted',
            link: '/connections'
          });
        }
      } else {
        // Real human student connection request
        await createConnectionRequest({
          requester: userProfile,
          recipient: targetUser,
          requesterSkillOffered: finalOffered,
          requesterSkillWanted: finalWanted,
          message: message.trim() || undefined
        });
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi lời mời kết nối, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTrialSlot = async () => {
    if (!aiDecision || !aiDecision.proposedTrialSlots || aiDecision.proposedTrialSlots.length === 0) return;
    const slot = aiDecision.proposedTrialSlots[selectedSlotIndex];
    if (!slot) return;

    setBookingLoading(true);
    try {
      const finalWanted = skillWanted === '__custom__' ? customWanted.trim() : skillWanted;
      await createSchedule({
        type: '1-on-1',
        title: `Buổi học thử nghiệm: ${finalWanted}`,
        skillName: finalWanted,
        participants: [userProfile.id, targetUser.id],
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        mode: slot.mode,
        locationOrLink: slot.locationOrLink,
        notes: slot.agenda || 'Buổi học thử nghiệm trao đổi kỹ năng UEH Mekong',
        status: 'confirmed',
        createdBy: userProfile.id
      });

      setTrialBookedSuccess(true);
      await sendNotification({
        userId: userProfile.id,
        title: '✅ Đã xác nhận Lịch học thử nghiệm!',
        message: `Buổi học thử "${finalWanted}" cùng ${targetUser.displayName} vào ngày ${slot.date} (${slot.startTime} - ${slot.endTime}) đã được tạo.`,
        type: 'schedule_confirmed',
        link: '/schedule'
      });
      onSuccess?.();
    } catch (err: any) {
      setError(err?.message || 'Không thể lưu lịch học thử.');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#173B65] to-[#3478C8] p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              {isTargetAI ? <Bot className="w-5 h-5 text-emerald-300" /> : <Repeat className="w-5 h-5 text-emerald-300" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Gửi lời mời trao đổi kỹ năng 1–1</h3>
                {isTargetAI && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-400/30 text-emerald-300 border border-emerald-300/30">
                    Phản hồi AI tức thì
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-100">Kết nối cùng bạn {targetUser.displayName}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1">
          {/* AI Decision Result View */}
          {aiDecision ? (
            <div className="p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2">
              {aiDecision.decision === 'accept' ? (
                <>
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-sm">Lời mời đã được chấp thuận ngay lập tức!</p>
                      <p className="text-xs leading-relaxed text-emerald-800">
                        "{aiDecision.reason}"
                      </p>
                    </div>
                  </div>

                  {aiDecision.counterQuestions && aiDecision.counterQuestions.length > 0 && (
                    <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs text-blue-900 space-y-1">
                      <p className="font-bold text-blue-950 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-[#3478C8]" />
                        Câu hỏi thăm dò từ {targetUser.displayName}:
                      </p>
                      <p className="italic text-slate-700">"{aiDecision.counterQuestions[0]}"</p>
                    </div>
                  )}

                  {/* Proposed Trial Slots Section */}
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#3478C8]" />
                        Đề xuất Lịch học thử nghiệm (Trial Lesson)
                      </h4>
                      <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-full">
                        AI đề xuất theo lịch rảnh
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Chọn khung giờ bạn thuận tiện nhất để tự động lên lịch học thử nghiệm cùng bạn ấy:
                    </p>

                    <div className="space-y-2.5">
                      {(aiDecision.proposedTrialSlots || []).map((slot, idx) => {
                        const isSelected = selectedSlotIndex === idx;
                        return (
                          <div
                            key={idx}
                            onClick={() => setSelectedSlotIndex(idx)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-blue-50/80 border-[#3478C8] shadow-xs' 
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-[#3478C8]" />
                                {slot.date} ({slot.startTime} - {slot.endTime})
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-700 uppercase">
                                {slot.mode}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {slot.locationOrLink}
                            </p>
                            {slot.agenda && (
                              <p className="text-[11px] text-slate-500 italic mt-1 bg-white/70 p-2 rounded-xl border border-slate-100">
                                Nội dung: {slot.agenda}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {trialBookedSuccess ? (
                      <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-2xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-700" />
                        Lịch học thử nghiệm đã được xác nhận và đồng bộ vào lịch cá nhân!
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConfirmTrialSlot}
                        disabled={bookingLoading}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        {bookingLoading ? 'Đang xác nhận lịch...' : 'Xác nhận Lịch học thử này'}
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigate?.('messages');
                      }}
                      className="text-xs font-bold text-[#3478C8] hover:underline flex items-center gap-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Vào Hộp thư trò chuyện
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSuccess?.();
                      }}
                      className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl"
                    >
                      Hoàn tất
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                    <p className="font-bold text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Phản hồi từ {targetUser.displayName}:
                    </p>
                    <p className="text-xs leading-relaxed text-amber-800">
                      "{aiDecision.reason}"
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Trong chế độ Demo, bạn có thể thử gửi lại lời mời với các kỹ năng khác thuộc chuyên ngành của bạn ấy hoặc kết nối với các bạn học AI khác trong danh sách!
                  </p>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setAiDecision(null)}
                      className="px-4 py-2 bg-[#3478C8] text-white text-xs font-bold rounded-xl"
                    >
                      Thử kỹ năng khác
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Target User Summary Bar */}
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex items-center gap-3">
                <img
                  src={targetUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(targetUser.displayName)}`}
                  alt={targetUser.displayName}
                  className="w-11 h-11 rounded-full object-cover border border-slate-200"
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{targetUser.displayName}</h4>
                  <p className="text-xs text-slate-500">{targetUser.major} • {targetUser.cohort || 'UEH'}</p>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                    Thời gian có thể học: {targetUser.availableTime || targetUser.learningPreferences || 'Linh hoạt'}
                  </p>
                </div>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Skill Offered */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Kỹ năng bạn muốn chia sẻ cho {targetUser.displayName} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={skillOffered}
                    onChange={(e) => setSkillOffered(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden bg-white text-slate-800"
                  >
                    <option value="">-- Chọn từ kỹ năng bạn đã lưu trong hồ sơ --</option>
                    {userProfile.skillsToShare.map((s, idx) => (
                      <option key={idx} value={s.name}>
                        {s.name} ({s.level})
                      </option>
                    ))}
                    <option value="__custom__">+ Nhập kỹ năng khác...</option>
                  </select>
                  {skillOffered === '__custom__' && (
                    <input
                      type="text"
                      placeholder="Nhập tên kỹ năng (VD: Excel Dashboard, Thiết kế Canva...)"
                      value={customOffered}
                      onChange={(e) => setCustomOffered(e.target.value)}
                      className="w-full mt-2 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden text-slate-800"
                    />
                  )}
                </div>

                {/* Skill Wanted */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Kỹ năng bạn muốn học hỏi từ {targetUser.displayName} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={skillWanted}
                    onChange={(e) => setSkillWanted(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden bg-white text-slate-800"
                  >
                    <option value="">-- Chọn từ kỹ năng bạn {targetUser.displayName} có thể chia sẻ --</option>
                    {targetUser.skillsToShare.map((s, idx) => (
                      <option key={idx} value={s.name}>
                        {s.name} ({s.level})
                      </option>
                    ))}
                    <option value="__custom__">+ Yêu cầu kỹ năng khác...</option>
                  </select>
                  {skillWanted === '__custom__' && (
                    <input
                      type="text"
                      placeholder="Nhập tên kỹ năng bạn muốn bạn ấy hướng dẫn..."
                      value={customWanted}
                      onChange={(e) => setCustomWanted(e.target.value)}
                      className="w-full mt-2 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden text-slate-800"
                    />
                  )}
                </div>

                {/* Message Proposal */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Lời nhắn trao đổi & Thời gian bạn rảnh
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ví dụ: Chào bạn, mình muốn học hỏi thêm về kỹ năng này. Mình có thể chia sẻ lại cho bạn về chuyên ngành của mình. Chúng mình kết nối nhé!"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden text-slate-800"
                  />
                </div>

                {isTargetAI && (
                  <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Đánh giá và phản hồi tự động bởi AI Student Agent</p>
                      <p className="text-[11px] text-purple-700 mt-0.5">
                        Sinh viên AI sẽ đọc hồ sơ của bạn, đánh giá độ phù hợp và phản hồi ngay lập tức kèm đề xuất lịch học thử nghiệm.
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#3478C8] hover:bg-blue-600 rounded-xl shadow-xs transition-all disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {loading ? (isTargetAI ? 'AI đang phân tích & phản hồi...' : 'Đang gửi...') : (isTargetAI ? 'Gửi lời mời & Nhận phản hồi ngay' : 'Gửi lời mời')}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
