import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Repeat, 
  Star, 
  MapPin, 
  GraduationCap, 
  BookOpen, 
  UserCheck, 
  Send, 
  Sparkles,
  Info,
  MessageSquare,
  Bot
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { getPublicStudents, getSkillCategories, getSkills } from '../services/firebase.ts';
import { UserProfile, SkillCategory, SkillItem } from '../types/index.ts';
import { AIAgentProfile } from '../data/aiAgents.ts';
import { fetchAIAgents } from '../services/aiService.ts';
import { ConnectModal } from '../components/ConnectModal.tsx';

interface ExplorePageProps {
  initialQuery?: string;
  initialCategory?: string;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onNavigate: (page: string, params?: any) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  initialQuery = '',
  initialCategory = '',
  onOpenAuth,
  onNavigate
}) => {
  const { currentUser, userProfile } = useAuth();
  
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [aiAgents, setAiAgents] = useState<AIAgentProfile[]>([]);
  const [demoModeActive, setDemoModeActive] = useState(true);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [studentTypeFilter, setStudentTypeFilter] = useState<'all' | 'real' | 'ai'>('all');
  const [activeTab, setActiveTab] = useState<'students' | 'skills'>('students');

  // Selected student for ConnectModal
  const [targetStudentForConnect, setTargetStudentForConnect] = useState<UserProfile | null>(null);
  // Selected student for viewing details
  const [viewingStudent, setViewingStudent] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [stList, catList, skillList, aiData] = await Promise.all([
          getPublicStudents(),
          getSkillCategories(),
          getSkills(),
          fetchAIAgents().catch(() => ({ agents: [], demoModeActive: true, aiAutonomousMode: true, stats: { totalCalls: 0, estimatedTokens: 0, activeAgentsCount: 0 } }))
        ]);
        setStudents(stList);
        setCategories(catList);
        setSkills(skillList);
        if (aiData && aiData.agents) {
          setAiAgents(aiData.agents.filter(a => a.enabled));
          setDemoModeActive(aiData.demoModeActive);
        }
      } catch (err) {
        console.error('Explore load error', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Combined list of real students and simulated AI agents (when enabled)
  const combinedList: (UserProfile & { isAI?: boolean })[] = [
    ...students.map((s: UserProfile) => ({ ...s, isAI: false })),
    ...(demoModeActive ? aiAgents.map((a: AIAgentProfile) => ({ ...a, isAI: true })) : [])
  ];

  // Filtered Students
  const filteredStudents = combinedList.filter(st => {
    // Hide self from exchange listing
    if (currentUser?.uid && st.id === currentUser.uid) return false;

    // Filter by student type (real vs AI)
    if (studentTypeFilter === 'real' && st.isAI) return false;
    if (studentTypeFilter === 'ai' && !st.isAI) return false;

    // Search query matches name, major, skills
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = st.displayName.toLowerCase().includes(q);
      const matchMajor = (st.major || '').toLowerCase().includes(q);
      const matchShare = st.skillsToShare?.some(s => s.name.toLowerCase().includes(q));
      const matchLearn = st.skillsToLearn?.some(s => s.name.toLowerCase().includes(q));
      if (!matchName && !matchMajor && !matchShare && !matchLearn) return false;
    }

    // Filter by mode
    if (selectedMode !== 'all' && st.learningPreferences && st.learningPreferences !== selectedMode) {
      return false;
    }

    // Filter by cohort
    if (selectedCohort !== 'all' && st.cohort && st.cohort !== selectedCohort) {
      return false;
    }

    return true;
  });

  const handleOpenConnect = (st: UserProfile) => {
    if (!currentUser) {
      onOpenAuth('login');
      return;
    }
    setTargetStudentForConnect(st);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173B65] tracking-tight">
          Khám phá Kỹ năng & Sinh viên UEH Mekong
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Tìm kiếm bạn học có kỹ năng bạn muốn tiếp cận, gửi lời mời trao đổi hoặc xem danh mục kỹ năng
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        
        {/* Search input */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm theo tên kỹ năng (VD: Excel, Canva, IELTS, Python...), tên sinh viên, ngành học..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden text-slate-800"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
          
          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Danh mục:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium outline-hidden"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c: SkillCategory) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Mode Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Hình thức học:</span>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium outline-hidden"
            >
              <option value="all">Tất cả hình thức</option>
              <option value="Online">Chỉ học Online</option>
              <option value="Offline">Trực tiếp tại Cơ sở</option>
              <option value="Hybrid">Kết hợp (Hybrid)</option>
            </select>
          </div>

          {/* Cohort Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Khóa:</span>
            <select
              value={selectedCohort}
              onChange={(e) => setSelectedCohort(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium outline-hidden"
            >
              <option value="all">Tất cả khóa</option>
              <option value="K48">K48</option>
              <option value="K49">K49</option>
              <option value="K50">K50</option>
              <option value="K51">K51</option>
            </select>
          </div>

          {/* Student Type Filter: All / Real UEH / AI Simulation */}
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <span className="text-slate-500 font-medium">Đối tượng:</span>
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStudentTypeFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  studentTypeFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tất cả ({combinedList.length})
              </button>
              <button
                type="button"
                onClick={() => setStudentTypeFilter('real')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  studentTypeFilter === 'real' ? 'bg-white text-[#3478C8] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sinh viên UEH ({students.length})
              </button>
              <button
                type="button"
                onClick={() => setStudentTypeFilter('ai')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
                  studentTypeFilter === 'ai' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-700 hover:text-purple-900'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Sinh viên AI ({aiAgents.length})
              </button>
            </div>
          </div>

          {(search || selectedCategory || selectedMode !== 'all' || selectedCohort !== 'all' || studentTypeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('');
                setSelectedMode('all');
                setSelectedCohort('all');
                setStudentTypeFilter('all');
              }}
              className="text-xs text-rose-500 hover:underline font-semibold ml-auto"
            >
              Xóa bộ lọc
            </button>
          )}

        </div>

      </div>

      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-2 px-1 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'students' 
                ? 'border-[#3478C8] text-[#3478C8]' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Hồ sơ sinh viên & AI ({filteredStudents.length})
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`pb-2 px-1 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'skills' 
                ? 'border-[#3478C8] text-[#3478C8]' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Danh mục & Kỹ năng cộng đồng
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'students' ? (
        <>
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Đang tải danh sách sinh viên UEH Mekong...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-700 text-sm">Không tìm thấy sinh viên phù hợp</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Hãy thử tìm kiếm với từ khóa khác hoặc điều chỉnh lại bộ lọc danh mục và hình thức học.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map((st) => (
                <div
                  key={st.id}
                  className={`rounded-3xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between border ${
                    st.isAI 
                      ? 'border-purple-200 bg-gradient-to-b from-white to-purple-50/30' 
                      : 'bg-white border-slate-200/80'
                  }`}
                >
                  <div>
                    {/* Top Student Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={st.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(st.displayName)}`}
                            alt={st.displayName}
                            className={`w-12 h-12 rounded-2xl object-cover border ${st.isAI ? 'border-purple-300 ring-2 ring-purple-100' : 'border-slate-200'}`}
                          />
                          {st.isAI && (
                            <span 
                              title="Tài khoản AI mô phỏng – Tương tác được hỗ trợ bởi trí tuệ nhân tạo (Gemini)" 
                              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] shadow-xs"
                            >
                              <Bot className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-slate-800 text-sm leading-tight">{st.displayName}</h3>
                            {st.isAI && (
                              <span 
                                title="Tài khoản AI mô phỏng – Tương tác được hỗ trợ bởi trí tuệ nhân tạo"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-purple-600" /> AI mô phỏng
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">{st.major || 'Sinh viên UEH'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {st.cohort || 'UEH Mekong'}
                            </span>
                            <div className="flex items-center text-amber-500 text-xs font-bold gap-0.5">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>{st.rating || 5.0}</span>
                              <span className="text-[10px] text-slate-400 font-normal">({st.reviewCount || 0})</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bio */}
                    {st.bio && (
                      <p className={`text-xs line-clamp-2 mb-3 italic p-2.5 rounded-xl border ${
                        st.isAI ? 'text-purple-900 bg-purple-50/50 border-purple-100' : 'text-slate-600 bg-slate-50 border-slate-100'
                      }`}>
                        "{st.bio}"
                      </p>
                    )}

                    {/* Skills to Share */}
                    <div className="mb-2.5">
                      <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Có thể chia sẻ:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {st.skillsToShare && st.skillsToShare.length > 0 ? (
                          st.skillsToShare.map((s, idx) => (
                            <span 
                              key={idx} 
                              className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                            >
                              {s.name} <span className="text-[9px] opacity-75">({s.level})</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400">Đang cập nhật...</span>
                        )}
                      </div>
                    </div>

                    {/* Skills to Learn */}
                    <div className="mb-4">
                      <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Mong muốn học:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {st.skillsToLearn && st.skillsToLearn.length > 0 ? (
                          st.skillsToLearn.map((s, idx) => (
                            <span 
                              key={idx} 
                              className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200/60"
                            >
                              {s.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400">Đang cập nhật...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setViewingStudent(st)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Chi tiết
                    </button>
                    
                    <div className="flex items-center gap-1.5">
                      {st.isAI ? (
                        <>
                          <button
                            onClick={() => onNavigate('messages', { conversationId: `conv_${st.id}` })}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all"
                            title="Trò chuyện tương tác với sinh viên AI"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                            Trò chuyện AI
                          </button>
                          <button
                            onClick={() => handleOpenConnect(st)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-2xs transition-all"
                          >
                            <Repeat className="w-3.5 h-3.5" />
                            Gửi lời mời
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleOpenConnect(st)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#3478C8] hover:bg-blue-600 rounded-xl shadow-2xs transition-all"
                        >
                          <Repeat className="w-3.5 h-3.5" />
                          Gửi lời mời
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Skills catalog tab */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat: SkillCategory) => {
              const catSkills = skills.filter((s: SkillItem) => s.categoryId === cat.id);
              return (
                <div key={cat.id} className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">{cat.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{cat.description}</p>
                  </div>

                  <div className="space-y-2">
                    {catSkills.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Chưa có kỹ năng cụ thể được thêm.</p>
                    ) : (
                      catSkills.map((sk: SkillItem) => (
                        <div 
                          key={sk.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-blue-50 transition-colors text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">{sk.name}</p>
                            <span className="text-[10px] text-slate-400">{sk.level}</span>
                          </div>
                          <button
                            onClick={() => {
                              setSearch(sk.name);
                              setActiveTab('students');
                            }}
                            className="text-[11px] font-bold text-[#3478C8] hover:underline"
                          >
                            Tìm người dạy →
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connect Modal */}
      {targetStudentForConnect && (
        <ConnectModal
          isOpen={Boolean(targetStudentForConnect)}
          targetUser={targetStudentForConnect}
          onClose={() => setTargetStudentForConnect(null)}
          onSuccess={() => {
            // refreshed state
          }}
          onNavigate={onNavigate}
        />
      )}

      {/* Student Profile Detail View Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#173B65] to-[#3478C8] p-6 text-white text-center relative">
              <button
                onClick={() => setViewingStudent(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                ✕
              </button>
              <img
                src={viewingStudent.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(viewingStudent.displayName)}`}
                alt={viewingStudent.displayName}
                className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-white/20 shadow-md mb-2"
              />
              <h3 className="text-lg font-bold">{viewingStudent.displayName}</h3>
              <p className="text-xs text-blue-100">{viewingStudent.major} • {viewingStudent.cohort || 'UEH Mekong'}</p>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Giới thiệu bản thân</h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {viewingStudent.bio || 'Chưa cập nhật phần giới thiệu.'}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Kỹ năng có thể chia sẻ</h4>
                <div className="flex flex-wrap gap-2">
                  {viewingStudent.skillsToShare?.map((s: { name: string; level: string }, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold">
                      {s.name} ({s.level})
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Kỹ năng mong muốn học</h4>
                <div className="flex flex-wrap gap-2">
                  {viewingStudent.skillsToLearn?.map((s: { name: string }, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-xl text-xs font-semibold">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>

              {viewingStudent.id.startsWith('ai_') && (
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-xs text-purple-900 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Tài khoản AI mô phỏng – SkillSwap UEH Mekong</p>
                    <p className="text-[11px] leading-relaxed text-purple-700">
                      Tài khoản AI mô phỏng được phát triển nhằm đồng hành học tập cùng bạn, trả lời và chia sẻ kinh nghiệm học tập theo đúng chuyên ngành. Tương tác được vận hành bởi mô hình Gemini 3.8 Flash.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Hình thức học:</span>
                  <span className="font-bold text-slate-700">{viewingStudent.learningPreferences || 'Linh hoạt'}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block text-[10px]">Thời gian rảnh:</span>
                  <span className="font-bold text-slate-700">{viewingStudent.availableTime || 'Trao đổi qua tin nhắn'}</span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  onClick={() => setViewingStudent(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Đóng
                </button>
                {viewingStudent.id.startsWith('ai_') && (
                  <button
                    onClick={() => {
                      const st = viewingStudent;
                      setViewingStudent(null);
                      onNavigate('messages', { conversationId: `conv_${st.id}` });
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-xl shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Trò chuyện AI ngay
                  </button>
                )}
                <button
                  onClick={() => {
                    const st = viewingStudent;
                    setViewingStudent(null);
                    handleOpenConnect(st);
                  }}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#3478C8] hover:bg-blue-600 rounded-xl shadow-xs"
                >
                  Gửi lời mời trao đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
