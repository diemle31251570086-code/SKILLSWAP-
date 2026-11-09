import React, { useState } from 'react';
import { X, Mail, Lock, User, GraduationCap, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'login' | 'register';
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  initialTab = 'login', 
  onClose,
  onSuccess 
}) => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword } = useAuth();
  
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [major, setMajor] = useState('Kinh doanh quốc tế');
  const [cohort, setCohort] = useState('K49');

  if (!isOpen) return null;

  const validateEmail = (emailStr: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailStr.trim());
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      let msg = err?.message || 'Đăng nhập Google không thành công. Vui lòng thử lại.';
      if (err?.code === 'auth/popup-closed-by-user') {
        msg = 'Cửa sổ đăng nhập Google đã bị đóng trước khi hoàn thành.';
      } else if (err?.code === 'auth/popup-blocked') {
        msg = 'Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép pop-up và thử lại.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    // 1. Validate Email
    if (!cleanEmail) {
      setError('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (!validateEmail(cleanEmail)) {
      setError('Địa chỉ email không đúng định dạng. Vui lòng nhập email hợp lệ (VD: student@st.ueh.edu.vn).');
      return;
    }

    // 2. Validate Password
    if (tab !== 'forgot') {
      if (!cleanPass) {
        setError('Vui lòng nhập mật khẩu.');
        return;
      }
      if (cleanPass.length < 6) {
        setError('Mật khẩu bảo mật phải có tối thiểu 6 ký tự.');
        return;
      }
    }

    // 3. Validate Registration specific fields
    if (tab === 'register') {
      if (!displayName.trim()) {
        setError('Vui lòng nhập họ và tên sinh viên.');
        return;
      }
      if (!confirmPassword) {
        setError('Vui lòng xác nhận lại mật khẩu.');
        return;
      }
      if (cleanPass !== confirmPassword.trim()) {
        setError('Mật khẩu xác nhận không khớp với mật khẩu đã nhập.');
        return;
      }
    }

    setLoading(true);

    try {
      if (tab === 'login') {
        await loginWithEmail(cleanEmail, cleanPass);
        onSuccess?.();
        onClose();
      } else if (tab === 'register') {
        await registerWithEmail(cleanEmail, cleanPass, displayName.trim(), studentId.trim(), major, cohort);
        setSuccessMsg('Đăng ký tài khoản thành công! Đang đăng nhập...');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 800);
      } else if (tab === 'forgot') {
        await resetPassword(cleanEmail);
        setSuccessMsg(`Email hướng dẫn khôi phục mật khẩu đã được gửi đến ${cleanEmail}. Vui lòng kiểm tra hộp thư (cả mục Spam/Rác).`);
      }
    } catch (err: any) {
      console.error('Auth action error:', err);
      let code = err?.code || '';
      let msg = err?.message || '';

      if (code === 'auth/email-already-in-use' || msg.includes('auth/email-already-in-use')) {
        setError('Email này đã được sử dụng cho một tài khoản khác. Vui lòng chọn tab "Đăng nhập" hoặc sử dụng chức năng "Quên mật khẩu".');
      } else if (code === 'auth/invalid-email' || msg.includes('auth/invalid-email')) {
        setError('Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại định dạng email.');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        setError('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra và thử lại.');
      } else if (code === 'auth/user-not-found' || msg.includes('auth/user-not-found')) {
        setError('Tài khoản không tồn tại trong hệ thống. Vui lòng đăng ký tài khoản mới.');
      } else if (code === 'auth/weak-password' || msg.includes('auth/weak-password')) {
        setError('Mật khẩu quá yếu. Mật khẩu phải có độ dài tối thiểu từ 6 ký tự.');
      } else if (code === 'auth/operation-not-allowed' || msg.includes('auth/operation-not-allowed')) {
        setError('Phương thức đăng ký Email/Mật khẩu chưa được kích hoạt trên Firebase Console. Vui lòng đăng nhập qua Google hoặc vào Firebase Console > Authentication > Sign-in method để bật Email/Password.');
      } else if (code === 'auth/too-many-requests' || msg.includes('auth/too-many-requests')) {
        setError('Bạn đã thử đăng nhập sai quá nhiều lần. Quyền truy cập tạm thời bị khóa, vui lòng đợi ít phút hoặc đặt lại mật khẩu.');
      } else if (code === 'auth/network-request-failed' || msg.includes('auth/network-request-failed')) {
        setError('Lỗi kết nối mạng tới máy chủ xác thực. Vui lòng kiểm tra đường truyền internet.');
      } else if (msg.includes('Missing or insufficient permissions')) {
        setError('Lỗi phân quyền Firestore khi tạo hồ sơ. Vui lòng thử lại hoặc liên hệ quản trị viên.');
      } else {
        setError(`Thao tác không thành công: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#173B65] to-[#3478C8] p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h3 className="text-xl font-bold">
            {tab === 'login' && 'Chào mừng trở lại!'}
            {tab === 'register' && 'Tạo tài khoản SkillSwap'}
            {tab === 'forgot' && 'Khôi phục mật khẩu'}
          </h3>
          <p className="text-xs text-blue-100 mt-1">
            {tab === 'login' && 'Đăng nhập để kết nối trao đổi kỹ năng cùng bạn bè UEH'}
            {tab === 'register' && 'Gia nhập cộng đồng học tập ngang hàng UEH Mekong'}
            {tab === 'forgot' && 'Nhập email để nhận đường dẫn đặt lại mật khẩu'}
          </p>

          {/* Tab Selector */}
          {tab !== 'forgot' && (
            <div className="flex bg-black/20 p-1 rounded-xl mt-4 max-w-xs mx-auto">
              <button
                type="button"
                onClick={() => { setTab('login'); setError(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  tab === 'login' ? 'bg-white text-[#173B65] shadow-xs' : 'text-blue-100 hover:text-white'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => { setTab('register'); setError(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  tab === 'register' ? 'bg-white text-[#173B65] shadow-xs' : 'text-blue-100 hover:text-white'
                }`}
              >
                Đăng ký
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google Sign-in */}
          {tab !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700 shadow-2xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Tiếp tục với tài khoản Google / Email UEH
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400">hoặc dùng email cá nhân</span>
                </div>
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {tab === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên sinh viên <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] focus:ring-1 focus:ring-[#3478C8] outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mã số sinh viên</label>
                    <input
                      type="text"
                      placeholder="312..."
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Khóa học</label>
                    <select
                      value={cohort}
                      onChange={(e) => setCohort(e.target.value)}
                      className="w-full px-2 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden bg-white"
                    >
                      <option value="K48">K48</option>
                      <option value="K49">K49</option>
                      <option value="K50">K50</option>
                      <option value="K51">K51</option>
                      <option value="Khác">Khác</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Chuyên ngành học tại UEH</label>
                  <select
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden bg-white"
                  >
                    <option value="Kinh doanh quốc tế">Kinh doanh quốc tế</option>
                    <option value="Marketing & Thương mại điện tử">Marketing & Thương mại điện tử</option>
                    <option value="Tài chính - Ngân hàng">Tài chính - Ngân hàng</option>
                    <option value="Kế toán - Kiểm toán">Kế toán - Kiểm toán</option>
                    <option value="Công nghệ thông tin & Khoa học dữ liệu">Công nghệ thông tin & Khoa học dữ liệu</option>
                    <option value="Quản trị kinh doanh">Quản trị kinh doanh</option>
                    <option value="Ngôn ngữ Anh thương mại">Ngôn ngữ Anh thương mại</option>
                    <option value="Luật kinh tế">Luật kinh tế</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Địa chỉ Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="student@st.ueh.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] focus:ring-1 focus:ring-[#3478C8] outline-hidden"
                />
              </div>
            </div>

            {tab !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  {tab === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setTab('forgot'); setError(null); }}
                      className="text-[11px] text-[#3478C8] hover:underline"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Tối thiểu 6 ký tự"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] focus:ring-1 focus:ring-[#3478C8] outline-hidden"
                  />
                </div>
              </div>
            )}

            {tab === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Xác nhận lại mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Nhập lại mật khẩu ở trên"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-[#3478C8] focus:ring-1 focus:ring-[#3478C8] outline-hidden"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#3478C8] hover:bg-blue-600 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-xs transition-all mt-2"
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <span>
                    {tab === 'login' && 'Đăng nhập vào hệ thống'}
                    {tab === 'register' && 'Đăng ký tài khoản mới'}
                    {tab === 'forgot' && 'Gửi link khôi phục'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Back Button */}
          {tab === 'forgot' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setTab('login'); setError(null); setSuccessMsg(null); }}
                className="text-xs text-slate-500 hover:text-[#3478C8]"
              >
                ← Quay lại trang Đăng nhập
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
