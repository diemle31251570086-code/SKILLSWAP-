/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ExplorePage } from './pages/ExplorePage.tsx';
import { MatchPage } from './pages/MatchPage.tsx';
import { GroupsPage } from './pages/GroupsPage.tsx';
import { GroupDetailPage } from './pages/GroupDetailPage.tsx';
import { MessagesPage } from './pages/MessagesPage.tsx';
import { SchedulePage } from './pages/SchedulePage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { AdminDashboard } from './pages/AdminDashboard.tsx';
import { AlertCircle, RefreshCw, Sparkles, BookOpen } from 'lucide-react';

// Error Boundary to prevent app crashes
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SkillSwap Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Đã xảy ra sự cố kỹ thuật</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hệ thống đã ghi nhận lỗi. Vui lòng thử tải lại trang hoặc bấm nút khôi phục bên dưới.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.hash = '#home';
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#3478C8] hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Khôi phục trang chủ
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Inner App with Routing & Modals
const MainContent: React.FC = () => {
  const { userProfile, loading } = useAuth();
  
  // Hash routing
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [navParams, setNavParams] = useState<any>({});
  
  // Auth Modal
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');

  // Sync with browser hash
  useEffect(() => {
    const parseHash = () => {
      const hash = window.location.hash.replace('#', '') || 'home';
      const [page, queryString] = hash.split('?');
      setCurrentPage(page);

      if (queryString) {
        const searchParams = new URLSearchParams(queryString);
        const params: Record<string, string> = {};
        searchParams.forEach((val, key) => { params[key] = val; });
        setNavParams(params);
      }
    };

    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, []);

  const handleNavigate = (page: string, params: any = {}) => {
    setCurrentPage(page);
    setNavParams(params);
    let hash = `#${page}`;
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      hash += `?${searchParams.toString()}`;
    }
    window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAuth = (tab: 'login' | 'register' = 'login') => {
    setAuthInitialTab(tab);
    setIsAuthOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC]">
      
      {/* Navigation Bar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main Pages */}
      <main className="flex-1">
        {currentPage === 'home' && (
          <HomePage onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} />
        )}

        {currentPage === 'explore' && (
          <ExplorePage
            initialQuery={navParams.query}
            initialCategory={navParams.category}
            onOpenAuth={handleOpenAuth}
            onNavigate={handleNavigate}
          />
        )}

        {currentPage === 'match' && (
          <MatchPage onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} />
        )}

        {currentPage === 'groups' && (
          <GroupsPage onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} />
        )}

        {currentPage === 'group-detail' && (
          <GroupDetailPage
            groupId={navParams.groupId || ''}
            onNavigate={handleNavigate}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {currentPage === 'messages' && (
          <MessagesPage
            initialConversationId={navParams.conversationId}
            onNavigate={handleNavigate}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {currentPage === 'schedule' && (
          <SchedulePage onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} />
        )}

        {currentPage === 'profile' && (
          <ProfilePage onNavigate={handleNavigate} onOpenAuth={handleOpenAuth} />
        )}

        {currentPage === 'admin' && (
          <AdminDashboard onNavigate={handleNavigate} />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        initialTab={authInitialTab}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          setIsAuthOpen(false);
        }}
      />

    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
