import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  CheckCircle, 
  Lock, 
  Globe, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { getStudyGroups, createStudyGroup, joinGroupTransaction, getSkillCategories } from '../services/firebase.ts';
import { StudyGroup, SkillCategory } from '../types/index.ts';

interface GroupsPageProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
}

function computeGroupMatchScore(group: StudyGroup, user: UserProfile | null): { score: number; reason: string } {
  if (!user) return { score: 60, reason: 'Cùng cộng đồng sinh viên UEH Mekong' };
  const topic = `${group.skillNeeded} ${group.topic} ${group.description}`.toLowerCase();
  const learnMatch = (user.skillsToLearn || []).some(s => topic.includes(s.name.toLowerCase()));
  const shareMatch = (user.skillsToShare || []).some(s => topic.includes(s.name.toLowerCase()));
  if (learnMatch && shareMatch) {
    return { score: 95, reason: 'Rất phù hợp: Đúng môn bạn cần học & có thể cùng chia sẻ' };
  }
  if (learnMatch) {
    return { score: 88, reason: 'Phù hợp: Nhóm đang học kỹ năng bạn muốn trau dồi' };
  }
  if (shareMatch) {
    return { score: 82, reason: 'Tiềm năng: Bạn có thể đóng vai trò cố vấn cho nhóm' };
  }
  return { score: 65, reason: 'Cùng sinh hoạt tại phân hiệu UEH Mekong' };
}

