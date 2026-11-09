import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  Repeat, 
  Users, 
  Calendar, 
  CheckCircle, 
  ArrowRight, 
  Star, 
  ShieldCheck, 
  BookOpen, 
  ChevronRight, 
  TrendingUp, 
  Award, 
  Laptop, 
  Globe, 
  Palette, 
  Bot, 
  MessageSquare 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { 
  getCMSContent, 
  getStudyGroups, 
  getSkillCategories, 
  getPublicStudents, 
  getAdminDashboardStats 
} from '../services/firebase.ts';
import { CMSContent, StudyGroup, SkillCategory, UserProfile } from '../types/index.ts';
import { AI_STUDENT_AGENTS } from '../data/aiAgents.ts';

interface HomePageProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onOpenAuth }) => {
  const { currentUser, userProfile } = useAuth();
  const [cms, setCms] = useState<CMSContent | null>(null);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [featuredStudents, setFeaturedStudents] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [cmsData, catsData, groupsData, studentsData, statsData] = await Promise.all([
          getCMSContent(),
          getSkillCategories(),
          getStudyGroups(),
          getPublicStudents(),
          getAdminDashboardStats()
        ]);
        setCms(cmsData);
        setCategories(catsData);
        setGroups(groupsData.slice(0, 4));
        setFeaturedStudents(studentsData.slice(0, 4));
        setStats(statsData);
      } catch (err) {
        console.error('Home Page Load Error', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate('explore', { query: searchQuery.trim() });
    } else {
      onNavigate('explore');
    }
  };

  return (
    <div className="space-y-16 pb-16">
      
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-slate-50 to-white pt-12 pb-20 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="max-w-3xl mx-auto text-center space-y-6">
            
            {/* Top Announcement Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200/80 text-xs font-semibold text-[#173B65] shadow-2xs">
              <Sparkles className="w-4 h-4 text-[#3478C8]" />
              <span>{cms?.heroBadge || 'Nền tảng Trao đổi Kỹ năng Sinh viên UEH Mekong'}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#173B65] tracking-tight leading-tight">
              {cms?.heroTitle || 'Chia sẻ điều bạn biết. Học hỏi điều bạn cần.'}
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
              {cms?.heroSubtitle || 'Nền tảng kết nối 1–1 và thành lập nhóm học tập ngang hàng (Peer-to-Peer Learning) dành riêng cho sinh viên UEH Phân hiệu Vĩnh Long.'}
            </p>

            {/* Quick Search Bar */}
            <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto pt-2">
              <div className="relative flex items-center shadow-lg rounded-2xl overflow-hidden bg-white border border-slate-200 p-1.5 focus-within:ring-2 focus-within:ring-[#3478C8] transition-all">
                <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
                <input
                  type="text"
                  placeholder="Tìm kỹ năng bạn muốn học: Excel, IELTS, Canva, Python, Marketing..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm outline-hidden text-slate-800 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#3478C8] hover:bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-xs transition-all shrink-0"
                >
                  Tìm kiếm
                </button>
              </div>
            </form>

            {/* Call to Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('match')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#173B65] hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold shadow-md transition-all"
              >
                <Repeat className="w-4 h-4 text-emerald-300" />
                Ghép cặp trao đổi 1–1
              </button>
              <button
                onClick={() => onNavigate('groups')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold shadow-2xs transition-all"
              >
                <Users className="w-4 h-4 text-[#3478C8]" />
                Khám phá nhóm học tập
              </button>
            </div>

            {/* Real Stats Bar from Firestore */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-slate-200/80 max-w-2xl mx-auto text-center">
              <div>
                <p className="text-xl sm:text-2xl font-black text-[#173B65]">{stats?.totalUsers || 0}</p>
                <p className="text-[11px] font-medium text-slate-500">Sinh viên tham gia</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-[#3478C8]">{stats?.totalSkills || 0}</p>
                <p className="text-[11px] font-medium text-slate-500">Kỹ năng được chia sẻ</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-emerald-600">{stats?.totalGroups || 0}</p>
                <p className="text-[11px] font-medium text-slate-500">Nhóm học tập mở</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-amber-600">{stats?.totalConnections || 0}</p>
                <p className="text-[11px] font-medium text-slate-500">Lượt kết nối 1–1</p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 2. Announcement Banner from CMS */}
      {cms?.announcement && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-900 to-[#173B65] rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-blue-700/60 text-emerald-300">
                <Sparkles className="w-5 h-5" />
              </span>
              <p className="text-xs sm:text-sm text-blue-100 font-medium">
                {cms.announcement}
              </p>
            </div>
            <button
              onClick={() => onNavigate('explore')}
              className="shrink-0 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Xem ngay
            </button>
          </div>
        </section>
      )}

      {/* 3. Cách thức hoạt động (How It Works) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#173B65]">Cách thức hoạt động</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2">
            Học tập và trao đổi kỹ năng dễ dàng qua 4 bước chuẩn mực
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(cms?.guideSteps || [
            { step: 1, title: 'Tạo hồ sơ kỹ năng', desc: 'Đăng ký tài khoản và cập nhật các kỹ năng bạn có thể chia sẻ cũng như kỹ năng muốn học.', icon: 'UserCheck' },
            { step: 2, title: 'Khám phá & Ghép cặp', desc: 'Hệ thống tự động đề xuất sinh viên có nhu cầu tương thích hoặc tìm kiếm nhóm phù hợp.', icon: 'Repeat' },
            { step: 3, title: 'Lên lịch & Trao đổi', desc: 'Thống nhất thời gian học tập online hoặc gặp mặt trực tiếp tại khuôn viên UEH Mekong.', icon: 'Calendar' },
            { step: 4, title: 'Hoàn thành & Đánh giá', desc: 'Xác nhận hoàn thành buổi học và gửi đánh giá tích cực để nâng cao uy tín trong cộng đồng.', icon: 'Award' },
          ]).map((step: any, idx: number) => (
            <div 
              key={idx}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow relative"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#3478C8] font-black text-sm flex items-center justify-center mb-4 border border-blue-100">
                0{step.step}
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-2">{step.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Kỹ năng nổi bật theo danh mục (Skill Categories) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-[#173B65]">Danh mục kỹ năng phổ biến</h2>
            <p className="text-xs text-slate-500 mt-1">Các lĩnh vực sinh viên UEH Mekong quan tâm và chia sẻ nhiều nhất</p>
          </div>
          <button
            onClick={() => onNavigate('explore')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#3478C8] hover:underline"
          >
            Xem tất cả kỹ năng <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((cat: SkillCategory) => (
            <div
              key={cat.id}
              onClick={() => onNavigate('explore', { category: cat.id })}
              className="group bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#3478C8] hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#3478C8] flex items-center justify-center group-hover:bg-[#3478C8] group-hover:text-white transition-colors">
                  <Laptop className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#3478C8] transition-colors" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1">{cat.name}</h3>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{cat.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Nhóm học tập đang mở tuyển thành viên */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-[#173B65]">Nhóm học tập đang mở đăng ký</h2>
            <p className="text-xs text-slate-500 mt-1">Gia nhập nhóm học tập để cùng ôn thi, làm đề án và luyện kỹ năng</p>
          </div>
          <button
            onClick={() => onNavigate('groups')}
            className="flex items-center gap-1.5 text-xs font-bold text-[#3478C8] hover:underline"
          >
            Xem tất cả nhóm <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-dashed border-slate-300 text-center text-slate-500 text-xs">
            Hiện chưa có nhóm học tập nào được tạo. Hãy là người đầu tiên tạo nhóm học!
            <div className="mt-3">
              <button
                onClick={() => {
                  if (!currentUser) onOpenAuth('login');
                  else onNavigate('groups');
                }}
                className="px-4 py-2 bg-[#3478C8] text-white font-semibold text-xs rounded-xl"
              >
                Tạo nhóm học mới
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {groups.map((group: StudyGroup) => {
              const percent = Math.round((group.currentMembersCount / group.maxMembers) * 100);
              return (
                <div
                  key={group.id}
                  onClick={() => onNavigate('group-detail', { groupId: group.id })}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#3478C8] uppercase">
                        {group.mode}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600">
                        {group.currentMembersCount}/{group.maxMembers} thành viên
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-800 text-sm mb-1 line-clamp-1">{group.name}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{group.description}</p>
                  </div>

                  <div>
                    {/* Capacity Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-3">
                      <div 
                        className={`h-full rounded-full ${percent >= 100 ? 'bg-amber-500' : 'bg-[#3478C8]'}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-500">Chủ nhóm: <strong className="text-slate-700">{group.ownerName}</strong></span>
                      <span className="font-bold text-[#3478C8]">Xem nhóm →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5.5. AI Student Agents Spotlight - UEH Mekong Simulated Companions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-[#173B65] rounded-3xl p-6 sm:p-10 text-white shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                Cộng đồng Sinh viên AI UEH Mekong
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Giao lưu & Trao đổi Kiến thức cùng 15 Sinh viên AI mô phỏng
              </h2>
              <p className="text-xs sm:text-sm text-purple-200 max-w-2xl leading-relaxed">
                Được thiết kế riêng cho sinh viên UEH Mekong với danh tính, khóa học (K48–K50) và chuyên môn phong phú. Trò chuyện và học hỏi trực tiếp được vận hành bởi mô hình Gemini 3.8 Flash.
              </p>
            </div>

            <button
              onClick={() => onNavigate('messages', { conversationId: 'conv_ai_khang_tech' })}
              className="px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs rounded-xl shadow-md transition-all shrink-0 flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Khám phá phòng chat AI →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {AI_STUDENT_AGENTS.slice(0, 4).map((agent) => (
              <div
                key={agent.id}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:border-purple-300 transition-all flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className="relative">
                      <img
                        src={agent.photoURL}
                        alt={agent.displayName}
                        className="w-11 h-11 rounded-xl object-cover border border-white/20"
                      />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center text-[9px]">
                        <Bot className="w-2.5 h-2.5" />
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                        {agent.displayName}
                      </h4>
                      <p className="text-[11px] text-purple-200">{agent.cohort} • {agent.major}</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-purple-100 italic line-clamp-2 mb-3 bg-white/5 p-2 rounded-lg">
                    "{agent.bio}"
                  </p>

                  <div className="text-[10px] space-y-1 mb-3">
                    <span className="font-bold text-emerald-300 uppercase block">Thế mạnh chia sẻ:</span>
                    <div className="flex flex-wrap gap-1">
                      {agent.skillsToShare.slice(0, 2).map((s, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('messages', { conversationId: `conv_${agent.id}` })}
                  className="w-full py-2 bg-white hover:bg-purple-50 text-purple-900 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                  Trò chuyện cùng {agent.displayName.split(' ').pop()}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Sinh viên tiêu biểu sẵn sàng chia sẻ */}
      {featuredStudents.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-extrabold text-[#173B65]">Sinh viên UEH Mekong sẵn sàng chia sẻ</h2>
              <p className="text-xs text-slate-500 mt-1">Kết nối và cùng nhau tiến bộ qua các buổi trao đổi 1–1</p>
            </div>
            <button
              onClick={() => onNavigate('match')}
              className="flex items-center gap-1.5 text-xs font-bold text-[#3478C8] hover:underline"
            >
              Tìm người trao đổi phù hợp <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredStudents.map((st: UserProfile) => (
              <div
                key={st.id}
                onClick={() => onNavigate('explore')}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all text-center cursor-pointer"
              >
                <img
                  src={st.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(st.displayName)}`}
                  alt={st.displayName}
                  className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-slate-100 mb-3"
                />
                <h4 className="font-bold text-slate-800 text-sm">{st.displayName}</h4>
                <p className="text-xs text-slate-500">{st.major}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                  {st.cohort || 'UEH'}
                </span>

                {st.skillsToShare.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-left">
                    <p className="text-[10px] font-bold text-emerald-700 uppercase mb-1">Kỹ năng chia sẻ:</p>
                    <div className="flex flex-wrap gap-1">
                      {st.skillsToShare.slice(0, 2).map((s: { name: string; level: string }, i: number) => (
                        <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] rounded font-medium">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Call To Action Footer Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#173B65] via-[#1c487a] to-[#3478C8] rounded-3xl p-8 sm:p-12 text-white text-center relative overflow-hidden shadow-xl">
          <div className="max-w-2xl mx-auto space-y-4 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bạn có kỹ năng muốn chia sẻ cùng bạn bè UEH?
            </h2>
            <p className="text-xs sm:text-sm text-blue-100">
              Đăng ký tài khoản miễn phí bằng email sinh viên UEH và bắt đầu trao đổi kỹ năng ngay hôm nay!
            </p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              {!currentUser ? (
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all"
                >
                  Đăng ký tham gia ngay
                </button>
              ) : (
                <button
                  onClick={() => onNavigate('profile')}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all"
                >
                  Cập nhật kỹ năng của tôi
                </button>
              )}
              <button
                onClick={() => onNavigate('explore')}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-xl transition-all"
              >
                Khám phá cộng đồng
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
