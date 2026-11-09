import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Sparkles, 
  Repeat, 
  BookOpen, 
  AlertTriangle, 
  Star, 
  FileText, 
  Clock, 
  Search, 
  Lock, 
  Unlock, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Save, 
  Plus, 
  Edit3, 
  ArrowLeft,
  Settings,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { 
  getAdminDashboardStats, 
  getAllUsersAdmin, 
  updateUserRoleAdmin, 
  toggleUserStatusAdmin, 
  getStudyGroups, 
  getSkills, 
  addSkill, 
  getAllReportsAdmin, 
  updateReportStatusAdmin, 
  getCMSContent, 
  updateCMSContent, 
  getAdminLogs,
  addAdminLog,
  getUserConnections
} from '../services/firebase.ts';
import { 
  UserProfile, 
  StudyGroup, 
  SkillItem, 
  ReportItem, 
  CMSContent, 
  AdminLogItem, 
  Connection 
} from '../types/index.ts';
import { AIAgentProfile } from '../data/aiAgents.ts';
import { 
  fetchAIAgents, 
  adminToggleAIAgent, 
  adminToggleAIDemo, 
  adminToggleAIAutonomous,
  AIStats
} from '../services/aiService.ts';
import { Bot, Cpu, Zap, Activity } from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (page: string, params?: any) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { currentUser, userProfile, isAdmin, isSuperAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'ai_agents' | 'skills' | 'groups' | 'connections' | 'reports' | 'cms' | 'logs'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [logs, setLogs] = useState<AdminLogItem[]>([]);
  const [cms, setCms] = useState<CMSContent | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);

  // AI Student Agents state
  const [aiAgents, setAiAgents] = useState<AIAgentProfile[]>([]);
  const [aiDemoMode, setAiDemoMode] = useState<boolean>(true);
  const [aiAutonomous, setAiAutonomous] = useState<boolean>(true);
  const [aiStats, setAiStats] = useState<AIStats>({ totalCalls: 0, estimatedTokens: 0, activeAgentsCount: 15 });
  const [selectedAgentDetail, setSelectedAgentDetail] = useState<AIAgentProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);

  // New Skill Form
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCat, setNewSkillCat] = useState('tech');
  const [newSkillLevel, setNewSkillLevel] = useState<'Cơ bản' | 'Trung cấp' | 'Nâng cao'>('Trung cấp');
  const [newSkillDesc, setNewSkillDesc] = useState('');

  // CMS Form
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroBadge, setHeroBadge] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [sData, uData, gData, skData, rData, lData, cData, aiData] = await Promise.all([
        getAdminDashboardStats(),
        getAllUsersAdmin(),
        getStudyGroups(),
        getSkills(),
        getAllReportsAdmin(),
        getAdminLogs(),
        getCMSContent(),
        fetchAIAgents().catch(() => null)
      ]);
      setStats(sData);
      setUsers(uData);
      setGroups(gData);
      setSkills(skData);
      setReports(rData);
      setLogs(lData);
      setCms(cData);

      if (aiData) {
        setAiAgents(aiData.agents);
        setAiDemoMode(aiData.demoModeActive);
        setAiAutonomous(aiData.aiAutonomousMode);
        setAiStats(aiData.stats);
      }

      if (cData) {
        setHeroTitle(cData.heroTitle || '');
        setHeroSubtitle(cData.heroSubtitle || '');
        setHeroBadge(cData.heroBadge || '');
        setAnnouncement(cData.announcement || '');
        setContactEmail(cData.contactEmail || '');
        setContactPhone(cData.contactPhone || '');
      }
    } catch (err) {
      console.error('Admin Load Error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAIAgentStatus = async (agent: AIAgentProfile) => {
    setActionLoading(true);
    const nextState = !agent.enabled;
    try {
      await adminToggleAIAgent(agent.id, nextState);
      setAiAgents(prev => prev.map(a => a.id === agent.id ? { ...a, enabled: nextState } : a));
      await addAdminLog({
        adminId: userProfile!.id,
        adminName: userProfile!.displayName,
        adminEmail: userProfile!.email,
        action: 'TOGGLE_AI_AGENT',
        targetType: 'ai_agent',
        targetId: agent.id,
        details: `${nextState ? 'Bật' : 'Tắt'} sinh viên AI: ${agent.displayName}`
      });
    } catch {
      alert('Không thể cập nhật trạng thái Agent.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAIDemo = async () => {
    const next = !aiDemoMode;
    setAiDemoMode(next);
    await adminToggleAIDemo(next);
  };

  const handleToggleAIAutonomous = async () => {
    const next = !aiAutonomous;
    setAiAutonomous(next);
    await adminToggleAIAutonomous(next);
  };

  useEffect(() => {
    if (isAdmin) {
      loadAllAdminData();
    }
  }, [isAdmin]);

  // STRICT ACCESS CONTROL GUARD:
  // If user is not authenticated or not an Admin/SuperAdmin, completely block access!
  if (!currentUser || !isAdmin || !userProfile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100 shadow-md">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-rose-700">Truy cập bị từ chối (403 Unauthorized)</h2>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Khu vực Quản trị hệ thống (Admin Dashboard) chỉ dành riêng cho Quản trị viên được phân quyền hợp lệ. Tài khoản hiện tại không có quyền truy cập.
        </p>
        <div className="pt-2">
          <button
            onClick={() => onNavigate('home')}
            className="px-6 py-2.5 bg-[#173B65] hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            Quay lại Trang chủ
          </button>
        </div>
      </div>
    );
  }

  // Handle User Status
  const handleToggleStatus = async (user: UserProfile) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`Bạn có chắc muốn ${nextStatus === 'suspended' ? 'KHÓA' : 'MỞ KHÓA'} tài khoản của ${user.displayName}?`)) return;

    setActionLoading(true);
    try {
      await toggleUserStatusAdmin(user.id, nextStatus, userProfile);
      await loadAllAdminData();
    } catch (err) {
      alert('Không thể cập nhật trạng thái người dùng.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Role Change (Only Super Admin)
  const handleChangeRole = async (targetUser: UserProfile, newRole: 'user' | 'admin' | 'superadmin') => {
    if (!isSuperAdmin) {
      alert('Chỉ Super Admin mới có quyền thay đổi vai trò quản trị viên!');
      return;
    }
    if (!confirm(`Xác nhận đổi vai trò của ${targetUser.displayName} thành ${newRole}?`)) return;

    setActionLoading(true);
    try {
      await updateUserRoleAdmin(targetUser.id, newRole, userProfile);
      alert('Cập nhật vai trò thành công!');
      await loadAllAdminData();
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi cập nhật vai trò.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Add Skill
  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    setActionLoading(true);
    try {
      await addSkill({
        name: newSkillName.trim(),
        categoryId: newSkillCat,
        categoryName: newSkillCat,
        level: newSkillLevel,
        description: newSkillDesc.trim() || newSkillName.trim(),
        status: 'active',
        createdBy: userProfile.id
      });
      await addAdminLog({
        adminId: userProfile.id,
        adminName: userProfile.displayName,
        adminEmail: userProfile.email,
        action: 'ADD_SKILL',
        targetType: 'skill',
        targetId: newSkillName.trim(),
        details: `Thêm kỹ năng mới: ${newSkillName.trim()}`
      });
      setNewSkillName('');
      setNewSkillDesc('');
      await loadAllAdminData();
      alert('Đã thêm kỹ năng mới thành công!');
    } catch (err) {
      alert('Không thể thêm kỹ năng.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Resolve Report
  const handleResolveReport = async (reportId: string, status: ReportItem['status']) => {
    setActionLoading(true);
    try {
      await updateReportStatusAdmin(reportId, status, resolutionNote || 'Đã kiểm tra và xử lý theo quy định cộng đồng.', userProfile.id);
      await addAdminLog({
        adminId: userProfile.id,
        adminName: userProfile.displayName,
        adminEmail: userProfile.email,
        action: 'RESOLVE_REPORT',
        targetType: 'report',
        targetId: reportId,
        details: `Trạng thái xử lý: ${status}`
      });
      setActiveReportId(null);
      setResolutionNote('');
      await loadAllAdminData();
    } catch (err) {
      alert('Không thể cập nhật báo cáo.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Save CMS
  const handleSaveCMS = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await updateCMSContent({
        heroTitle,
        heroSubtitle,
        heroBadge,
        announcement,
        contactEmail,
        contactPhone
      }, userProfile);
      alert('Nội dung trang chủ CMS đã được lưu vào Firestore và cập nhật ngay lập tức!');
      await loadAllAdminData();
    } catch (err) {
      alert('Không thể lưu nội dung CMS.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!searchUser.trim()) return true;
    const q = searchUser.toLowerCase();
    return u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.studentId || '').includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#173B65] to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white/10 text-emerald-300">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Admin Control Center</h1>
              <p className="text-xs text-blue-200">Quản trị Nền tảng SkillSwap UEH Mekong</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 pt-1">
            Đăng nhập với vai trò: <strong className="text-white uppercase">{userProfile.role}</strong> ({userProfile.email})
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Về Website Sinh viên
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'overview', label: 'Tổng quan hệ thống', icon: ShieldCheck },
          { id: 'users', label: `Sinh viên (${users.length})`, icon: Users },
          { id: 'ai_agents', label: `Sinh viên AI (${aiAgents.length})`, icon: Bot },
          { id: 'groups', label: `Nhóm học (${groups.length})`, icon: BookOpen },
          { id: 'skills', label: `Kỹ năng (${skills.length})`, icon: Sparkles },
          { id: 'reports', label: `Báo cáo (${reports.filter(r => r.status === 'pending').length})`, icon: AlertTriangle },
          { id: 'cms', label: 'Quản lý CMS', icon: FileText },
          { id: 'logs', label: 'Nhật ký Audit Logs', icon: Clock },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive 
                  ? 'bg-[#173B65] text-white shadow-xs' 
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <span className="text-slate-500 text-xs font-medium">Tổng sinh viên</span>
              <p className="text-2xl font-black text-[#173B65] mt-1">{stats?.totalUsers || 0}</p>
              <span className="text-[10px] text-emerald-600 font-bold block mt-1">{stats?.activeUsers || 0} đang hoạt động</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <span className="text-slate-500 text-xs font-medium">Kỹ năng đăng ký</span>
              <p className="text-2xl font-black text-[#3478C8] mt-1">{stats?.totalSkills || 0}</p>
              <span className="text-[10px] text-slate-400 block mt-1">Đồng bộ Firestore</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <span className="text-slate-500 text-xs font-medium">Nhóm học tập</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">{stats?.totalGroups || 0}</p>
              <span className="text-[10px] text-indigo-600 font-bold block mt-1">{stats?.activeGroups || 0} nhóm đang mở</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
              <span className="text-slate-500 text-xs font-medium">Báo cáo chờ xử lý</span>
              <p className="text-2xl font-black text-rose-600 mt-1">{stats?.pendingReports || 0}</p>
              <span className="text-[10px] text-rose-600 font-bold block mt-1">Cần xem xét</span>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-blue-50/70 border border-blue-200/70 p-6 rounded-3xl space-y-3">
            <h3 className="font-bold text-[#173B65] text-sm flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#3478C8]" />
              Quy chuẩn bảo mật và Phân quyền Quản trị
            </h3>
            <ul className="text-xs text-blue-900 space-y-1.5 list-disc pl-5 leading-relaxed">
              <li>Mọi thao tác quản trị được kiểm soát chặt chẽ bởi Firestore Security Rules ở phía backend.</li>
              <li>Chỉ Super Admin mới có quyền thăng cấp hoặc thu hồi quyền Admin của tài khoản khác.</li>
              <li>Các hành động thay đổi trạng thái, cập nhật nội dung CMS đều được ghi nhật ký tự động vào bảng Audit Logs bất biến.</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 2: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Quản lý Tài khoản Sinh viên</h3>
              <p className="text-xs text-slate-500">Xem hồ sơ, khóa tài khoản vi phạm và phân quyền quản trị</p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm tên, email, MSSV..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Sinh viên</th>
                  <th className="p-3">Ngành / Khóa</th>
                  <th className="p-3">Kỹ năng chia sẻ</th>
                  <th className="p-3">Vai trò</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.displayName)}`}
                          alt={u.displayName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-bold text-slate-800">{u.displayName}</p>
                          <p className="text-[10px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600">
                      {u.major || 'Chưa cập nhật'} • {u.cohort || 'UEH'}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {u.skillsToShare && u.skillsToShare.length > 0 ? (
                          u.skillsToShare.slice(0, 2).map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700">
                              {s.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[10px]">Chưa thêm</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        u.role === 'superadmin' ? 'bg-amber-100 text-amber-800' :
                        u.role === 'admin' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Lock/Unlock */}
                        <button
                          disabled={actionLoading}
                          onClick={() => handleToggleStatus(u)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.status === 'active' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={u.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa'}
                        >
                          {u.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>

                        {/* Super Admin Promote / Demote */}
                        {isSuperAdmin && u.id !== currentUser.uid && (
                          <select
                            disabled={actionLoading}
                            value={u.role}
                            onChange={(e) => handleChangeRole(u, e.target.value as any)}
                            className="text-[10px] px-2 py-1 rounded-lg border border-slate-200 bg-white"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Super Admin</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: AI STUDENT AGENTS MANAGEMENT */}
      {activeTab === 'ai_agents' && (
        <div className="space-y-6">
          
          {/* Top AI Stats & Telemetry Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-purple-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs font-medium">Hồ sơ Sinh viên AI</span>
                <Bot className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-purple-900 mt-1">{aiAgents.length} Agents</p>
              <span className="text-[10px] text-emerald-600 font-bold block mt-1">
                {aiAgents.filter(a => a.enabled).length} agent đang kích hoạt
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-purple-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs font-medium">Lượt gọi Gemini API</span>
                <Cpu className="w-5 h-5 text-[#3478C8]" />
              </div>
              <p className="text-2xl font-black text-[#173B65] mt-1">{aiStats.totalCalls}</p>
              <span className="text-[10px] text-blue-600 font-bold block mt-1">Mô hình: gemini-3.8-flash</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-purple-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs font-medium">Ước tính Token sử dụng</span>
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-700 mt-1">~{Math.round(aiStats.estimatedTokens)}</p>
              <span className="text-[10px] text-slate-400 block mt-1">Hạn mức Google AI Studio</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-purple-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs font-medium">Trạng thái Tự chủ</span>
                <Activity className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-emerald-700 mt-1">
                {aiAutonomous ? 'Đang bật' : 'Tạm dừng'}
              </p>
              <span className="text-[10px] text-emerald-600 font-bold block mt-1">Autonomous Mode</span>
            </div>
          </div>

          {/* Master Control Switches Card */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-6 rounded-3xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-300" />
                <h3 className="font-extrabold text-base">Bảng điều khiển Hành vi & Hiển thị AI Sinh viên</h3>
              </div>
              <p className="text-xs text-purple-200 max-w-xl leading-relaxed">
                Quản lý chế độ hiển thị toàn sàn của 15 sinh viên AI mô phỏng (UEH Mekong K48-K50). Khi bật chế độ Demo, sinh viên AI sẽ xuất hiện trên Khám phá và đề xuất ghép cặp.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 shrink-0">
              {/* Demo Mode Toggle */}
              <div className="flex items-center gap-2.5 bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10">
                <div className="text-right">
                  <span className="block text-xs font-bold">Chế độ Demo</span>
                  <span className="block text-[10px] text-purple-200">{aiDemoMode ? 'Đang hiển thị trên sàn' : 'Đã ẩn'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAIDemo}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    aiDemoMode ? 'bg-emerald-500' : 'bg-white/30'
                  }`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    aiDemoMode ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Autonomous Mode Toggle */}
              <div className="flex items-center gap-2.5 bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10">
                <div className="text-right">
                  <span className="block text-xs font-bold">Hành vi tự chủ</span>
                  <span className="block text-[10px] text-purple-200">{aiAutonomous ? 'Tự phản hồi & ghép cặp' : 'Thủ công'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAIAutonomous}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                    aiAutonomous ? 'bg-emerald-500' : 'bg-white/30'
                  }`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                    aiAutonomous ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Table of 15 AI Student Agents */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Danh sách 15 AI Student Agents</h3>
                <p className="text-xs text-slate-500">Mỗi sinh viên AI có danh tính, tính cách, kỹ năng và system prompt độc lập</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Sinh viên AI</th>
                    <th className="p-3">Khóa / Ngành học</th>
                    <th className="p-3">Kỹ năng chia sẻ</th>
                    <th className="p-3">Kỹ năng muốn học</th>
                    <th className="p-3 text-center">Tương tác</th>
                    <th className="p-3 text-center">Trạng thái</th>
                    <th className="p-3 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aiAgents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <img
                              src={agent.photoURL}
                              alt={agent.displayName}
                              className="w-9 h-9 rounded-full object-cover border border-purple-200"
                            />
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[8px]">
                              <Bot className="w-2 h-2" />
                            </span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 flex items-center gap-1.5">
                              {agent.displayName}
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-100 text-purple-700">
                                AI
                              </span>
                            </p>
                            <p className="text-[10px] text-slate-400">{agent.studentId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">
                        <span className="font-semibold text-slate-800">{agent.cohort}</span> • {agent.major}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {agent.skillsToShare.map((s, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-800 font-medium">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {agent.skillsToLearn.map((s, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-800 font-medium">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-700">
                        {agent.totalInteractions}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAIAgentStatus(agent)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                            agent.enabled
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {agent.enabled ? 'Đang bật' : 'Đã tắt'}
                        </button>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setSelectedAgentDetail(agent)}
                          className="px-3 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
                        >
                          Xem Prompt →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* AI Agent Full Persona & Prompt Inspection Modal */}
      {selectedAgentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-purple-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={selectedAgentDetail.photoURL}
                  alt={selectedAgentDetail.displayName}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20 shadow-md"
                />
                <div>
                  <h3 className="font-extrabold text-lg flex items-center gap-2">
                    {selectedAgentDetail.displayName}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/40 text-purple-200 font-normal">
                      {selectedAgentDetail.studentId}
                    </span>
                  </h3>
                  <p className="text-xs text-purple-200 mt-0.5">
                    {selectedAgentDetail.major} • Khóa {selectedAgentDetail.cohort} UEH Mekong
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgentDetail(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-100 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-purple-800">Tính cách:</span>
                  <p className="text-slate-800 leading-relaxed">{selectedAgentDetail.personality}</p>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-100 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-blue-800">Phong cách giao tiếp:</span>
                  <p className="text-slate-800 leading-relaxed">{selectedAgentDetail.communicationStyle}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold text-emerald-800 text-[11px] uppercase mb-1">Kỹ năng có thể chia sẻ:</h4>
                  <div className="space-y-1">
                    {selectedAgentDetail.skillsToShare.map((s, idx) => (
                      <span key={idx} className="block px-2 py-1 rounded bg-emerald-50 text-emerald-800 font-medium">
                        • {s.name} ({s.level})
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-blue-800 text-[11px] uppercase mb-1">Kỹ năng mong muốn học:</h4>
                  <div className="space-y-1">
                    {selectedAgentDetail.skillsToLearn.map((s, idx) => (
                      <span key={idx} className="block px-2 py-1 rounded bg-blue-50 text-blue-800 font-medium">
                        • {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500">Mục tiêu học tập & Sở thích:</span>
                <p className="text-slate-700"><strong>Mục tiêu:</strong> {selectedAgentDetail.learningGoals.join('; ')}</p>
                <p className="text-slate-700"><strong>Sở thích:</strong> {selectedAgentDetail.hobbies.join(', ')}</p>
                <p className="text-slate-700"><strong>Lịch rảnh:</strong> {selectedAgentDetail.availableTime}</p>
              </div>

              {/* System Prompt for Gemini */}
              <div>
                <h4 className="font-bold text-indigo-900 text-[11px] uppercase mb-1 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                  System Prompt (Gemini API Instruction):
                </h4>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-2xl font-mono text-[10px] whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {selectedAgentDetail.systemPrompt}
                </pre>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedAgentDetail(null)}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GROUPS MANAGEMENT */}
      {activeTab === 'groups' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-slate-800 text-base">Quản lý Nhóm học tập</h3>
          <p className="text-xs text-slate-500">Giám sát các nhóm học tập đang mở và xử lý các nhóm vi phạm</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {groups.map((g) => (
              <div key={g.id} className="p-4 rounded-2xl border border-slate-200 space-y-2 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-[#3478C8] uppercase">
                    {g.mode}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">
                    {g.currentMembersCount}/{g.maxMembers} thành viên
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 text-sm">{g.name}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{g.description}</p>
                <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-200">
                  <span className="text-slate-500">Chủ nhóm: <strong className="text-slate-700">{g.ownerName}</strong></span>
                  <button
                    onClick={() => onNavigate('group-detail', { groupId: g.id })}
                    className="font-bold text-[#3478C8] hover:underline"
                  >
                    Xem chi tiết →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SKILLS MANAGEMENT */}
      {activeTab === 'skills' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Thêm kỹ năng mới</h3>
            <form onSubmit={handleAddSkill} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Tên kỹ năng</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Google Looker Studio, Lập trình React..."
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Danh mục</label>
                <select
                  value={newSkillCat}
                  onChange={(e) => setNewSkillCat(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-hidden bg-white"
                >
                  <option value="tech">Công nghệ & Kỹ thuật số</option>
                  <option value="languages">Ngoại ngữ & Chứng chỉ</option>
                  <option value="business">Kinh doanh & Marketing</option>
                  <option value="design">Thiết kế & Sáng tạo nội dung</option>
                  <option value="soft-skills">Kỹ năng mềm & Phát triển</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Cấp độ</label>
                <select
                  value={newSkillLevel}
                  onChange={(e: any) => setNewSkillLevel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-hidden bg-white"
                >
                  <option value="Cơ bản">Cơ bản</option>
                  <option value="Trung cấp">Trung cấp</option>
                  <option value="Nâng cao">Nâng cao</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Mô tả tóm tắt</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả kỹ năng..."
                  value={newSkillDesc}
                  onChange={(e) => setNewSkillDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2 bg-[#3478C8] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                + Lưu kỹ năng vào danh mục
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-base">Danh mục kỹ năng đã kích hoạt ({skills.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
              {skills.map((sk) => (
                <div key={sk.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-800">{sk.name}</h4>
                    <span className="text-[10px] text-slate-500">{sk.level} • {sk.categoryName || sk.categoryId}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                    {sk.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: REPORTS & DISPUTES */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-slate-800 text-base">Xử lý Khiếu nại & Báo cáo Vi phạm</h3>
          <p className="text-xs text-slate-500">Các báo cáo được gửi từ sinh viên để đảm bảo môi trường học tập lành mạnh</p>

          {reports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Hiện tại không có báo cáo vi phạm nào cần xử lý.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div key={r.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                      {r.reason}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      r.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      r.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  <p className="text-slate-700">
                    Người báo cáo: <strong>{r.reporterName}</strong> | Đối tượng bị báo cáo: <strong>{r.targetName}</strong> ({r.targetType})
                  </p>
                  <p className="text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 italic">
                    "{r.description}"
                  </p>

                  {r.status === 'pending' && (
                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="Ghi chú hướng giải quyết..."
                        value={activeReportId === r.id ? resolutionNote : ''}
                        onChange={(e) => {
                          setActiveReportId(r.id);
                          setResolutionNote(e.target.value);
                        }}
                        className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 outline-hidden bg-white"
                      />
                      <button
                        onClick={() => handleResolveReport(r.id, 'resolved')}
                        className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded-xl"
                      >
                        Giải quyết
                      </button>
                      <button
                        onClick={() => handleResolveReport(r.id, 'dismissed')}
                        className="px-4 py-1.5 bg-slate-200 text-slate-700 font-semibold rounded-xl"
                      >
                        Bác bỏ
                      </button>
                    </div>
                  )}

                  {r.resolutionNotes && (
                    <p className="text-[11px] text-emerald-800 font-medium pt-1">
                      Kết quả xử lý: {r.resolutionNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 6: CMS LIVE EDITOR */}
      {activeTab === 'cms' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base">CMS - Quản lý Nội dung Trang chủ</h3>
              <p className="text-xs text-slate-500">Cập nhật banner, tiêu đề, thông báo hiển thị cho sinh viên</p>
            </div>
          </div>

          <form onSubmit={handleSaveCMS} className="space-y-4 text-xs pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Huy hiệu Hero Badge</label>
              <input
                type="text"
                value={heroBadge}
                onChange={(e) => setHeroBadge(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tiêu đề chính (Hero Title)</label>
              <input
                type="text"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-hidden font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả phụ (Hero Subtitle)</label>
              <textarea
                rows={3}
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Thông báo Banner nổi bật</label>
              <input
                type="text"
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email liên hệ Footer</label>
                <input
                  type="text"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại liên hệ</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 outline-hidden"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#3478C8] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {actionLoading ? 'Đang lưu vào Firestore...' : 'Lưu và Xuất bản ngay'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 7: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-slate-800 text-base">Nhật ký Hoạt động Quản trị (Immutable Audit Trail)</h3>
          <p className="text-xs text-slate-500">Ghi lại toàn bộ thao tác thay đổi phân quyền, cập nhật CMS, khóa tài khoản và xử lý vi phạm</p>

          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3">Admin thực hiện</th>
                  <th className="p-3">Hành động</th>
                  <th className="p-3">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-400">Chưa có nhật ký nào.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {log.adminName} ({log.adminEmail})
                      </td>
                      <td className="p-3 font-mono font-bold text-indigo-700">
                        {log.action}
                      </td>
                      <td className="p-3 text-slate-600">
                        {log.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
