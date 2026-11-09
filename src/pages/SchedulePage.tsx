import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Video,
  Users,
  Repeat
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { getUserSchedules, updateScheduleStatus } from '../services/firebase.ts';
import { ScheduleItem } from '../types/index.ts';
import { ScheduleModal } from '../components/ScheduleModal.tsx';

interface SchedulePageProps {
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
}

export const SchedulePage: React.FC<SchedulePageProps> = ({ onNavigate, onOpenAuth }) => {
  const { currentUser, userProfile } = useAuth();
  
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await getUserSchedules(currentUser.uid);
      setSchedules(list);
    } catch (err) {
      console.error('Schedule load error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.uid]);

  if (!currentUser || !userProfile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <Calendar className="w-12 h-12 text-[#3478C8] mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Lịch trao đổi & Học tập</h2>
        <p className="text-xs text-slate-500">Đăng nhập để xem lịch học 1–1 và các buổi thảo luận nhóm sắp tới.</p>
        <button
          onClick={() => onOpenAuth('login')}
          className="px-5 py-2 bg-[#3478C8] text-white font-semibold text-xs rounded-xl"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  const handleStatus = async (id: string, status: ScheduleItem['status']) => {
    try {
      await updateScheduleStatus(id, status);
      await loadData();
    } catch (err) {
      console.error('Update status error', err);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = schedules.filter(s => {
    if (filter === 'upcoming') {
      return s.status !== 'completed' && s.status !== 'cancelled';
    }
    if (filter === 'completed') {
      return s.status === 'completed';
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#173B65] tracking-tight">
            Lịch trao đổi kỹ năng & Học nhóm
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Theo dõi, sắp xếp lịch học trực tiếp tại UEH Mekong hoặc học online qua Google Meet
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#3478C8] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md transition-all"
        >
          <Plus className="w-4 h-4" /> Lên lịch trao đổi mới
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'upcoming' ? 'bg-[#173B65] text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Sắp diễn ra
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'completed' ? 'bg-[#173B65] text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Đã hoàn thành
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filter === 'all' ? 'bg-[#173B65] text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tất cả lịch ({schedules.length})
        </button>
      </div>

      {/* Schedule List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          Đang tải lịch trao đổi...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-center space-y-3">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="font-bold text-slate-700 text-sm">Chưa có buổi học nào trong mục này</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hãy kết nối với bạn học hoặc tham gia nhóm học tập để lên lịch trao đổi kỹ năng!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((sc) => {
            const isConfirmed = sc.status === 'confirmed';
            const isCompleted = sc.status === 'completed';
            const isCancelled = sc.status === 'cancelled';

            return (
              <div 
                key={sc.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-blue-100 text-[#3478C8] uppercase">
                      {sc.type === '1-on-1' ? <Repeat className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      {sc.type}
                    </span>

                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                      isCompleted ? 'bg-emerald-100 text-emerald-800' :
                      isCancelled ? 'bg-rose-100 text-rose-800' :
                      isConfirmed ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {sc.status === 'proposed' && 'Đề xuất'}
                      {sc.status === 'confirmed' && 'Đã xác nhận'}
                      {sc.status === 'completed' && 'Hoàn thành'}
                      {sc.status === 'cancelled' && 'Đã hủy'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-800 text-base mb-1">{sc.title}</h3>
                  <p className="text-xs text-slate-500 mb-3">Kỹ năng: <strong className="text-slate-700">{sc.skillName}</strong></p>

                  <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#3478C8] shrink-0" />
                      <span>{sc.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#3478C8] shrink-0" />
                      <span>{sc.startTime} - {sc.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#3478C8] shrink-0" />
                      <span className="truncate">{sc.locationOrLink}</span>
                    </div>
                  </div>

                  {sc.notes && (
                    <p className="text-xs text-slate-500 italic mb-4">
                      Ghi chú: {sc.notes}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                {!isCompleted && !isCancelled && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {sc.status === 'proposed' && (
                      <button
                        onClick={() => handleStatus(sc.id, 'confirmed')}
                        className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl text-center shadow-2xs"
                      >
                        Xác nhận lịch
                      </button>
                    )}

                    <button
                      onClick={() => handleStatus(sc.id, 'completed')}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl text-center shadow-2xs"
                    >
                      Hoàn thành
                    </button>

                    <button
                      onClick={() => handleStatus(sc.id, 'cancelled')}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                      title="Hủy lịch"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Schedule Modal */}
      {isModalOpen && (
        <ScheduleModal
          isOpen={isModalOpen}
          type="1-on-1"
          targetId={currentUser.uid}
          targetName="Buổi trao đổi tự do"
          skillName="Trao đổi kỹ năng chung"
          participants={[currentUser.uid]}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            alert('Lịch học mới đã được tạo!');
            loadData();
          }}
        />
      )}

    </div>
  );
};
