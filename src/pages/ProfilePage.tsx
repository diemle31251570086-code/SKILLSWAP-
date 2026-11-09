import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  GraduationCap, 
  Edit3, 
  Plus, 
  Trash2, 
  Star, 
  Check, 
  Save, 
  BookOpen, 
  Clock, 
  MapPin, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { getReviewsForTarget, updateUserProfile } from '../services/firebase.ts';
import { ReviewItem, UserSkillItem, SkillLevel, StudyMode } from '../types/index.ts';

interface ProfilePageProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate, onOpenAuth }) => {
  const { currentUser, userProfile, refreshProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [major, setMajor] = useState('');
  const [cohort, setCohort] = useState('');
  const [bio, setBio] = useState('');
  const [learningPreferences, setLearningPreferences] = useState<StudyMode>('Hybrid');
  const [availableTime, setAvailableTime] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  // Skills
  const [skillsToShare, setSkillsToShare] = useState<UserSkillItem[]>([]);
  const [skillsToLearn, setSkillsToLearn] = useState<UserSkillItem[]>([]);

  // Add skill inputs
  const [newShareName, setNewShareName] = useState('');
  const [newShareLevel, setNewShareLevel] = useState<SkillLevel>('Trung cấp');
  const [newLearnName, setNewLearnName] = useState('');
  const [newLearnLevel, setNewLearnLevel] = useState<SkillLevel>('Cơ bản');

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setStudentId(userProfile.studentId || '');
      setMajor(userProfile.major || 'Kinh doanh quốc tế');
      setCohort(userProfile.cohort || 'K49');
      setBio(userProfile.bio || '');
      setLearningPreferences(userProfile.learningPreferences || 'Hybrid');
      setAvailableTime(userProfile.availableTime || 'Tối thứ 2, thứ 4, thứ 6');
      setPhotoURL(userProfile.photoURL || '');
      setSkillsToShare(userProfile.skillsToShare || []);
      setSkillsToLearn(userProfile.skillsToLearn || []);

      // Load reviews
      getReviewsForTarget(userProfile.id).then(setReviews).catch(() => {});
    }
  }, [userProfile]);

  if (!currentUser || !userProfile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <User className="w-12 h-12 text-[#3478C8] mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Hồ sơ sinh viên</h2>
        <p className="text-xs text-slate-500">Đăng nhập để xem và quản lý hồ sơ kỹ năng của bạn.</p>
        <button
          onClick={() => onOpenAuth('login')}
          className="px-5 py-2 bg-[#3478C8] text-white font-semibold text-xs rounded-xl"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);

    try {
      await updateUserProfile(currentUser.uid, {
        displayName,
        studentId,
        major,
        cohort,
        bio,
        learningPreferences,
        availableTime,
        photoURL,
        skillsToShare,
        skillsToLearn,
        isProfileComplete: true
      });
      await refreshProfile();
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Update profile error', err);
      alert('Không thể lưu thông tin hồ sơ.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddShareSkill = () => {
    if (!newShareName.trim()) return;
    const newItem: UserSkillItem = {
      id: Date.now().toString(),
      name: newShareName.trim(),
      level: newShareLevel
    };
    const updated = [...skillsToShare, newItem];
    setSkillsToShare(updated);
    setNewShareName('');
  };

  const handleRemoveShareSkill = (id: string) => {
    setSkillsToShare(skillsToShare.filter(s => s.id !== id));
  };

  const handleAddLearnSkill = () => {
    if (!newLearnName.trim()) return;
    const newItem: UserSkillItem = {
      id: Date.now().toString(),
      name: newLearnName.trim(),
      level: newLearnLevel
    };
    const updated = [...skillsToLearn, newItem];
    setSkillsToLearn(updated);
    setNewLearnName('');
  };

  const handleRemoveLearnSkill = (id: string) => {
    setSkillsToLearn(skillsToLearn.filter(s => s.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Banner & Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-[#173B65] via-[#24548d] to-[#3478C8] relative"></div>

        <div className="px-6 pb-6 relative pt-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 -mt-16 sm:-mt-12 mb-4">
            
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              <img
                src={photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`}
                alt={displayName}
                className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-md bg-white"
              />
              <div className="space-y-1">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-800">{displayName}</h1>
                  {userProfile.role === 'superadmin' ? (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800">
                      Super Admin
                    </span>
                  ) : userProfile.role === 'admin' ? (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-100 text-indigo-800">
                      Admin
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Sinh viên UEH Mekong
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 font-medium">
                  {major} • Khóa {cohort} • MSSV: {studentId || 'Chưa cập nhật'}
                </p>

                <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-slate-600 pt-1">
                  <div className="flex items-center text-amber-500 font-bold gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span>{userProfile.rating || 5.0}</span>
                    <span className="text-slate-400 font-normal">({reviews.length} đánh giá)</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-colors shadow-2xs"
                >
                  <Edit3 className="w-4 h-4 text-slate-600" /> Chỉnh sửa hồ sơ
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </div>

          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              Đã cập nhật hồ sơ và kỹ năng thành công!
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Personal info & Preferences */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider text-[11px]">Thông tin học tập</h3>
            
            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Họ và tên</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Mã số sinh viên (MSSV)</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Ngành học</label>
                  <input
                    type="text"
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Khóa học</label>
                  <input
                    type="text"
                    value={cohort}
                    onChange={(e) => setCohort(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Hình thức học mong muốn</label>
                  <select
                    value={learningPreferences}
                    onChange={(e: any) => setLearningPreferences(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-hidden bg-white"
                  >
                    <option value="Hybrid">Kết hợp (Hybrid)</option>
                    <option value="Online">Chỉ học Online</option>
                    <option value="Offline">Trực tiếp tại Cơ sở</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Thời gian rảnh</label>
                  <input
                    type="text"
                    value={availableTime}
                    onChange={(e) => setAvailableTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Giới thiệu bản thân</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-[#3478C8] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  {loading ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
              </form>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Email sinh viên:</span>
                  <span className="font-semibold text-slate-700">{userProfile.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Hình thức học:</span>
                  <span className="font-semibold text-slate-700">{userProfile.learningPreferences || 'Hybrid'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Thời gian rảnh:</span>
                  <span className="font-semibold text-slate-700">{userProfile.availableTime || 'Linh hoạt'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Giới thiệu:</span>
                  <p className="text-slate-600 mt-1 italic leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    "{userProfile.bio || 'Chưa cập nhật giới thiệu bản thân.'}"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Middle & Right: Skills Management & Reviews */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Skills to Share */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-emerald-800 text-sm uppercase tracking-wider text-[11px]">
                  Kỹ năng bạn có thể chia sẻ ({skillsToShare.length})
                </h3>
                <p className="text-[11px] text-slate-500">Giúp các bạn sinh viên khác tìm thấy và gửi lời mời học hỏi</p>
              </div>
            </div>

            {/* List */}
            <div className="flex flex-wrap gap-2">
              {skillsToShare.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Bạn chưa thêm kỹ năng nào có thể chia sẻ.</p>
              ) : (
                skillsToShare.map((s) => (
                  <span 
                    key={s.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-900 border border-emerald-200/80 rounded-xl text-xs font-semibold"
                  >
                    <span>{s.name} <strong className="text-[10px] text-emerald-600 font-bold">({s.level})</strong></span>
                    {isEditing && (
                      <button 
                        type="button"
                        onClick={() => handleRemoveShareSkill(s.id)}
                        className="text-emerald-500 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>

            {/* Add Share Skill Input */}
            {isEditing && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap sm:flex-nowrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Tên kỹ năng (VD: Thiết kế Canva, Lập trình Python, IELTS Speaking...)"
                  value={newShareName}
                  onChange={(e) => setNewShareName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 outline-hidden"
                />
                <select
                  value={newShareLevel}
                  onChange={(e: any) => setNewShareLevel(e.target.value)}
                  className="px-2 py-1.5 text-xs rounded-xl border border-slate-300 outline-hidden bg-white"
                >
                  <option value="Cơ bản">Cơ bản</option>
                  <option value="Trung cấp">Trung cấp</option>
                  <option value="Nâng cao">Nâng cao</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddShareSkill}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shrink-0"
                >
                  + Thêm
                </button>
              </div>
            )}
          </div>

          {/* Skills to Learn */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-blue-800 text-sm uppercase tracking-wider text-[11px]">
                  Kỹ năng bạn muốn học hỏi ({skillsToLearn.length})
                </h3>
                <p className="text-[11px] text-slate-500">Hệ thống sẽ dựa vào đây để gợi ý người trao đổi tương thích</p>
              </div>
            </div>

            {/* List */}
            <div className="flex flex-wrap gap-2">
              {skillsToLearn.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Bạn chưa thêm kỹ năng nào muốn học.</p>
              ) : (
                skillsToLearn.map((s) => (
                  <span 
                    key={s.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-900 border border-blue-200/80 rounded-xl text-xs font-semibold"
                  >
                    <span>{s.name}</span>
                    {isEditing && (
                      <button 
                        type="button"
                        onClick={() => handleRemoveLearnSkill(s.id)}
                        className="text-blue-500 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>

            {/* Add Learn Skill Input */}
            {isEditing && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap sm:flex-nowrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Tên kỹ năng muốn học (VD: Lập trình Web, Excel Dashboard...)"
                  value={newLearnName}
                  onChange={(e) => setNewLearnName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddLearnSkill}
                  className="px-4 py-1.5 bg-[#3478C8] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shrink-0"
                >
                  + Thêm
                </button>
              </div>
            )}
          </div>

          {/* Reviews Received */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider text-[11px]">
              Đánh giá từ bạn học ({reviews.length})
            </h3>

            {reviews.length === 0 ? (
              <p className="text-xs text-slate-400 italic">
                Chưa có nhận xét nào. Sau các buổi trao đổi hoàn thành, bạn học sẽ để lại nhận xét tại đây!
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{r.reviewerName}</span>
                      <div className="flex items-center text-amber-500 gap-1 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{r.rating}/5</span>
                      </div>
                    </div>
                    <p className="text-slate-600 leading-relaxed italic">"{r.comment}"</p>
                    <span className="text-[10px] text-slate-400 block pt-1">
                      {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
