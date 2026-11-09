import React, { useState, useEffect } from 'react';
import { 
  Repeat, 
  Sparkles, 
  Check, 
  X, 
  Calendar, 
  MessageSquare, 
  Star, 
  ShieldAlert, 
  Clock, 
  CheckCircle,
  AlertCircle,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { 
  getPublicStudents, 
  getUserConnections, 
  updateConnectionStatus, 
  calculateCompatibilityScore,
  getOrCreateDirectConversation
} from '../services/firebase.ts';
import { UserProfile, Connection, ConnectionStatus } from '../types/index.ts';
import { ConnectModal } from '../components/ConnectModal.tsx';
import { ScheduleModal } from '../components/ScheduleModal.tsx';
import { ReviewModal } from '../components/ReviewModal.tsx';
import { ReportModal } from '../components/ReportModal.tsx';
import { fetchAIAgents, getAIMatchReasoning } from '../services/aiService.ts';
import { AIAgentProfile } from '../data/aiAgents.ts';

interface MatchPageProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
}

export const MatchPage: React.FC<MatchPageProps> = ({ onNavigate, onOpenAuth }) => {
  const { currentUser, userProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'recommendations' | 'received' | 'sent' | 'active'>('recommendations');
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // AI Reasoning state
  const [aiReasonings, setAiReasonings] = useState<Record<string, string>>({});
  const [loadingAiReason, setLoadingAiReason] = useState<Record<string, boolean>>({});

  // Modals
  const [targetStudentForConnect, setTargetStudentForConnect] = useState<UserProfile | null>(null);
  const [scheduleTarget, setScheduleTarget] = useState<{ connectionId: string; name: string; participants: string[]; skillName: string } | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ targetId: string; targetName: string; connectionId: string } | null>(null);
  const [reportTarget, setReportTarget] = useState<{ targetId: string; targetName: string } | null>(null);

  const loadData = async () => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [allStudents, userConns, aiData] = await Promise.all([
        getPublicStudents(),
        getUserConnections(currentUser.uid),
        fetchAIAgents().catch(() => ({ agents: [], demoModeActive: true, aiAutonomousMode: true, stats: { totalCalls: 0, estimatedTokens: 0, activeAgentsCount: 0 } }))
      ]);
      
      const realOthers = allStudents.filter(s => s.id !== currentUser.uid);
      const activeAi = (aiData.demoModeActive && aiData.agents) ? aiData.agents.filter(a => a.enabled) : [];
      setStudents([...realOthers, ...activeAi]);
      setConnections(userConns);
    } catch (err) {
      console.error('Match load error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAiReasoning = async (candidate: UserProfile) => {
    if (loadingAiReason[candidate.id] || aiReasonings[candidate.id]) return;
    setLoadingAiReason(prev => ({ ...prev, [candidate.id]: true }));
    try {
      const reason = await getAIMatchReasoning({
        userSkillsShare: (userProfile?.skillsToShare || []).map(s => s.name),
        userSkillsLearn: (userProfile?.skillsToLearn || []).map(s => s.name),
        aiId: candidate.id
      });
      setAiReasonings(prev => ({ ...prev, [candidate.id]: reason }));
    } catch (err) {
      console.error('AI reasoning error', err);
    } finally {
      setLoadingAiReason(prev => ({ ...prev, [candidate.id]: false }));
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.uid]);

  if (!currentUser || !userProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#3478C8] flex items-center justify-center mx-auto shadow-xs">
          <Repeat className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-[#173B65]">Hệ thống Ghép cặp Trao đổi Kỹ năng 1–1</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Vui lòng đăng nhập với tài khoản sinh viên UEH để trải nghiệm tính năng ghép cặp thông minh và quản lý các kết nối trao đổi.
        </p>
        <button
          onClick={() => onOpenAuth('login')}
          className="px-6 py-2.5 bg-[#3478C8] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md transition-all"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  // Calculate algorithm matches for current user
  const smartMatches = students.map(candidate => {
    const analysis = calculateCompatibilityScore(userProfile, candidate);
    return {
      candidate,
      ...analysis
    };
  }).sort((a, b) => b.score - a.score);

  // Group connections by tabs
  const receivedRequests = connections.filter(c => c.recipientId === currentUser.uid && c.status === 'pending');
  const sentRequests = connections.filter(c => c.requesterId === currentUser.uid && c.status === 'pending');
  const activeConnections = connections.filter(c => c.status !== 'pending' && c.status !== 'rejected');

  const handleUpdateStatus = async (connectionId: string, status: ConnectionStatus) => {
    setActionLoading(connectionId);
    try {
      await updateConnectionStatus(connectionId, status);
      await loadData();
    } catch (err) {
      console.error('Update status error', err);
      alert('Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartChat = async (partnerId: string) => {
    if (partnerId.startsWith('ai_')) {
      onNavigate('messages', { conversationId: `conv_${partnerId}` });
      return;
    }
    try {
      const convId = await getOrCreateDirectConversation(currentUser.uid, partnerId);
      onNavigate('messages', { conversationId: convId });
    } catch (err) {
      console.error('Chat start error', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173B65] tracking-tight">
              Ghép cặp Trao đổi Kỹ năng 1–1
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              Thuật toán thông minh
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quy trình: Kết nối → Lên lịch học → Trao đổi kỹ năng → Xác nhận hoàn thành → Đánh giá
          </p>
        </div>

        <button
          onClick={() => onNavigate('explore')}
          className="px-4 py-2 text-xs font-semibold text-[#3478C8] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
        >
          Khám phá thêm sinh viên →
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('recommendations')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'recommendations'
              ? 'bg-[#173B65] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-300" />
          Đề xuất phù hợp nhất ({smartMatches.length})
        </button>

        <button
          onClick={() => setActiveTab('received')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative ${
            activeTab === 'received'
              ? 'bg-[#173B65] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Lời mời đã nhận
          {receivedRequests.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">
              {receivedRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('sent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'sent'
              ? 'bg-[#173B65] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Lời mời đã gửi ({sentRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'active'
              ? 'bg-[#173B65] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Kết nối của tôi ({activeConnections.length})
        </button>
      </div>

      {/* TAB 1: SMART RECOMMENDATIONS */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50/70 border border-blue-200/70 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
            <Sparkles className="w-5 h-5 text-[#3478C8] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Thuật toán đối sánh kỹ năng hai chiều (Reciprocal Skill Matching)</p>
              <p className="text-blue-700 mt-0.5">
                Hệ thống ưu tiên xếp hạng cao những sinh viên có thể chia sẻ kỹ năng bạn đang cần, đồng thời mong muốn học những kỹ năng bạn đang sở hữu. Tích hợp phân tích lý do tương thích bằng mô hình AI.
              </p>
            </div>
          </div>

          {smartMatches.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center text-slate-500 text-xs">
              Chưa có sinh viên nào trong hệ thống. Hãy cập nhật kỹ năng cá nhân của bạn để nhận đề xuất tốt nhất!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {smartMatches.map(({ candidate, score, matchedGiveAndTake, reasons }) => {
                const isAI = candidate.id.startsWith('ai_');
                return (
                  <div
                    key={candidate.id}
                    className={`rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between border ${
                      isAI 
                        ? 'border-purple-200 bg-gradient-to-b from-white to-purple-50/30' 
                        : 'bg-white border-slate-200/80'
                    }`}
                  >
                    <div>
                      {/* Header Card */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={candidate.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(candidate.displayName)}`}
                            alt={candidate.displayName}
                            className={`w-12 h-12 rounded-2xl object-cover border ${isAI ? 'border-purple-300 ring-2 ring-purple-100' : 'border-slate-200'}`}
                          />
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-slate-800 text-sm">{candidate.displayName}</h3>
                              {isAI && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                  <Sparkles className="w-2.5 h-2.5 text-purple-600" /> AI mô phỏng
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">{candidate.major} • {candidate.cohort || 'UEH'}</p>
                          </div>
                        </div>

                        {/* Compatibility Badge */}
                        <div className="text-right shrink-0">
                          <span className={`inline-block px-2.5 py-1 rounded-xl text-xs font-black ${
                            score >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-[#3478C8]'
                          }`}>
                            {score}% Phù hợp
                          </span>
                        </div>
                      </div>

                      {/* Matched reasons */}
                      <div className="mb-3 space-y-1">
                        {reasons.map((r, i) => (
                          <p key={i} className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{r}</span>
                          </p>
                        ))}
                      </div>

                      {/* AI Dynamic Match Reasoning Button & Insight */}
                      {aiReasonings[candidate.id] ? (
                        <div className="mb-3 p-2.5 rounded-xl bg-purple-50/80 border border-purple-200 text-xs text-purple-900 space-y-1 animate-in fade-in">
                          <div className="flex items-center gap-1.5 font-bold text-purple-800 text-[11px]">
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            <span>Lý do phân tích từ Gemini AI:</span>
                          </div>
                          <p className="text-[11px] leading-relaxed italic">"{aiReasonings[candidate.id]}"</p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRequestAiReasoning(candidate)}
                          disabled={loadingAiReason[candidate.id]}
                          className="mb-3 w-full py-1.5 px-3 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/70 text-purple-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          {loadingAiReason[candidate.id] ? 'Đang phân tích...' : 'Xem phân tích tương thích AI'}
                        </button>
                      )}

                      {/* Skills offered vs wanted */}
                      <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Họ chia sẻ:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {candidate.skillsToShare.map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-medium text-[11px]">
                                {s.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Họ cần học:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {candidate.skillsToLearn.map((s, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-medium text-[11px]">
                                {s.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500">{candidate.learningPreferences || 'Online/Offline'}</span>
                      <div className="flex items-center gap-1.5">
                        {isAI ? (
                          <>
                            <button
                              onClick={() => onNavigate('messages', { conversationId: `conv_${candidate.id}` })}
                              className="px-2.5 py-1.5 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-xl transition-colors flex items-center gap-1"
                              title="Trò chuyện trực tiếp cùng sinh viên AI"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Chat AI
                            </button>
                            <button
                              onClick={() => setTargetStudentForConnect(candidate)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-2xs transition-all"
                            >
                              <Repeat className="w-3.5 h-3.5" />
                              Gửi lời mời
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setTargetStudentForConnect(candidate)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#3478C8] hover:bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-2xs transition-all"
                          >
                            <Repeat className="w-3.5 h-3.5" />
                            Gửi lời mời trao đổi
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RECEIVED REQUESTS */}
      {activeTab === 'received' && (
        <div className="space-y-4">
          {receivedRequests.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center text-slate-500 text-xs">
              Bạn chưa có lời mời kết nối nào đang chờ duyệt.
            </div>
          ) : (
            receivedRequests.map((conn) => (
              <div 
                key={conn.id}
                className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={conn.requesterPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(conn.requesterName)}`}
                    alt={conn.requesterName}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{conn.requesterName}</h3>
                    <p className="text-xs text-slate-500">{conn.requesterEmail}</p>
                    
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-medium">
                        Họ chia sẻ: <strong>{conn.requesterSkillOffered}</strong>
                      </span>
                      <span>⇄</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-medium">
                        Họ muốn học: <strong>{conn.requesterSkillWanted}</strong>
                      </span>
                    </div>

                    {conn.message && (
                      <p className="text-xs text-slate-600 italic mt-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                        "{conn.message}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    disabled={actionLoading === conn.id}
                    onClick={() => handleUpdateStatus(conn.id, 'rejected')}
                    className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                  <button
                    disabled={actionLoading === conn.id}
                    onClick={() => handleUpdateStatus(conn.id, 'connected')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    Chấp nhận trao đổi
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: SENT REQUESTS */}
      {activeTab === 'sent' && (
        <div className="space-y-4">
          {sentRequests.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center text-slate-500 text-xs">
              Bạn chưa gửi lời mời kết nối nào. Hãy tìm kiếm sinh viên và gửi lời mời trao đổi!
            </div>
          ) : (
            sentRequests.map((conn) => (
              <div 
                key={conn.id}
                className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={conn.recipientPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(conn.recipientName)}`}
                    alt={conn.recipientName}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-sm">{conn.recipientName}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                        Đang chờ phản hồi
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{conn.recipientEmail}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-medium">
                        Bạn chia sẻ: <strong>{conn.requesterSkillOffered}</strong>
                      </span>
                      <span>⇄</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-medium">
                        Bạn muốn học: <strong>{conn.requesterSkillWanted}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  disabled={actionLoading === conn.id}
                  onClick={() => handleUpdateStatus(conn.id, 'cancelled')}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition-colors self-end sm:self-center"
                >
                  Hủy lời mời
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: ACTIVE & COMPLETED CONNECTIONS */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeConnections.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center text-slate-500 text-xs">
              Bạn chưa có kết nối đang hoạt động nào.
            </div>
          ) : (
            activeConnections.map((conn) => {
              const isRequester = conn.requesterId === currentUser.uid;
              const partnerId = isRequester ? conn.recipientId : conn.requesterId;
              const partnerName = isRequester ? conn.recipientName : conn.requesterName;
              const partnerEmail = isRequester ? conn.recipientEmail : conn.requesterEmail;
              const partnerPhoto = isRequester ? conn.recipientPhoto : conn.requesterPhoto;

              return (
                <div 
                  key={conn.id}
                  className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={partnerPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(partnerName)}`}
                      alt={partnerName}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-base">{partnerName}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          conn.status === 'completed' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-blue-100 text-[#3478C8]'
                        }`}>
                          {conn.status === 'completed' ? 'Đã hoàn thành' : 'Đang kết nối'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{partnerEmail}</p>

                      <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                        <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-medium">
                          Kỹ năng trao đổi: <strong>{conn.requesterSkillOffered}</strong> & <strong>{conn.requesterSkillWanted}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions according to step rules: Schedule -> Chat -> Complete -> Review -> Report */}
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                    <button
                      onClick={() => handleStartChat(partnerId)}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      <MessageSquare className="w-4 h-4 text-slate-500" />
                      Nhắn tin
                    </button>

                    <button
                      onClick={() => setScheduleTarget({
                        connectionId: conn.id,
                        name: partnerName,
                        participants: [conn.requesterId, conn.recipientId],
                        skillName: `${conn.requesterSkillOffered} / ${conn.requesterSkillWanted}`
                      })}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#3478C8] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                    >
                      <Calendar className="w-4 h-4" />
                      Lên lịch học
                    </button>

                    {conn.status !== 'completed' ? (
                      <button
                        disabled={actionLoading === conn.id}
                        onClick={() => handleUpdateStatus(conn.id, 'completed')}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Xác nhận hoàn thành
                      </button>
                    ) : (
                      <button
                        onClick={() => setReviewTarget({
                          targetId: partnerId,
                          targetName: partnerName,
                          connectionId: conn.id
                        })}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"
                      >
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        Đánh giá đối tác
                      </button>
                    )}

                    <button
                      onClick={() => setReportTarget({
                        targetId: partnerId,
                        targetName: partnerName
                      })}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Báo cáo vi phạm"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Connect Modal */}
      {targetStudentForConnect && (
        <ConnectModal
          isOpen={Boolean(targetStudentForConnect)}
          targetUser={targetStudentForConnect}
          onClose={() => setTargetStudentForConnect(null)}
          onSuccess={() => {
            loadData();
          }}
          onNavigate={onNavigate}
        />
      )}

      {/* Schedule Modal */}
      {scheduleTarget && (
        <ScheduleModal
          isOpen={Boolean(scheduleTarget)}
          type="1-on-1"
          targetId={scheduleTarget.connectionId}
          targetName={scheduleTarget.name}
          skillName={scheduleTarget.skillName}
          participants={scheduleTarget.participants}
          onClose={() => setScheduleTarget(null)}
          onSuccess={() => {
            alert('Lịch học trao đổi đã được tạo thành công!');
          }}
        />
      )}

      {/* Review Modal */}
      {reviewTarget && (
        <ReviewModal
          isOpen={Boolean(reviewTarget)}
          targetType="user"
          targetId={reviewTarget.targetId}
          targetName={reviewTarget.targetName}
          connectionId={reviewTarget.connectionId}
          onClose={() => setReviewTarget(null)}
          onSuccess={() => {
            alert('Cảm ơn bạn đã gửi đánh giá trải nghiệm trao đổi!');
          }}
        />
      )}

      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          isOpen={Boolean(reportTarget)}
          targetType="user"
          targetId={reportTarget.targetId}
          targetName={reportTarget.targetName}
          onClose={() => setReportTarget(null)}
          onSuccess={() => {
            alert('Báo cáo của bạn đã được gửi tới Ban Quản trị để giải quyết.');
          }}
        />
      )}

    </div>
  );
};
