import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MapPin, 
  Calendar, 
  MessageSquare, 
  Shield, 
  Lock, 
  Globe, 
  Plus, 
  Send, 
  LogOut, 
  Check, 
  X, 
  Clock, 
  Star, 
  ShieldAlert,
  ArrowLeft,
  Bot,
  Sparkles,
  UserPlus,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { 
  getGroupById, 
  getGroupMembers, 
  joinGroupTransaction, 
  leaveGroupTransaction,
  requestJoinPrivateGroup,
  getGroupJoinRequests,
  approveJoinRequestTransaction,
  getOrCreateGroupConversation,
  subscribeToMessages,
  sendMessage,
  getUserSchedules,
  getPublicStudents,
  sendNotification
} from '../services/firebase.ts';
import { StudyGroup, GroupMember, GroupJoinRequest, MessageItem, ScheduleItem, UserProfile } from '../types/index.ts';
import { ScheduleModal } from '../components/ScheduleModal.tsx';
import { ReviewModal } from '../components/ReviewModal.tsx';
import { ReportModal } from '../components/ReportModal.tsx';
import { AI_STUDENT_AGENTS, AIAgentProfile } from '../data/aiAgents.ts';
import { requestAIGroupContribution, requestAIGroupInviteDecision, AIGroupInviteDecisionResult } from '../services/aiService.ts';

interface GroupDetailPageProps {
  groupId: string;
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
}