export const GroupsPage: React.FC<GroupsPageProps> = ({ onNavigate, onOpenAuth }) => {
  const { currentUser, userProfile } = useAuth();

  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMode, setSelectedMode] = useState('all');

  // Create Group Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // New Group Form States
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [skillNeeded, setSkillNeeded] = useState('');
  const [category, setCategory] = useState('tech');
  const [description, setDescription] = useState('');
  const [minMembers, setMinMembers] = useState(3);
  const [maxMembers, setMaxMembers] = useState(6);
  const [mode, setMode] = useState<'online' | 'offline' | 'hybrid'>('hybrid');
  const [schedule, setSchedule] = useState('Tối thứ 3 & thứ 5 hàng tuần');
  const [location, setLocation] = useState('Cơ sở UEH Mekong hoặc Google Meet');
  const [isPublic, setIsPublic] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [gList, cList] = await Promise.all([
        getStudyGroups(),
        getSkillCategories()
      ]);
      setGroups(gList);
      setCategories(cList);
    } catch (err) {
      console.error('Groups load error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) {
      onOpenAuth('login');
      return;
    }

    if (!name.trim() || !skillNeeded.trim()) {
      setCreateError('Vui lòng nhập tên nhóm và kỹ năng trọng tâm.');
      return;
    }

    setCreateLoading(true);
    setCreateError(null);
    try {
      const groupId = await createStudyGroup({
        name: name.trim(),
        topic: topic.trim() || name.trim(),
        skillNeeded: skillNeeded.trim(),
        category,
        description: description.trim(),
        minMembers,
        maxMembers,
        mode,
        schedule: schedule.trim(),
        location: location.trim(),
        isPublic,
        user: userProfile
      });
      setIsCreateModalOpen(false);
      await loadData();
      onNavigate('group-detail', { groupId });
    } catch (err: any) {
      setCreateError(err?.message || 'Không thể tạo nhóm, vui lòng thử lại.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Quick Join via atomic transaction
  const handleQuickJoin = async (group: StudyGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser || !userProfile) {
      onOpenAuth('login');
      return;
    }

    if (!group.isPublic) {
      // Direct user to detail page to submit join request
      onNavigate('group-detail', { groupId: group.id });
      return;
    }

    setJoiningGroupId(group.id);
    try {
      await joinGroupTransaction(group.id, userProfile);
      alert(`Chúc mừng! Bạn đã tham gia thành công nhóm "${group.name}".`);
      await loadData();
      onNavigate('group-detail', { groupId: group.id });
    } catch (err: any) {
      alert(err?.message || 'Không thể tham gia nhóm.');
    } finally {
      setJoiningGroupId(null);
    }
  };

  const filteredGroups = groups.filter(g => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = g.name.toLowerCase().includes(q);
      const matchTopic = (g.topic || '').toLowerCase().includes(q);
      const matchSkill = (g.skillNeeded || '').toLowerCase().includes(q);
      if (!matchName && !matchTopic && !matchSkill) return false;
    }
    if (selectedCategory && g.category !== selectedCategory) return false;
    if (selectedMode !== 'all' && g.mode !== selectedMode) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173B65] tracking-tight">
            Nhóm Học tập & Trao đổi Kỹ năng
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quy mô lý tưởng 3–6 sinh viên, giao dịch nguyên tử (Atomic Transaction) chống trùng thành viên
          </p>
        </div>

        <button
          onClick={() => {
            if (!currentUser) onOpenAuth('login');
            else setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#3478C8] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          Tạo nhóm học tập mới
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Tìm theo tên nhóm, môn học, kỹ năng cần ôn tập..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Danh mục:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium outline-hidden"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Hình thức:</span>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium outline-hidden"
            >
              <option value="all">Tất cả hình thức</option>
              <option value="online">Trực tuyến (Online)</option>
              <option value="offline">Trực tiếp tại Cơ sở</option>
              <option value="hybrid">Kết hợp (Hybrid)</option>
            </select>
          </div>

          {(search || selectedCategory || selectedMode !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('');
                setSelectedMode('all');
              }}
              className="text-xs text-rose-500 hover:underline font-semibold ml-auto"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Group Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          Đang tải danh sách nhóm học tập...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
          <Users className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-700 text-sm">Chưa tìm thấy nhóm học tập phù hợp</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hãy điều chỉnh từ khóa tìm kiếm hoặc bấm nút "Tạo nhóm học tập mới" để làm chủ nhóm ngay hôm nay!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => {
            const percent = Math.round((group.currentMembersCount / group.maxMembers) * 100);
            const isFull = group.currentMembersCount >= group.maxMembers;
            const isOwner = currentUser?.uid === group.ownerId;

            return (
              <div
                key={group.id}
                onClick={() => onNavigate('group-detail', { groupId: group.id })}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-100 text-[#3478C8] uppercase">
                        {group.mode}
                      </span>
                      {group.isPublic ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 rounded-lg">
                          <Globe className="w-3 h-3" /> Công khai
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-800 rounded-lg">
                          <Lock className="w-3 h-3" /> Cần duyệt
                        </span>
                      )}
                    </div>

                    <span className={`text-xs font-bold ${isFull ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {group.currentMembersCount}/{group.maxMembers} thành viên
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-800 text-base mb-1 line-clamp-1">{group.name}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">{group.description}</p>

                  <div className="space-y-1.5 text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <p className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#3478C8] shrink-0" />
                      <span>Kỹ năng: <strong className="text-slate-700">{group.skillNeeded}</strong></span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#3478C8] shrink-0" />
                      <span>Lịch: <strong className="text-slate-700">{group.schedule}</strong></span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#3478C8] shrink-0" />
                      <span className="truncate">Địa điểm: <strong className="text-slate-700">{group.location}</strong></span>
                    </p>
                  </div>
                </div>

                <div>
                  {/* Member Capacity Progress */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-3">
                    <div 
                      className={`h-full rounded-full ${isFull ? 'bg-amber-500' : 'bg-[#3478C8]'}`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500">
                      Chủ nhóm: <strong className="text-slate-700">{group.ownerName}</strong>
                    </span>

                    {isOwner ? (
                      <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl">
                        Bạn là Chủ nhóm
                      </span>
                    ) : isFull ? (
                      <span className="px-3 py-1.5 bg-slate-100 text-slate-500 font-bold text-xs rounded-xl">
                        Đã đủ số lượng
                      </span>
                    ) : (
                      <button
                        disabled={joiningGroupId === group.id}
                        onClick={(e) => handleQuickJoin(group, e)}
                        className="px-4 py-1.5 bg-[#3478C8] hover:bg-blue-600 text-white font-semibold text-xs rounded-xl shadow-2xs transition-all disabled:opacity-50"
                      >
                        {joiningGroupId === group.id ? 'Đang vào...' : group.isPublic ? 'Tham gia ngay' : 'Gửi yêu cầu'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#173B65] to-[#3478C8] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-bold text-base">Thành lập nhóm học tập mới</h3>
                  <p className="text-xs text-blue-100">Cùng đồng hành và trao đổi kiến thức tại UEH Mekong</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-full hover:bg-white/10 text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên nhóm học tập <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nhóm Luyện Speaking IELTS 6.5+ UEH Mekong"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kỹ năng trọng tâm <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: IELTS, Excel Dashboard, Canva..."
                    value={skillNeeded}
                    onChange={(e) => setSkillNeeded(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lĩnh vực / Danh mục</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mục tiêu & Mô tả hoạt động</label>
                <textarea
                  rows={3}
                  placeholder="Mô tả chi tiết mục tiêu nhóm, lộ trình học tập, tài liệu sử dụng..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số thành viên tối thiểu</label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={minMembers}
                    onChange={(e) => setMinMembers(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Số thành viên tối đa (3–6)</label>
                  <input
                    type="number"
                    min={3}
                    max={12}
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hình thức học</label>
                  <select
                    value={mode}
                    onChange={(e: any) => setMode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden bg-white"
                  >
                    <option value="hybrid">Kết hợp (Hybrid)</option>
                    <option value="online">Trực tuyến (Online)</option>
                    <option value="offline">Trực tiếp tại Cơ sở</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lịch học dự kiến</label>
                  <input
                    type="text"
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Địa điểm hoặc nền tảng trực tuyến</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded border-slate-300 text-[#3478C8] focus:ring-[#3478C8]"
                  />
                  <span>Nhóm công khai (Sinh viên có thể tham gia trực tiếp mà không cần chủ nhóm duyệt)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#3478C8] hover:bg-blue-600 rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  {createLoading ? 'Đang tạo...' : 'Tạo nhóm ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
