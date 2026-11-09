import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Users, 
  User, 
  ArrowLeft, 
  Clock, 
  Sparkles, 
  Bot, 
  Info,
  BrainCircuit,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { 
  getUserConversations,
  subscribeToMessages, 
  sendMessage, 
  getUserProfile
} from '../services/firebase.ts';
import { Conversation, MessageItem, UserProfile } from '../types/index.ts';
import { AI_STUDENT_AGENTS, AIAgentProfile, getAIAgentById } from '../data/aiAgents.ts';
import { sendAIMessage, fetchAIAgents } from '../services/aiService.ts';

interface MessagesPageProps {
  initialConversationId?: string;
  onNavigate: (page: string, params?: any) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
}

export const MessagesPage: React.FC<MessagesPageProps> = ({
  initialConversationId,
  onNavigate,
  onOpenAuth
}) => {
  const { currentUser, userProfile } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId || null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [activePartner, setActivePartner] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);

  // AI specific state
  const [activeAiAgent, setActiveAiAgent] = useState<AIAgentProfile | null>(null);
  const [isAITyping, setIsAITyping] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'conversations' | 'ai_agents'>('conversations');
  const [aiAgentsList, setAiAgentsList] = useState<AIAgentProfile[]>(AI_STUDENT_AGENTS);
  const [aiMemory, setAiMemory] = useState<any>(null);
  const [showMemoryModal, setShowMemoryModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAITyping]);

  // Load agents from backend/service
  useEffect(() => {
    fetchAIAgents().then(data => {
      if (data && data.agents) {
        setAiAgentsList(data.agents.filter(a => a.enabled));
      }
    }).catch(() => {});
  }, []);

  // Parse if initial conversation is an AI student
  useEffect(() => {
    if (!initialConversationId) return;

    let targetAiId = initialConversationId;
    if (targetAiId.startsWith('conv_')) {
      targetAiId = targetAiId.replace('conv_', '');
    }

    const agent = getAIAgentById(targetAiId);
    if (agent) {
      setActiveAiAgent(agent);
      setActiveConversationId(`conv_${agent.id}`);
      setSidebarTab('ai_agents');
    }
  }, [initialConversationId]);

  // Load user human conversations
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    async function loadConversations() {
      try {
        const list = await getUserConversations(currentUser!.uid);
        setConversations(list);

        // If no initial conv specified and not in AI mode
        if (!activeConversationId && list.length > 0 && !activeAiAgent) {
          setActiveConversationId(list[0].id);
        }
      } catch (err) {
        console.error('Conversations load error', err);
      } finally {
        setLoading(false);
      }
    }
    loadConversations();
  }, [currentUser?.uid]);

  // Handle selecting AI Agent
  const handleSelectAiAgent = (agent: AIAgentProfile) => {
    setActiveAiAgent(agent);
    setActiveConversationId(`conv_${agent.id}`);
    setActiveConversation(null);
    setActivePartner(null);

    // Load AI messages from localStorage
    const storageKey = `skillswap_ai_chat_${agent.id}_${currentUser?.uid || 'guest'}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed);
      } catch {
        initializeAiChat(agent);
      }
    } else {
      initializeAiChat(agent);
    }
  };

  const initializeAiChat = (agent: AIAgentProfile) => {
    const welcomeMessages: Record<string, string> = {
      ai_khang_tech: `Chào ${userProfile?.displayName || 'bạn'}! Mình là Minh Khang (K48 CNTT & Khoa học dữ liệu). Bạn đang muốn cùng mình tìm hiểu về Python, Pandas hay tối ưu cơ sở dữ liệu SQL đúng không? Cứ thoải mái chia sẻ bài toán hoặc đoạn code bạn đang làm nhé!`,
      ai_thu_design: `Hé lô ${userProfile?.displayName || 'bạn'}! Mình là Anh Thư (K49 Marketing & TMĐT). Bạn đang chuẩn bị làm bài tập lớn hay cần ý tưởng thiết kế slide, poster Canva thật xịn sò? Cứ gửi chủ đề cho mình xem thử nha!`,
      ai_long_ielts: `Hi ${userProfile?.displayName || 'there'}! Mình là Hoàng Long (K48 Ngôn ngữ Anh). Bạn đang luyện thi Speaking hay muốn cải thiện kỹ năng phản xạ tiếng Anh? Chúng mình cùng bắt đầu luyện tập một vài câu hỏi thông dụng nhé!`,
      ai_chau_finance: `Chào bạn! Mình là Bảo Châu (K49 Tài chính - Ngân hàng). Bạn đang gặp khó ở các hàm Excel hay phân tích báo cáo tài chính nào? Mình sẵn sàng cùng bạn gỡ rối từng bước.`,
      ai_huy_biz: `Chào bạn! Mình là Quốc Huy (K48 QTKD). Rất vui được kết nối cùng bạn trên SkillSwap UEH Mekong. Bạn đang ấp ủ dự án hay cần thảo luận về kế hoạch kinh doanh nào không?`,
      ai_phuong_marketing: `Chào bạn nhé! Mình là Mai Phương (K50 Marketing). Bạn có muốn cùng mình lên kịch bản TikTok bắt trend hay tìm kiếm insight người dùng cho bài thuyết trình sắp tới không?`,
      ai_phat_data: `Xin chào! Mình là Tấn Phát (K49 Khoa học dữ liệu). Bạn đang làm việc với Power BI hay Looker Studio? Cần hỗ trợ trực quan hóa biểu đồ nào cứ nhắn mình nhé!`,
      ai_my_chinese: `Nǐ hǎo! Chào bạn, mình là Thảo My (K49 Kinh doanh quốc tế). Bạn đang học phát âm pinyin hay ôn thi chứng chỉ HSK tiếng Trung?`,
      ai_trong_speech: `Chào bạn! Mình là Đức Trọng (K48 Luật kinh tế). Thuyết trình tự tin là kỹ năng hoàn toàn có thể rèn luyện được. Bạn đang chuẩn bị cho bài nói hay cuộc thi nào?`,
      ai_han_research: `Chào bạn, mình là Gia Hân (K48 Kinh tế học ứng dụng). Bạn đang bắt đầu viết đề tài NCKH sinh viên hay cần xử lý số liệu SPSS?`,
      ai_kiet_accounting: `Chào bạn! Mình là Tuấn Kiệt (K49 Kế toán - Kiểm toán). Bạn đang cần định khoản nghiệp vụ hay làm bài tập thực hành phần mềm MISA/Excel?`,
      ai_nhi_toeic: `Hé lô bạn! Mình là Yến Nhi (K50 Sự kiện). Cùng nhau giải đố một vài bẫy đề thi TOEIC Listening & Reading để nâng điểm nhanh nhé!`,
      ai_hoang_video: `Chào bạn! Mình là Văn Hoàng (K49 Marketing). Bạn muốn học cách dựng video CapCut hay Premiere mượt mà hút view?`,
      ai_trang_time: `Chào bạn, mình là Thùy Trang (K50). Bạn đang muốn sắp xếp thời gian biểu hay tạo một template Notion để quản lý deadline hiệu quả hơn?`,
      ai_dang_web: `Chào bạn! Mình là Hải Đăng (K48 HTTT Kinh doanh). Bạn muốn học cách tối ưu câu lệnh prompt AI hay tự làm web cơ bản?`
    };

    const initialText = welcomeMessages[agent.id] || `Chào bạn! Mình là ${agent.displayName} (${agent.cohort} ngành ${agent.major} tại UEH Mekong). Rất vui được gặp và đồng hành trao đổi kỹ năng cùng bạn!`;

    const welcomeMsg: MessageItem = {
      id: `welcome_${Date.now()}`,
      conversationId: `conv_${agent.id}`,
      senderId: agent.id,
      senderName: agent.displayName,
      senderPhoto: agent.photoURL,
      text: initialText,
      createdAt: new Date().toISOString()
    };

    setMessages([welcomeMsg]);
    const storageKey = `skillswap_ai_chat_${agent.id}_${currentUser?.uid || 'guest'}`;
    localStorage.setItem(storageKey, JSON.stringify([welcomeMsg]));
  };

  // Handle active conversation for human partner
  useEffect(() => {
    if (!activeConversationId || !currentUser?.uid) return;

    // Check if it's an AI conversation
    if (activeConversationId.startsWith('conv_ai_') || activeConversationId.startsWith('ai_')) {
      const aiId = activeConversationId.replace('conv_', '');
      const agent = getAIAgentById(aiId);
      if (agent) {
        handleSelectAiAgent(agent);
        return;
      }
    }

    const conv = conversations.find(c => c.id === activeConversationId);
    setActiveConversation(conv || null);
    setActiveAiAgent(null);

    if (conv && conv.type === 'direct') {
      const partnerId = conv.participants.find(p => p !== currentUser.uid);
      if (partnerId) {
        getUserProfile(partnerId).then(setActivePartner);
      }
    } else {
      setActivePartner(null);
    }
  }, [activeConversationId, conversations, currentUser?.uid]);

  // Subscribe to messages in active HUMAN conversation
  useEffect(() => {
    if (!activeConversationId || activeAiAgent) return;

    const unsub = subscribeToMessages(activeConversationId, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [activeConversationId, activeAiAgent]);

  if (!currentUser || !userProfile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <MessageSquare className="w-12 h-12 text-[#3478C8] mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Tin nhắn & Thảo luận</h2>
        <p className="text-xs text-slate-500">Vui lòng đăng nhập để trao đổi tin nhắn cùng bạn bè và nhóm học tập.</p>
        <button
          onClick={() => onOpenAuth('login')}
          className="px-5 py-2 bg-[#3478C8] text-white font-semibold text-xs rounded-xl"
        >
          Đăng nhập
        </button>
      </div>
    );
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !userProfile) return;

    const text = inputText.trim();
    setInputText('');

    // Case 1: Chatting with simulated AI Student Agent
    if (activeAiAgent) {
      const userMsg: MessageItem = {
        id: `usr_${Date.now()}`,
        conversationId: `conv_${activeAiAgent.id}`,
        senderId: currentUser.uid,
        senderName: userProfile.displayName,
        senderPhoto: userProfile.photoURL,
        text,
        createdAt: new Date().toISOString()
      };

      const updatedHistory = [...messages, userMsg];
      setMessages(updatedHistory);

      // Save to localStorage
      const storageKey = `skillswap_ai_chat_${activeAiAgent.id}_${currentUser.uid}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedHistory));

      // Trigger Gemini API call
      setIsAITyping(true);
      try {
        const formattedHistory = messages.slice(-10).map(m => ({
          role: (m.senderId === activeAiAgent.id ? 'model' : 'user') as 'user' | 'model',
          text: m.text
        }));

        const aiResponse = await sendAIMessage({
          aiId: activeAiAgent.id,
          userMessage: text,
          conversationId: `conv_${activeAiAgent.id}`,
          userId: currentUser.uid,
          userName: userProfile.displayName,
          history: formattedHistory
        });

        const replyMsg: MessageItem = {
          id: `ai_${Date.now()}`,
          conversationId: `conv_${activeAiAgent.id}`,
          senderId: activeAiAgent.id,
          senderName: activeAiAgent.displayName,
          senderPhoto: activeAiAgent.photoURL,
          text: aiResponse.reply,
          createdAt: new Date().toISOString()
        };

        const finalHistory = [...updatedHistory, replyMsg];
        setMessages(finalHistory);
        localStorage.setItem(storageKey, JSON.stringify(finalHistory));

        if (aiResponse.memorySnapshot) {
          setAiMemory(aiResponse.memorySnapshot);
        }
      } catch (err: any) {
        console.error('AI message failed', err);
        const errMsg: MessageItem = {
          id: `err_${Date.now()}`,
          conversationId: `conv_${activeAiAgent.id}`,
          senderId: activeAiAgent.id,
          senderName: activeAiAgent.displayName,
          senderPhoto: activeAiAgent.photoURL,
          text: `[Hệ thống]: Không thể kết nối tới mô hình AI vào lúc này. Chi tiết: ${err?.message || 'Vui lòng thử lại sau.'}`,
          createdAt: new Date().toISOString()
        };
        setMessages(prev => [...prev, errMsg]);
      } finally {
        setIsAITyping(false);
      }
      return;
    }

    // Case 2: Chatting with real Human or Group via Firestore
    if (activeConversationId) {
      try {
        await sendMessage(activeConversationId, text, userProfile);
      } catch (err) {
        console.error('Send message error', err);
      }
    }
  };

  const handleClearAiHistory = () => {
    if (!activeAiAgent) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa lịch sử trò chuyện cùng ${activeAiAgent.displayName}?`)) return;

    const storageKey = `skillswap_ai_chat_${activeAiAgent.id}_${currentUser.uid}`;
    localStorage.removeItem(storageKey);
    initializeAiChat(activeAiAgent);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden h-[78vh] flex">
        
        {/* Left Sidebar: Conversations & AI Students */}
        <div className={`w-full md:w-80 border-r border-slate-200 flex flex-col ${
          (activeConversationId || activeAiAgent) ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Sidebar Tabs */}
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center gap-1.5">
            <button
              onClick={() => setSidebarTab('conversations')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all ${
                sidebarTab === 'conversations'
                  ? 'bg-white text-[#173B65] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Hộp thư ({conversations.length})
            </button>
            <button
              onClick={() => setSidebarTab('ai_agents')}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                sidebarTab === 'ai_agents'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-700 hover:text-purple-900 bg-purple-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Sinh viên AI ({aiAgentsList.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {sidebarTab === 'conversations' ? (
              conversations.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                  <p>Bạn chưa có cuộc hội thoại nào.</p>
                  <button
                    onClick={() => setSidebarTab('ai_agents')}
                    className="text-[#3478C8] font-bold underline"
                  >
                    Trò chuyện thử cùng Sinh viên AI →
                  </button>
                </div>
              ) : (
                conversations.map((conv) => {
                  const isSelected = !activeAiAgent && conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveAiAgent(null);
                        setActiveConversationId(conv.id);
                      }}
                      className={`p-3.5 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/80 border-l-4 border-[#3478C8]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                          {conv.type === 'group' ? <Users className="w-5 h-5 text-[#3478C8]" /> : <User className="w-5 h-5 text-emerald-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {conv.type === 'group' ? 'Thảo luận nhóm' : 'Trò chuyện 1–1'}
                            </p>
                            <span className="text-[9px] text-slate-400 shrink-0">
                              {conv.lastMessageAt && new Date(conv.lastMessageAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {conv.lastMessage || 'Bắt đầu cuộc trò chuyện'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              /* AI Agents List */
              <div className="p-2 space-y-1">
                {aiAgentsList.map((agent) => {
                  const isSelected = activeAiAgent?.id === agent.id;
                  return (
                    <div
                      key={agent.id}
                      onClick={() => handleSelectAiAgent(agent)}
                      className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 ${
                        isSelected 
                          ? 'bg-purple-100/70 border border-purple-300 shadow-2xs' 
                          : 'hover:bg-purple-50/50 border border-transparent'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={agent.photoURL}
                          alt={agent.displayName}
                          className="w-10 h-10 rounded-xl object-cover border border-purple-200"
                        />
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] shadow-2xs">
                          <Bot className="w-2.5 h-2.5" />
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-800 truncate">{agent.displayName}</p>
                          <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                            {agent.cohort}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{agent.major}</p>
                        <p className="text-[10px] text-emerald-700 truncate font-medium">
                          Dạy: {agent.skillsToShare.map(s => s.name).slice(0, 2).join(', ')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Main Panel: Active Chat Room */}
        <div className={`flex-1 flex flex-col bg-slate-50/50 ${
          (!activeConversationId && !activeAiAgent) ? 'hidden md:flex' : 'flex'
        }`}>
          {activeAiAgent ? (
            /* AI Agent Chat Room */
            <>
              {/* AI Chat Header */}
              <div className="p-3.5 sm:p-4 bg-white border-b border-purple-100 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setActiveAiAgent(null);
                      setActiveConversationId(null);
                    }}
                    className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative">
                    <img
                      src={activeAiAgent.photoURL}
                      alt={activeAiAgent.displayName}
                      className="w-10 h-10 rounded-xl object-cover border-2 border-purple-300"
                    />
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-sm">{activeAiAgent.displayName}</h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                        <Sparkles className="w-2.5 h-2.5 text-purple-600" /> Sinh viên AI mô phỏng
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {activeAiAgent.major} • {activeAiAgent.cohort} | Vận hành bởi Gemini 3.8 Flash
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMemoryModal(true)}
                    className="p-2 text-purple-700 hover:bg-purple-50 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1 border border-purple-200"
                    title="Xem hồ sơ & bộ nhớ ngữ cảnh của AI"
                  >
                    <BrainCircuit className="w-4 h-4 text-purple-600" />
                    <span className="hidden sm:inline">Hồ sơ & Ngữ cảnh</span>
                  </button>

                  <button
                    onClick={handleClearAiHistory}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Xóa lịch sử trò chuyện này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Disclaimer Notice Banner */}
              <div className="bg-purple-50/70 border-b border-purple-100/80 px-4 py-2 flex items-center gap-2 text-[11px] text-purple-800">
                <Info className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>
                  Đây là tài khoản sinh viên AI mô phỏng của UEH Mekong. Phản hồi được sinh trực tiếp theo thời gian thực dựa trên tính cách, chuyên ngành và bộ nhớ hội thoại.
                </span>
              </div>

              {/* Message history */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3.5">
                {messages.map((m) => {
                  const isMe = m.senderId === currentUser.uid;
                  return (
                    <div key={m.id} className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <img
                        src={m.senderPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.senderName)}`}
                        alt={m.senderName}
                        className={`w-7 h-7 rounded-full object-cover shrink-0 mt-1 ${isMe ? 'border border-slate-200' : 'border border-purple-300 ring-1 ring-purple-100'}`}
                      />
                      <div className={`max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed ${
                        isMe 
                          ? 'bg-[#3478C8] text-white rounded-tr-none shadow-xs' 
                          : 'bg-white text-slate-800 rounded-tl-none border border-purple-100/90 shadow-2xs'
                      }`}>
                        {!isMe && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-purple-800 mb-1">
                            <span>{m.senderName}</span>
                            <span className="text-[9px] font-normal text-purple-500">(AI)</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{m.text}</p>
                        <span className={`block text-[9px] text-right mt-1.5 opacity-70 ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                          {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* AI Typing Indicator */}
                {isAITyping && (
                  <div className="flex items-start gap-2.5 animate-in fade-in">
                    <img
                      src={activeAiAgent.photoURL}
                      alt={activeAiAgent.displayName}
                      className="w-7 h-7 rounded-full object-cover border border-purple-300 shrink-0 mt-1"
                    />
                    <div className="bg-white rounded-2xl rounded-tl-none p-3 border border-purple-100 shadow-2xs flex items-center gap-2 text-xs text-purple-700">
                      <div className="flex gap-1 items-center">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"></span>
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce [animation-delay:0.4s]"></span>
                      </div>
                      <span className="text-[11px] font-medium">{activeAiAgent.displayName} đang soạn câu trả lời...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Send Bar */}
              <form onSubmit={handleSend} className="p-3 bg-white border-t border-purple-100 flex items-center gap-2">
                <input
                  type="text"
                  placeholder={`Nhắn tin hỏi môn học hoặc kinh nghiệm cùng ${activeAiAgent.displayName}...`}
                  value={inputText}
                  disabled={isAITyping}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-purple-600 outline-hidden text-slate-800 disabled:bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isAITyping}
                  className="p-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : activeConversation ? (
            /* Human Conversation Chat Room */
            <>
              {/* Human Chat Header */}
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConversationId(null)}
                    className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-[#3478C8] font-bold">
                    {activePartner?.displayName?.charAt(0) || <MessageSquare className="w-5 h-5" />}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      {activePartner?.displayName || (activeConversation.type === 'group' ? 'Kênh thảo luận nhóm' : 'Sinh viên đối tác')}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {activePartner ? `${activePartner.major} • ${activePartner.cohort || 'UEH'}` : 'Đang hoạt động'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Message history */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3.5">
                {messages.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Chưa có tin nhắn trong cuộc trò chuyện này. Hãy gửi tin nhắn đầu tiên!
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId === currentUser.uid;
                    return (
                      <div key={m.id} className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <img
                          src={m.senderPhoto || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.senderName)}`}
                          alt={m.senderName}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 mt-1"
                        />
                        <div className={`max-w-[70%] rounded-2xl p-3 text-xs ${
                          isMe ? 'bg-[#3478C8] text-white rounded-tr-none shadow-xs' : 'bg-white text-slate-800 rounded-tl-none border border-slate-200/80 shadow-2xs'
                        }`}>
                          {!isMe && (
                            <p className="text-[10px] font-bold text-slate-500 mb-1">{m.senderName}</p>
                          )}
                          <p className="leading-relaxed whitespace-pre-wrap">{m.text}</p>
                          <span className="block text-[9px] text-right mt-1 opacity-70">
                            {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Send Bar */}
              <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nhập nội dung tin nhắn trao đổi..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:border-[#3478C8] outline-hidden text-slate-800"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2.5 bg-[#3478C8] hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 text-xs">
              <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600 mb-1">Chào mừng bạn đến với Hộp thư SkillSwap!</p>
              <p>Chọn một cuộc trò chuyện từ danh sách hoặc bấm sang tab <strong>Sinh viên AI</strong> để trải nghiệm trao đổi kiến thức với mô hình thông minh.</p>
            </div>
          )}
        </div>

      </div>

      {/* AI Memory & Persona Inspection Modal */}
      {showMemoryModal && activeAiAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-purple-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-800 to-indigo-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={activeAiAgent.photoURL}
                  alt={activeAiAgent.displayName}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-white/20"
                />
                <div>
                  <h3 className="font-bold text-base flex items-center gap-1.5">
                    {activeAiAgent.displayName}
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-white/20">AI Student</span>
                  </h3>
                  <p className="text-xs text-purple-200">{activeAiAgent.major} • {activeAiAgent.cohort}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowMemoryModal(false)}
                className="p-1 rounded-full hover:bg-white/10 text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs text-slate-700">
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">Tính cách & Phong cách</h4>
                <p className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-purple-900">
                  {activeAiAgent.personality}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">Phong cách giao tiếp</h4>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {activeAiAgent.communicationStyle}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h4 className="font-bold text-emerald-800 text-[11px] uppercase mb-1">Có thể chia sẻ:</h4>
                  <div className="space-y-1">
                    {activeAiAgent.skillsToShare.map((s, idx) => (
                      <span key={idx} className="block px-2 py-1 rounded bg-emerald-50 text-emerald-800 font-medium text-[11px]">
                        • {s.name} ({s.level})
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-blue-800 text-[11px] uppercase mb-1">Muốn học hỏi:</h4>
                  <div className="space-y-1">
                    {activeAiAgent.skillsToLearn.map((s, idx) => (
                      <span key={idx} className="block px-2 py-1 rounded bg-blue-50 text-blue-800 font-medium text-[11px]">
                        • {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Memory Snapshot from conversation */}
              <div>
                <h4 className="font-bold text-purple-800 text-[11px] uppercase mb-1 flex items-center gap-1">
                  <BrainCircuit className="w-3.5 h-3.5" /> Bộ nhớ ngữ cảnh đã ghi nhận:
                </h4>
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl space-y-1.5 text-[11px]">
                  <p>
                    <strong>Kỹ năng đã trao đổi:</strong> {aiMemory?.skillsDiscussed?.length > 0 ? aiMemory.skillsDiscussed.join(', ') : 'Chưa có thông tin mới.'}
                  </p>
                  <p>
                    <strong>Mục tiêu bạn đã chia sẻ:</strong> {aiMemory?.userStatedGoals?.length > 0 ? aiMemory.userStatedGoals.join('; ') : 'Chưa có thông tin mới.'}
                  </p>
                  <p>
                    <strong>Lịch học đã hẹn:</strong> {aiMemory?.agreedSchedule || 'Chưa hẹn lịch cụ thể.'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowMemoryModal(false)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
