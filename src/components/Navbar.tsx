import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Users, 
  Repeat, 
  Calendar, 
  MessageSquare, 
  Bell, 
  User, 
  ShieldCheck, 
  LogOut, 
  Menu, 
  X, 
  Check, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { getUserNotifications, markNotificationAsRead } from '../services/firebase.ts';
import { NotificationItem } from '../types/index.ts';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth: (initialTab?: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, onOpenAuth }) => {
  const { currentUser, userProfile, isAdmin, isSuperAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (currentUser?.uid) {
      getUserNotifications(currentUser.uid).then(setNotifications).catch(() => {});
    }
  }, [currentUser?.uid, currentPage]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    }
    setNotificationsOpen(false);
    if (notif.link) {
      if (notif.link.startsWith('/groups')) {
        onNavigate('groups');
      } else if (notif.link.startsWith('/connections')) {
        onNavigate('match');
      } else if (notif.link.startsWith('/schedule')) {
        onNavigate('schedule');
      } else {
        onNavigate('match');
      }
    }
  };

  const navItems = [
    { id: 'home', label: 'Trang chủ', icon: BookOpen },
    { id: 'explore', label: 'Khám phá', icon: Sparkles },
    { id: 'match', label: 'Ghép cặp 1–1', icon: Repeat },
    { id: 'groups', label: 'Nhóm học tập', icon: Users },
    { id: 'schedule', label: 'Lịch trao đổi', icon: Calendar },
    { id: 'messages', label: 'Tin nhắn', icon: MessageSquare },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div 
            onClick={() => onNavigate('home')} 
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#173B65] to-[#3478C8] flex items-center justify-center text-white font-bold shadow-md shadow-blue-900/20 group-hover:scale-105 transition-transform">
              <Repeat className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-[#173B65] tracking-tight">SkillSwap</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#3478C8]">UEH Mekong</span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">Share What You Know. Learn What You Need.</p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive 
                      ? 'text-[#3478C8] bg-blue-50/80 font-semibold shadow-xs' 
                      : 'text-slate-600 hover:text-[#173B65] hover:bg-slate-100/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#3478C8]' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right Action Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser && userProfile ? (
              <>
                {/* Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setNotificationsOpen(!notificationsOpen);
                      setUserDropdownOpen(false);
                    }}
                    className="p-2 rounded-lg text-slate-600 hover:text-[#173B65] hover:bg-slate-100 transition-colors relative"
                    title="Thông báo"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Popover */}
                  {notificationsOpen && (
                    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-800 text-sm">Thông báo</h4>
                          {unreadCount > 0 && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-[#3478C8] rounded-full font-medium">
                              {unreadCount} mới
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => setNotificationsOpen(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                        >
                          Đóng
                        </button>
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 mt-1">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs">
                            Bạn chưa có thông báo mới nào.
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              onClick={() => handleNotificationClick(n)}
                              className={`p-3 rounded-xl cursor-pointer text-xs transition-colors ${
                                !n.isRead ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-slate-800">{n.title}</p>
                                {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#3478C8] shrink-0 mt-1"></span>}
                              </div>
                              <p className="text-slate-600 mt-1 line-clamp-2">{n.message}</p>
                              <span className="text-[10px] text-slate-400 mt-1.5 block">
                                {new Date(n.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(!userDropdownOpen);
                      setNotificationsOpen(false);
                    }}
                    className="flex items-center gap-2 p-1.5 pl-2 pr-3 rounded-full hover:bg-slate-100 border border-slate-200/80 transition-all text-left"
                  >
                    <img
                      src={userProfile.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile.displayName)}`}
                      alt={userProfile.displayName}
                      className="w-8 h-8 rounded-full object-cover border border-slate-200"
                    />
                    <div className="hidden md:block max-w-[120px]">
                      <p className="text-xs font-semibold text-slate-800 truncate">{userProfile.displayName}</p>
                      <p className="text-[10px] text-slate-500 truncate">{userProfile.major || 'Sinh viên'}</p>
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-50">
                      <div className="px-3 py-2 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-800 truncate">{userProfile.displayName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{userProfile.email}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          {isSuperAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-800 rounded-md">
                              <ShieldCheck className="w-3 h-3 text-amber-600" /> Super Admin
                            </span>
                          ) : isAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-800 rounded-md">
                              <ShieldCheck className="w-3 h-3 text-indigo-600" /> Admin
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-md">
                              Sinh viên
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onNavigate('profile');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg text-left"
                        >
                          <User className="w-4 h-4 text-slate-400" />
                          Hồ sơ & Kỹ năng của tôi
                        </button>

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onNavigate('match');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg text-left"
                        >
                          <Repeat className="w-4 h-4 text-slate-400" />
                          Ghép cặp & Kết nối
                        </button>

                        {/* Admin link if user has admin privileges */}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setUserDropdownOpen(false);
                              onNavigate('admin');
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 rounded-lg text-left mt-1"
                          >
                            <ShieldCheck className="w-4 h-4 text-indigo-600" />
                            Admin Dashboard
                          </button>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={async () => {
                            setUserDropdownOpen(false);
                            await logout();
                            onNavigate('home');
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg text-left"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-2 text-xs font-semibold text-[#173B65] hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#3478C8] hover:bg-blue-600 rounded-xl shadow-xs transition-all hover:shadow-md"
                >
                  Đăng ký ngay
                </button>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-1 shadow-lg animate-in slide-in-from-top duration-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium ${
                  isActive 
                    ? 'text-[#3478C8] bg-blue-50 font-semibold' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}

          {isAdmin && (
            <button
              onClick={() => {
                onNavigate('admin');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-indigo-700 bg-indigo-50"
            >
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Admin Dashboard (/admin)
            </button>
          )}

          {!currentUser && (
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  onOpenAuth('login');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 text-center text-sm font-semibold text-[#173B65] bg-slate-100 rounded-xl"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => {
                  onOpenAuth('register');
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 text-center text-sm font-semibold text-white bg-[#3478C8] rounded-xl"
              >
                Đăng ký tài khoản
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