export const GroupDetailPage: React.FC<GroupDetailPageProps> = ({ groupId, onNavigate, onOpenAuth }) => {
  const { currentUser, userProfile } = useAuth();

  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  
  // AI Group Mentor states
  const [isAiContributing, setIsAiContributing] = useState(false);
  
  // Multi-Invite Modal States
  const [isMultiInviteOpen, setIsMultiInviteOpen] = useState(false);
  const [availableCandidates, setAvailableCandidates] = useState<(UserProfile & { isAI?: boolean })[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResults, setInviteResults] = useState<{ name: string; isAI: boolean; accepted: boolean; reason: string }[]>([]);

  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'chat' | 'schedules'>('info');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [joinMsg, setJoinMsg] = useState('');
  const [showRequestInput, setShowRequestInput] = useState(false);

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const g = await getGroupById(groupId);
      setGroup(g);
      if (g) {
        const mems = await getGroupMembers(groupId);
        setMembers(mems);

        // If owner, fetch join requests
        if (currentUser?.uid === g.ownerId) {
          const reqs = await getGroupJoinRequests(groupId);
          setJoinRequests(reqs.filter((r: GroupJoinRequest) => r.status === 'pending'));
        }

        // Fetch group schedules
        if (currentUser?.uid) {
          const sc = await getUserSchedules(currentUser.uid);
          setSchedules(sc.filter((s: ScheduleItem) => s.groupId === groupId));
        }

        // Setup group conversation
        if (currentUser?.uid) {
          const isMember = mems.some((m: GroupMember) => m.userId === currentUser.uid);
          if (isMember) {
            const cId = await getOrCreateGroupConversation(groupId, mems.map((m: GroupMember) => m.userId));
            setConversationId(cId);
          }
        }
      }
    } catch (err) {
      console.error('Group detail error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [groupId, currentUser?.uid]);

  // Subscribe to real-time chat messages
  useEffect(() => {
    if (!conversationId) return;
    const unsub = subscribeToMessages(conversationId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [conversationId]);

  // Load candidate students for multi-invite
  const handleOpenMultiInvite = async () => {
    setIsMultiInviteOpen(true);
    setSelectedCandidateIds([]);
    setInviteResults([]);
    try {
      const allReal = await getPublicStudents();
      const currentMemberIds = new Set(members.map(m => m.userId));
      
      const realCandidates = allReal
        .filter(s => !currentMemberIds.has(s.id) && s.id !== currentUser?.uid)
        .map(s => ({ ...s, isAI: false }));

      const aiCandidates = AI_STUDENT_AGENTS
        .filter(a => !currentMemberIds.has(a.id) && a.enabled)
        .map(a => ({ ...a, isAI: true }));

      setAvailableCandidates([...aiCandidates, ...realCandidates]);
    } catch (err) {
      console.error('Error loading invite candidates', err);
    }
  };

  const toggleSelectCandidate = (id: string) => {
    setSelectedCandidateIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSendMultiInvites = async () => {
    if (!group || selectedCandidateIds.length === 0) return;
    setInviteLoading(true);
    setInviteResults([]);

    const results: { name: string; isAI: boolean; accepted: boolean; reason: string }[] = [];

    for (const candId of selectedCandidateIds) {
      const candidate = availableCandidates.find(c => c.id === candId);
      if (!candidate) continue;

      if (candidate.isAI) {
        // CALL AI DECISION ENGINE VIA GEMINI API
        try {
          const decisionRes = await requestAIGroupInviteDecision({
            aiId: candidate.id,
            group,
            membersCount: members.length + results.filter(r => r.accepted).length,
            senderName: userProfile?.displayName || 'Chủ nhóm',
            demoMode: true
          });

          if (decisionRes.decision === 'accept') {
            // Join group via atomic transaction
            await joinGroupTransaction(group.id, candidate);
            
            // Post AI welcome message into group chat
            if (conversationId && decisionRes.initialGroupMessage) {
              await sendMessage({
                conversationId,
                senderId: candidate.id,
                senderName: `${candidate.displayName} (Sinh viên AI)`,
                senderPhoto: candidate.photoURL,
                text: decisionRes.initialGroupMessage
              });
            }

            results.push({
              name: candidate.displayName,
              isAI: true,
              accepted: true,
              reason: decisionRes.reason
            });
          } else {
            results.push({
              name: candidate.displayName,
              isAI: true,
              accepted: false,
              reason: decisionRes.reason
            });
          }
        } catch (err: any) {
          results.push({
            name: candidate.displayName,
            isAI: true,
            accepted: false,
            reason: err?.message || 'Lỗi xử lý phản hồi AI'
          });
        }
      } else {
        // Real student notification invite
        try {
          await sendNotification({
            userId: candidate.id,
            title: `Lời mời tham gia nhóm học: ${group.name}`,
            message: `${userProfile?.displayName || 'Bạn học'} đã mời bạn tham gia nhóm học "${group.name}".`,
            type: 'group_invite',
            link: `/groups`
          });
          results.push({
            name: candidate.displayName,
            isAI: false,
            accepted: true,
            reason: 'Đã gửi lời mời thông báo qua hệ thống'
          });
        } catch {
          results.push({
            name: candidate.displayName,
            isAI: false,
            accepted: false,
            reason: 'Không thể gửi thông báo'
          });
        }
      }
    }

    setInviteResults(results);
    setInviteLoading(false);
    await loadData();
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-slate-400 text-xs">
        Đang tải thông tin chi tiết nhóm học tập...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy nhóm học tập</h2>
        <p className="text-xs text-slate-500">Nhóm học này có thể đã bị xóa hoặc không tồn tại.</p>
        <button
          onClick={() => onNavigate('groups')}
          className="px-4 py-2 bg-[#3478C8] text-white text-xs font-semibold rounded-xl"
        >
          Quay lại danh sách nhóm
        </button>
      </div>
    );
  }

  const isMember = Boolean(currentUser && members.some((m: GroupMember) => m.userId === currentUser.uid));
  const isOwner = Boolean(currentUser && group.ownerId === currentUser.uid);
  const isFull = members.length >= group.maxMembers;
  const isThresholdMet = members.length >= group.minMembers;

  const handleJoin = async () => {
    if (!currentUser || !userProfile) {
      onOpenAuth('login');
      return;
    }

    setActionLoading(true);
    try {
      if (group.isPublic) {
        await joinGroupTransaction(groupId, userProfile);
        alert('Chúc mừng! Bạn đã tham gia nhóm thành công.');
        await loadData();
      } else {
        await requestJoinPrivateGroup(groupId, userProfile, joinMsg || 'Xin chào, mình muốn tham gia nhóm học tập.');
        alert('Yêu cầu tham gia đã được gửi tới chủ nhóm để xét duyệt!');
        setShowRequestInput(false);
      }
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi tham gia nhóm.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!currentUser || !userProfile) return;
    if (!confirm('Bạn có chắc chắn muốn rời khỏi nhóm học này không?')) return;

    setActionLoading(true);
    try {
      await leaveGroupTransaction(groupId, currentUser.uid);
      alert('Bạn đã rời khỏi nhóm.');
      await loadData();
      onNavigate('groups');
    } catch (err: any) {
      alert(err?.message || 'Không thể rời nhóm.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveRequest = async (req: GroupJoinRequest) => {
    try {
      await approveJoinRequestTransaction(req.id, groupId, {
        id: req.userId,
        displayName: req.userName,
        email: req.userEmail,
        photoURL: req.userPhoto
      } as any);
      alert(`Đã chấp thuận sinh viên ${req.userName} vào nhóm!`);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Không thể phê duyệt yêu cầu.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || !currentUser || !userProfile) return;

    const text = newMessage.trim();
    setNewMessage('');
    try {
      await sendMessage({
        conversationId,
        senderId: currentUser.uid,
        senderName: userProfile.displayName,
        senderPhoto: userProfile.photoURL,
        text
      });
    } catch (err) {
      console.error('Send message error', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Back button */}
      <button
        onClick={() => onNavigate('groups')}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#3478C8] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại danh sách nhóm
      </button>

      {/* Main Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start justify-between gap-6">
        <div className="space-y-3 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-100 text-[#3478C8] uppercase">
              {group.mode}
            </span>
            {group.isPublic ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg">
                <Globe className="w-3.5 h-3.5" /> Nhóm công khai
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-800 rounded-lg">
                <Lock className="w-3.5 h-3.5" /> Nhóm cần xét duyệt
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
              Chủ nhóm: {group.ownerName}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#173B65] tracking-tight">{group.name}</h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">{group.description}</p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#3478C8]" />
              {group.schedule}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#3478C8]" />
              {group.location}
            </span>
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <Users className="w-4 h-4 text-[#3478C8]" />
              {members.length} / {group.maxMembers} thành viên (Tối thiểu: {group.minMembers})
            </span>
          </div>
        </div>

        {/* Action Button on Header */}
        <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
          {isOwner ? (
            <div className="flex flex-col gap-2">
              <div className="px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-xl text-center">
                Bạn là Chủ nhóm (Owner)
              </div>
              <button
                type="button"
                onClick={handleOpenMultiInvite}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Mời thêm bạn học & AI
              </button>
            </div>
          ) : isMember ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleOpenMultiInvite}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                <UserPlus className="w-4 h-4" /> Mời thêm thành viên
              </button>
              <button
                disabled={actionLoading}
                onClick={handleLeave}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" /> Rời khỏi nhóm
              </button>
            </div>
          ) : isFull ? (
            <div className="px-4 py-2 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl text-center">
              Nhóm đã đủ thành viên ({group.maxMembers}/{group.maxMembers})
            </div>
          ) : showRequestInput ? (
            <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <input
                type="text"
                placeholder="Lời giới thiệu ngắn gửi chủ nhóm..."
                value={joinMsg}
                onChange={(e) => setJoinMsg(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 outline-hidden"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRequestInput(false)}
                  className="px-3 py-1 text-xs text-slate-500 hover:underline"
                >
                  Hủy
                </button>
                <button
                  disabled={actionLoading}
                  onClick={handleJoin}
                  className="px-3.5 py-1.5 bg-[#3478C8] text-white text-xs font-semibold rounded-xl"
                >
                  Gửi yêu cầu
                </button>
              </div>
            </div>
          ) : (
            <button
              disabled={actionLoading}
              onClick={() => {
                if (group.isPublic) handleJoin();
                else setShowRequestInput(true);
              }}
              className="px-6 py-2.5 bg-[#3478C8] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 text-center"
            >
              {group.isPublic ? 'Tham gia nhóm ngay' : 'Gửi yêu cầu tham gia'}
            </button>
          )}

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="p-2 text-slate-400 hover:text-amber-500 hover:bg-slate-100 rounded-xl transition-colors"
              title="Đánh giá nhóm"
            >
              <Star className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-100 rounded-xl transition-colors"
              title="Báo cáo nhóm"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Group Trial Lesson Readiness Banner (PHẦN 2.2 & 4.1) */}
      {isThresholdMet ? (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-blue-500/15 border border-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-emerald-950 text-sm">
                🎉 Nhóm đã đủ điều kiện tổ chức Buổi học thử nghiệm ({members.length}/{group.maxMembers} thành viên)!
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Quy mô nhóm đã đạt hoặc vượt ngưỡng tối thiểu ({group.minMembers} sinh viên). Hãy lên lịch học thử để các thành viên cùng thống nhất giáo trình!
              </p>
            </div>
          </div>
          {isMember && (
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
            >
              <Calendar className="w-4 h-4" />
              Lên lịch học thử nghiệm ngay
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-3xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Nhóm hiện có {members.length}/{group.maxMembers} thành viên.</span> Cần thêm ít nhất {group.minMembers - members.length} thành viên nữa để đủ điều kiện mở buổi học thử nghiệm.
            </div>
          </div>
          {isMember && (
            <button
              type="button"
              onClick={handleOpenMultiInvite}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shrink-0 transition-colors shadow-2xs"
            >
              + Mời Sinh viên AI để kích hoạt nhóm
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('info')}
          className={`pb-2 px-1 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'info' ? 'border-[#3478C8] text-[#3478C8]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Kế hoạch học tập
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`pb-2 px-1 text-sm font-bold border-b-2 transition-all relative ${
            activeTab === 'members' ? 'border-[#3478C8] text-[#3478C8]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Thành viên ({members.length})
          {isOwner && joinRequests.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
              {joinRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`pb-2 px-1 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'chat' ? 'border-[#3478C8] text-[#3478C8]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Kênh thảo luận nhóm
        </button>

        <button
          onClick={() => setActiveTab('schedules')}
          className={`pb-2 px-1 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'schedules' ? 'border-[#3478C8] text-[#3478C8]' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Lịch học ({schedules.length})
        </button>
      </div>

      {/* TAB 1: INFO */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-800 text-base">Mục tiêu & Kế hoạch học tập</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {group.description}
              </p>
              
              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Kỹ năng trọng tâm:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{group.skillNeeded}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px]">Chủ đề chi tiết:</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{group.topic}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">Thông tin sinh hoạt</h3>
              <div className="space-y-2 text-xs text-slate-600">
                <p><strong>Lịch cố định:</strong> {group.schedule}</p>
                <p><strong>Địa điểm:</strong> {group.location}</p>
                <p><strong>Sĩ số tối thiểu:</strong> {group.minMembers} thành viên</p>
                <p><strong>Sĩ số tối đa:</strong> {group.maxMembers} thành viên</p>
                <p><strong>Hiện có:</strong> {members.length} thành viên</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MEMBERS & PENDING REQUESTS */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          {/* Join requests pending for Owner */}
          {isOwner && joinRequests.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-3xl space-y-3">
              <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Yêu cầu tham gia đang chờ xét duyệt ({joinRequests.length})
              </h3>
              <div className="space-y-2">
                {joinRequests.map((req: GroupJoinRequest) => (
                  <div key={req.id} className="bg-white p-3.5 rounded-2xl border border-amber-200/60 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{req.userName} ({req.userEmail})</p>
                      <p className="text-slate-600 italic mt-0.5">"{req.message}"</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveRequest(req)}
                        className="px-3.5 py-1.5 bg-emerald-600 text-white font-semibold rounded-xl text-xs"
                      >
                        Chấp thuận
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Members list */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-sm">
                Danh sách thành viên chính thức ({members.length}/{group.maxMembers})
              </h3>
              {isMember && (
                <button
                  type="button"
                  onClick={handleOpenMultiInvite}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Mời thêm thành viên & Sinh viên AI
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {members.map((m: GroupMember) => {
                const isAIMember = m.userId.startsWith('ai_');
                return (
                  <div key={m.id} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                    <img
                      src={m.userPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.userName)}`}
                      alt={m.userName}
                      className={`w-11 h-11 rounded-full object-cover border ${isAIMember ? 'border-purple-400 ring-2 ring-purple-100' : 'border-slate-200'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-slate-800 text-xs truncate">{m.userName}</h4>
                        {isAIMember && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700 shrink-0">
                            AI
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{m.userEmail}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        m.role === 'owner' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {m.role === 'owner' ? 'Chủ nhóm' : 'Thành viên'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GROUP CHAT */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden h-[540px] flex flex-col">
          {!isMember ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 text-xs space-y-2">
              <Lock className="w-8 h-8 text-slate-400" />
              <p className="font-bold text-slate-700">Kênh thảo luận nội bộ</p>
              <p>Chỉ thành viên chính thức của nhóm mới có thể đọc và gửi tin nhắn thảo luận.</p>
            </div>
          ) : (
            <>
              {/* Chat Actions Bar */}
              <div className="px-4 py-2.5 bg-purple-50/60 border-b border-purple-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-purple-900 font-medium flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  Kênh thảo luận mở cho {members.length} thành viên (Bao gồm Sinh viên AI)
                </span>
                <button
                  type="button"
                  disabled={isAiContributing}
                  onClick={async () => {
                    const aiMember = members.find(m => m.userId.startsWith('ai_'));
                    const aiId = aiMember ? aiMember.userId : AI_STUDENT_AGENTS[0].id;
                    setIsAiContributing(true);
                    try {
                      const res = await requestAIGroupContribution({
                        aiId,
                        groupTopic: group.skillNeeded || group.topic,
                        groupName: group.name,
                        recentMessages: messages.slice(-5).map((m: MessageItem) => ({ senderName: m.senderName, text: m.text }))
                      });
                      if (conversationId) {
                        await sendMessage({
                          conversationId,
                          senderId: aiId,
                          senderName: `${res.aiName} (AI Cố vấn)`,
                          senderPhoto: res.aiPhoto,
                          text: res.contribution
                        });
                      }
                    } catch (err) {
                      alert('Không thể nhận ý kiến AI vào lúc này.');
                    } finally {
                      setIsAiContributing(false);
                    }
                  }}
                  className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <Bot className="w-3.5 h-3.5" />
                  {isAiContributing ? 'AI đang soạn phản hồi...' : 'Mời AI đóng góp ý kiến'}
                </button>
              </div>

              {/* Message History */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Chưa có tin nhắn nào. Hãy gửi lời chào mở đầu cuộc thảo luận nhóm hoặc bấm nút mời AI phát biểu!
                  </div>
                ) : (
                  messages.map((msg: MessageItem) => {
                    const isMe = msg.senderId === currentUser?.uid;
                    const isAIMsg = msg.senderId.startsWith('ai_');
                    return (
                      <div key={msg.id} className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <img
                          src={msg.senderPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(msg.senderName)}`}
                          alt={msg.senderName}
                          className={`w-7 h-7 rounded-full object-cover mt-1 shrink-0 ${isAIMsg ? 'border-2 border-purple-400' : 'border border-slate-200'}`}
                        />
                        <div className={`max-w-[75%] rounded-2xl p-3 text-xs ${
                          isMe 
                            ? 'bg-[#3478C8] text-white rounded-tr-none' 
                            : isAIMsg 
                            ? 'bg-purple-50 text-purple-950 rounded-tl-none border border-purple-200' 
                            : 'bg-slate-100 text-slate-800 rounded-tl-none'
                        }`}>
                          <p className={`text-[10px] font-semibold mb-1 ${isMe ? 'text-blue-100' : isAIMsg ? 'text-purple-800 font-bold' : 'text-slate-500'}`}>
                            {msg.senderName}
                          </p>
                          <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                          <span className={`text-[9px] block text-right mt-1 opacity-70`}>
                            {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nhập tin nhắn thảo luận cùng nhóm..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden bg-white text-slate-800"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-[#3478C8] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Gửi
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* TAB 4: SCHEDULES */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Lịch sinh hoạt & Buổi học thử nghiệm của nhóm</h3>
            {isMember && (
              <button
                onClick={() => setIsScheduleModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#3478C8] text-white font-bold text-xs rounded-xl shadow-2xs"
              >
                <Plus className="w-4 h-4" /> Lên lịch học mới
              </button>
            )}
          </div>

          {schedules.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center text-slate-500 text-xs">
              Chưa có lịch học nào được tạo cho nhóm này.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schedules.map((sc: ScheduleItem) => (
                <div key={sc.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-100 text-[#3478C8] uppercase">
                      {sc.mode}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 capitalize">
                      {sc.status}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">{sc.title}</h4>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {sc.date} ({sc.startTime} - {sc.endTime})
                  </p>
                  <p className="text-xs text-slate-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {sc.locationOrLink}
                  </p>
                  {sc.notes && (
                    <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-xl">
                      Ghi chú: {sc.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MULTI-INVITE MODAL (PHẦN 2.2 & 3.2) */}
      {isMultiInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-purple-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-6 h-6 text-purple-300" />
                <div>
                  <h3 className="font-extrabold text-base">Mời thành viên & Sinh viên AI vào nhóm</h3>
                  <p className="text-xs text-purple-200">Chọn nhiều sinh viên phù hợp với chuyên đề "{group.skillNeeded || group.topic}"</p>
                </div>
              </div>
              <button
                onClick={() => setIsMultiInviteOpen(false)}
                className="p-1 rounded-full hover:bg-white/10 text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {inviteResults.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-sm">Kết quả gửi lời mời:</h4>
                  <div className="space-y-2">
                    {inviteResults.map((res, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-2xl border text-xs flex items-start gap-2.5 ${
                          res.accepted ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        {res.accepted ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                        <div>
                          <p className="font-bold">{res.name} {res.isAI ? '(AI Student)' : ''}: {res.accepted ? 'Đã tham gia nhóm!' : 'Từ chối'}</p>
                          <p className="mt-0.5 italic text-slate-700 leading-relaxed">"{res.reason}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsMultiInviteOpen(false)}
                      className="px-5 py-2 bg-[#3478C8] text-white font-bold text-xs rounded-xl"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-600">
                    Chọn các bạn sinh viên (hoặc các Sinh viên AI mô phỏng UEH Mekong) để gửi lời mời tham gia nhóm. Đối với sinh viên AI, hệ thống sẽ sử dụng Gemini để tự động đánh giá và phản hồi ngay lập tức.
                  </p>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {availableCandidates.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        Tất cả sinh viên gợi ý đã có mặt trong nhóm hoặc không có sẵn.
                      </div>
                    ) : (
                      availableCandidates.map((cand) => {
                        const isSelected = selectedCandidateIds.includes(cand.id);
                        return (
                          <div
                            key={cand.id}
                            onClick={() => toggleSelectCandidate(cand.id)}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-purple-50/80 border-purple-400 shadow-2xs' 
                                : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}} // handled by parent onClick
                                className="w-4 h-4 text-purple-600 rounded"
                              />
                              <img
                                src={cand.photoURL}
                                alt={cand.displayName}
                                className={`w-10 h-10 rounded-xl object-cover shrink-0 ${cand.isAI ? 'border border-purple-300' : 'border border-slate-200'}`}
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-bold text-xs text-slate-800 truncate">{cand.displayName}</h4>
                                  {cand.isAI && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700">
                                      AI
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-400 font-medium">{cand.cohort}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 truncate">{cand.major}</p>
                                <p className="text-[10px] text-emerald-700 font-medium truncate">
                                  Kỹ năng: {cand.skillsToShare?.map(s => s.name).join(', ')}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600">
                      Đã chọn: <strong className="text-purple-700">{selectedCandidateIds.length}</strong> sinh viên
                    </span>
                    <button
                      type="button"
                      disabled={selectedCandidateIds.length === 0 || inviteLoading}
                      onClick={handleSendMultiInvites}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      {inviteLoading ? 'AI đang đánh giá & phản hồi...' : `Gửi lời mời (${selectedCandidateIds.length})`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {isScheduleModalOpen && (
        <ScheduleModal
          isOpen={isScheduleModalOpen}
          type="group"
          targetId={groupId}
          targetName={group.name}
          skillName={group.skillNeeded || group.topic}
          participants={members.map((m: GroupMember) => m.userId)}
          isTrialDefault={true}
          onClose={() => setIsScheduleModalOpen(false)}
          onSuccess={() => {
            alert('Lịch học nhóm đã được tạo thành công!');
            loadData();
          }}
        />
      )}

      {/* Review Modal */}
      {isReviewModalOpen && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          targetType="group"
          targetId={groupId}
          targetName={group.name}
          groupId={groupId}
          onClose={() => setIsReviewModalOpen(false)}
          onSuccess={() => {
            alert('Cảm ơn bạn đã gửi đánh giá nhóm học tập!');
          }}
        />
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <ReportModal
          isOpen={isReportModalOpen}
          targetType="group"
          targetId={groupId}
          targetName={group.name}
          onClose={() => setIsReportModalOpen(false)}
          onSuccess={() => {
            alert('Báo cáo đã được chuyển tới Ban Quản trị xử lý.');
          }}
        />
      )}

    </div>
  );
};
