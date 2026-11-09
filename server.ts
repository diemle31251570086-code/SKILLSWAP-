import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { AI_STUDENT_AGENTS, getAIAgentById } from './src/data/aiAgents.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Gemini SDK with server-side API Key
const ai = new GoogleGenAI();

// In-memory memory store for AI agents per user (backed by conversation IDs)
interface AIMemoryRecord {
  skillsDiscussed: string[];
  userStatedGoals: string[];
  agreedSchedule?: string;
  notes: string[];
}
const aiMemoryStore: Record<string, AIMemoryRecord> = {};

function getOrCreateMemory(key: string): AIMemoryRecord {
  if (!aiMemoryStore[key]) {
    aiMemoryStore[key] = {
      skillsDiscussed: [],
      userStatedGoals: [],
      notes: []
    };
  }
  return aiMemoryStore[key];
}

// Global stats tracker for Admin Dashboard
let totalAIApiCalls = 0;
let estimatedTokensUsed = 0;
let aiAutonomousMode = true;
let demoModeActive = true;

// 1. GET /api/ai/agents
app.get('/api/ai/agents', (req: Request, res: Response) => {
  res.json({
    agents: AI_STUDENT_AGENTS,
    demoModeActive,
    aiAutonomousMode,
    stats: {
      totalCalls: totalAIApiCalls,
      estimatedTokens: estimatedTokensUsed,
      activeAgentsCount: AI_STUDENT_AGENTS.filter(a => a.enabled).length
    }
  });
});

// 2. POST /api/ai/chat - Dynamic AI Conversation Engine
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { aiId, userMessage, conversationId, userId, userName, history } = req.body;

    if (!aiId || !userMessage) {
      return res.status(400).json({ error: 'Thiếu aiId hoặc userMessage' });
    }

    const agent = getAIAgentById(aiId);
    if (!agent) {
      return res.status(404).json({ error: 'Không tìm thấy AI Student Agent' });
    }

    if (!agent.enabled) {
      return res.status(403).json({ error: 'Sinh viên AI này hiện đang tạm dừng hoạt động' });
    }

    // Retrieve or initialize memory for this specific user-AI pair
    const memoryKey = `${aiId}_${userId || 'anonymous'}`;
    const memory = getOrCreateMemory(memoryKey);

    // Build context-rich prompt
    const systemPromptWithMemory = `
${agent.systemPrompt}

BỐI CẢNH NỀN TẢNG:
Bạn đang trò chuyện với bạn học trên nền tảng trao đổi kỹ năng "SkillSwap UEH Mekong" dành cho sinh viên Đại học Kinh tế TP.HCM Phân hiệu Vĩnh Long.
Tên người bạn đang nói chuyện: ${userName || 'Bạn học'}.

BỘ NHỚ RIÊNG VỀ NGƯỜI BẠN NÀY:
- Các kỹ năng hai bạn đã từng nhắc tới: ${memory.skillsDiscussed.length > 0 ? memory.skillsDiscussed.join(', ') : 'Chưa có'}.
- Mục tiêu bạn học từng chia sẻ: ${memory.userStatedGoals.length > 0 ? memory.userStatedGoals.join('; ') : 'Chưa có'}.
- Lịch học đã từng đề xuất/thống nhất: ${memory.agreedSchedule || 'Chưa có'}.

QUY TẮC PHẢN HỒI (RẤT QUAN TRỌNG):
1. Đóng vai sinh viên UEH tự nhiên, xưng "mình" - "bạn", giọng văn ấm áp, thân thiện, đồng trang lứa.
2. Thể hiện đúng kiến thức chuyên môn của bạn (${agent.major}, các kỹ năng: ${agent.skillsToShare.map(s => s.name).join(', ')}).
3. Nếu người dùng hỏi kỹ năng bạn muốn học (${agent.skillsToLearn.map(s => s.name).join(', ')}), hãy vui vẻ thừa nhận mình đang muốn học hỏi và hỏi bạn ấy có thể chia sẻ cho mình không.
4. Nếu người dùng hỏi điều bạn không rành, hãy thành thật nói "phần này mình chưa tìm hiểu sâu, nhưng về môn của mình thì mình sẵn sàng hỗ trợ bạn!".
5. Nhớ đặt câu hỏi ngược lại hoặc đề xuất một bước tiếp theo (như: hẹn lịch học trên SkillSwap, gửi bài tập mẫu, hoặc cùng thực hành).
6. Tuyệt đối không xưng là "AI" hay "Trợ lý ảo" trong đoạn hội thoại; hãy trò chuyện như một người bạn đại học thực thụ.
`;

    // Format chat history for Gemini SDK
    const formattedHistory = (history || []).map((h: any) => ({
      role: h.role === 'model' || h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.text || h.content || '' }]
    })).filter((item: any) => item.parts[0].text.trim().length > 0);

    // Append the user's latest message
    formattedHistory.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    // Call Gemini API using model 'gemini-3.8-flash'
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: formattedHistory,
      config: {
        systemInstruction: systemPromptWithMemory,
        temperature: 0.7,
        maxOutputTokens: 800,
      }
    });

    const responseText = response.text || 'Mình đã nhận được tin nhắn của bạn, chúng mình cùng trao đổi thêm nhé!';

    // Update memory heuristically
    const lowerUserMsg = userMessage.toLowerCase();
    agent.skillsToShare.forEach(sk => {
      if (lowerUserMsg.includes(sk.name.toLowerCase()) && !memory.skillsDiscussed.includes(sk.name)) {
        memory.skillsDiscussed.push(sk.name);
      }
    });
    if (lowerUserMsg.includes('mục tiêu') || lowerUserMsg.includes('muốn học') || lowerUserMsg.includes('cần ôn')) {
      memory.userStatedGoals.push(userMessage.slice(0, 100));
    }
    if (lowerUserMsg.includes('thứ') || lowerUserMsg.includes('giờ') || lowerUserMsg.includes('meet') || lowerUserMsg.includes('lịch')) {
      memory.agreedSchedule = userMessage.slice(0, 80);
    }

    // Increment stats
    totalAIApiCalls += 1;
    estimatedTokensUsed += (userMessage.length + responseText.length) / 4;
    agent.totalInteractions += 1;

    res.json({
      reply: responseText,
      aiId: agent.id,
      aiName: agent.displayName,
      memorySnapshot: memory
    });
  } catch (error: any) {
    console.error('Gemini Chat API Error:', error);
    res.status(500).json({
      error: 'Không thể kết nối tới mô hình AI',
      details: error?.message || String(error)
    });
  }
});

// 3. POST /api/ai/group-contribute - AI participates in study group discussions
app.post('/api/ai/group-contribute', async (req: Request, res: Response) => {
  try {
    const { aiId, groupTopic, groupName, recentMessages } = req.body;

    const agent = getAIAgentById(aiId) || AI_STUDENT_AGENTS[0];

    const groupPrompt = `
Bạn là ${agent.displayName}, sinh viên ${agent.cohort} chuyên ngành ${agent.major} tại UEH Mekong.
Bạn đang tham gia nhóm học tập: "${groupName}" (Chủ đề: "${groupTopic}").
Kỹ năng của bạn: ${agent.skillsToShare.map(s => s.name).join(', ')}.

Các tin nhắn gần đây của nhóm:
${(recentMessages || []).map((m: any) => `${m.senderName}: ${m.text}`).join('\n')}

YÊU CẦU:
Hãy đóng góp 1 câu phát biểu ngắn gọn, mang tính hỗ trợ bạn bè, chia sẻ kinh nghiệm hoặc đặt câu hỏi mở phù hợp với chuyên môn của bạn trong nhóm học tập này.
Độ dài: 1-3 câu súc tích, tự nhiên, xưng "mình" - "mọi người/các bạn".
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: 'Hãy đưa ra phản hồi phù hợp cho nhóm học tập này.' }] }],
      config: {
        systemInstruction: groupPrompt,
        temperature: 0.7,
        maxOutputTokens: 250
      }
    });

    totalAIApiCalls += 1;

    res.json({
      contribution: response.text?.trim(),
      aiId: agent.id,
      aiName: agent.displayName,
      aiPhoto: agent.photoURL
    });
  } catch (err: any) {
    console.error('Group contribute error:', err);
    res.status(500).json({ error: 'Lỗi phát biểu nhóm AI' });
  }
});

// 4. POST /api/ai/match-reasoning - Intelligent Match Explanation
app.post('/api/ai/match-reasoning', async (req: Request, res: Response) => {
  try {
    const { userSkillsShare, userSkillsLearn, aiId } = req.body;
    const agent = getAIAgentById(aiId);

    if (!agent) return res.status(404).json({ error: 'AI Agent not found' });

    const prompt = `
Hãy so sánh độ phù hợp giữa:
1. Sinh viên A: Có thể chia sẻ: ${(userSkillsShare || []).join(', ')}; Muốn học: ${(userSkillsLearn || []).join(', ')}.
2. Sinh viên B (${agent.displayName} - ${agent.major} ${agent.cohort}): Có thể chia sẻ: ${agent.skillsToShare.map(s => s.name).join(', ')}; Muốn học: ${agent.skillsToLearn.map(s => s.name).join(', ')}.

Hãy đưa ra nhận định ngắn (1-2 câu) giải thích tại sao 2 bạn này nên kết nối trao đổi kỹ năng 1-1 với nhau trên SkillSwap UEH Mekong.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        maxOutputTokens: 200,
        temperature: 0.6
      }
    });

    totalAIApiCalls += 1;
    res.json({ reason: response.text?.trim() });
  } catch (err: any) {
    res.status(500).json({ error: 'Match reasoning failed' });
  }
});

// Helper to calculate upcoming dates (tomorrow, +3 days, +5 days)
function getUpcomingDateStr(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

// 5. POST /api/ai/invitation-decision - Instant AI evaluation for 1-1 exchange invitations
app.post('/api/ai/invitation-decision', async (req: Request, res: Response) => {
  try {
    const { aiId, requester, offeredSkill, wantedSkill, message, demoMode } = req.body;
    const agent = getAIAgentById(aiId);

    if (!agent) return res.status(404).json({ error: 'AI Agent not found' });

    const prompt = `
Bạn là ${agent.displayName}, sinh viên ${agent.cohort} ngành ${agent.major} tại UEH Mekong.
Tính cách: ${agent.personality}.
Phong cách giao tiếp: ${agent.communicationStyle}.
Kỹ năng có thể chia sẻ: ${agent.skillsToShare.map(s => `${s.name} (${s.level})`).join(', ')}.
Kỹ năng muốn học: ${agent.skillsToLearn.map(s => s.name).join(', ')}.
Thời gian có thể học: ${agent.availableTime || 'Buổi tối hoặc cuối tuần'}.

Bạn vừa nhận được LỜI MỜI TRAO ĐỔI KỸ NĂNG 1-1 trên SkillSwap UEH Mekong:
- Người gửi: ${requester?.displayName || 'Bạn học'} (Ngành: ${requester?.major || 'UEH'}, Khóa: ${requester?.cohort || 'K49'})
- Kỹ năng họ muốn chia sẻ cho bạn: "${offeredSkill}"
- Kỹ năng họ muốn bạn hướng dẫn: "${wantedSkill}"
- Lời nhắn từ họ: "${message || 'Xin chào, mình muốn kết nối học tập cùng bạn!'}"

YÊU CẦU:
1. Đọc và đánh giá xem bạn có kỹ năng "${wantedSkill}" để chia sẻ không, và kỹ năng "${offeredSkill}" có bổ trợ hoặc đem lại giá trị học hỏi cho bạn không.
2. Quyết định: "accept" (Đồng ý kết nối) hoặc "decline" (Từ chối lịch sự nếu hoàn toàn không liên quan chuyên môn hoặc quá tải).
   ${demoMode ? '(Lưu ý: Đang trong Chế độ Demo Giảng viên, nếu người dùng đề xuất kỹ năng hợp lý hãy ưu tiên "accept" để trình diễn tính năng, trừ khi kỹ năng hoàn toàn trái ngược)' : ''}
3. Trả về định dạng JSON thuần túy (không markdown) với cấu trúc sau:
{
  "decision": "accept" hoặc "decline",
  "reason": "Giải thích chi tiết 2-3 câu bằng giọng sinh viên UEH thân thiện, ấm áp",
  "counterQuestions": ["1 câu hỏi về trình độ hiện tại của bạn ấy", "1 câu hỏi về mục tiêu cụ thể"],
  "initialChatMessage": "Lời chào mở đầu cuộc trò chuyện thân thiện, nhận lời và gợi ý bắt đầu",
  "proposedTrialSlots": [
    {
      "date": "${getUpcomingDateStr(2)}",
      "startTime": "19:30",
      "endTime": "20:30",
      "mode": "online",
      "locationOrLink": "Google Meet (SkillSwap Room)",
      "duration": "60 phút",
      "agenda": "Buổi học thử nghiệm: Làm quen, test trình độ ban đầu & trao đổi phương pháp"
    },
    {
      "date": "${getUpcomingDateStr(4)}",
      "startTime": "14:00",
      "endTime": "15:30",
      "mode": "offline",
      "locationOrLink": "Thư viện Cơ sở UEH Mekong",
      "duration": "90 phút",
      "agenda": "Buổi học thử nghiệm: Thực hành trực tiếp bài tập mẫu và lên lộ trình"
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 800
      }
    });

    totalAIApiCalls += 1;
    let resultJson: any = {};
    try {
      const cleaned = (response.text || '{}').replace(/```json\n?|```/g, '').trim();
      resultJson = JSON.parse(cleaned);
    } catch {
      resultJson = {
        decision: 'accept',
        reason: `Chào bạn! Mình là ${agent.displayName}, rất vui được kết nối cùng bạn để trao đổi kỹ năng ${wantedSkill} và ${offeredSkill}!`,
        counterQuestions: [`Hiện tại bạn đã học qua phần nào của ${wantedSkill} chưa?`],
        initialChatMessage: `Chào bạn, mình đồng ý kết nối nhé! Rất mong được cùng bạn trao đổi kỹ năng!`,
        proposedTrialSlots: [
          {
            date: getUpcomingDateStr(2),
            startTime: '19:30',
            endTime: '20:30',
            mode: 'online',
            locationOrLink: 'Google Meet (SkillSwap)',
            duration: '60 phút',
            agenda: 'Học thử nghiệm: Thảo luận mục tiêu & kiến thức nền tảng'
          }
        ]
      };
    }

    res.json({
      aiId: agent.id,
      aiName: agent.displayName,
      aiPhoto: agent.photoURL,
      ...resultJson
    });
  } catch (err: any) {
    console.error('Invitation decision error:', err);
    res.status(500).json({ error: 'Lỗi đánh giá lời mời từ AI', details: err?.message });
  }
});

// 6. POST /api/ai/group-invite-decision - Instant AI evaluation for Group Invitations
app.post('/api/ai/group-invite-decision', async (req: Request, res: Response) => {
  try {
    const { aiId, group, membersCount, senderName, demoMode } = req.body;
    const agent = getAIAgentById(aiId);

    if (!agent) return res.status(404).json({ error: 'AI Agent not found' });

    const prompt = `
Bạn là ${agent.displayName}, sinh viên ${agent.cohort} ngành ${agent.major} tại UEH Mekong.
Kỹ năng chia sẻ: ${agent.skillsToShare.map(s => s.name).join(', ')}.
Kỹ năng muốn học: ${agent.skillsToLearn.map(s => s.name).join(', ')}.
Lịch rảnh: ${agent.availableTime || 'Tối trong tuần hoặc cuối tuần'}.

Bạn vừa nhận được LỜI MỜI THAM GIA NHÓM HỌC TẬP trên SkillSwap UEH Mekong:
- Tên nhóm: "${group?.name}"
- Môn/Kỹ năng trọng tâm của nhóm: "${group?.skillNeeded || group?.topic}"
- Mô tả nhóm: "${group?.description || ''}"
- Hình thức & Lịch nhóm: "${group?.mode}" - "${group?.schedule || 'Linh hoạt'}"
- Số lượng thành viên hiện có: ${membersCount || 1}/${group?.maxMembers || 6}
- Người mời: ${senderName || 'Chủ nhóm'}

YÊU CẦU:
1. Đánh giá xem chủ đề nhóm có phù hợp với kỹ năng bạn có thể cố vấn hoặc kỹ năng bạn muốn cùng học không.
2. Quyết định: "accept" (Đồng ý tham gia nhóm) hoặc "decline" (Từ chối lịch sự).
   ${demoMode ? '(Lưu ý: Đang trong Chế độ Demo Giảng viên, hãy ưu tiên "accept" nếu chủ đề nhóm có ích, để thể hiện tính năng ghép nhóm nhiều người và kích hoạt đủ sĩ số)' : ''}
3. Trả về định dạng JSON thuần túy (không markdown):
{
  "decision": "accept" hoặc "decline",
  "reason": "Giải thích 2 câu tại sao đồng ý hoặc từ chối bằng giọng sinh viên UEH",
  "initialGroupMessage": "Tin nhắn chào cả nhóm đăng vào kênh thảo luận chung của nhóm",
  "proposedGroupTrialSlot": {
    "date": "${getUpcomingDateStr(3)}",
    "startTime": "19:00",
    "endTime": "20:30",
    "mode": "${group?.mode || 'online'}",
    "locationOrLink": "${group?.location || 'Google Meet'}",
    "duration": "90 phút",
    "agenda": "Buổi sinh hoạt nhóm đầu tiên: Thống nhất mục tiêu học tập và phân công chuyên đề"
  }
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 600
      }
    });

    totalAIApiCalls += 1;
    let resultJson: any = {};
    try {
      const cleaned = (response.text || '{}').replace(/```json\n?|```/g, '').trim();
      resultJson = JSON.parse(cleaned);
    } catch {
      resultJson = {
        decision: 'accept',
        reason: `Chủ đề nhóm rất phù hợp với chuyên ngành của mình tại UEH Mekong, mình xin phép tham gia cùng các bạn!`,
        initialGroupMessage: `Chào mọi người! Mình là ${agent.displayName}, rất vui được tham gia nhóm học "${group?.name}". Cùng cố gắng nhé!`,
        proposedGroupTrialSlot: {
          date: getUpcomingDateStr(3),
          startTime: '19:00',
          endTime: '20:30',
          mode: group?.mode || 'online',
          locationOrLink: group?.location || 'Google Meet',
          duration: '90 phút',
          agenda: 'Buổi sinh hoạt nhóm đầu tiên: Thống nhất mục tiêu'
        }
      };
    }

    res.json({
      aiId: agent.id,
      aiName: agent.displayName,
      aiPhoto: agent.photoURL,
      ...resultJson
    });
  } catch (err: any) {
    console.error('Group invite decision error:', err);
    res.status(500).json({ error: 'Lỗi đánh giá lời mời nhóm từ AI', details: err?.message });
  }
});

// 7. POST /api/ai/trial-schedule-negotiate - Negotiate trial study session
app.post('/api/ai/trial-schedule-negotiate', async (req: Request, res: Response) => {
  try {
    const { aiId, userProposal, trialType, skillName, senderName } = req.body;
    const agent = getAIAgentById(aiId);

    if (!agent) return res.status(404).json({ error: 'AI Agent not found' });

    const prompt = `
Bạn là ${agent.displayName}, sinh viên ${agent.cohort} ngành ${agent.major} tại UEH Mekong.
Thời gian có thể học: ${agent.availableTime || 'Buổi tối hoặc cuối tuần'}.

Bạn học ${senderName || 'Bạn'} vừa đề xuất một lịch học thử nghiệm (${trialType || '1-on-1'}) môn "${skillName}":
- Ngày đề xuất: ${userProposal?.date}
- Thời gian: ${userProposal?.startTime} đến ${userProposal?.endTime}
- Hình thức: ${userProposal?.mode || 'Online'}
- Ghi chú từ bạn học: "${userProposal?.notes || 'Không có'}"

YÊU CẦU:
1. Xem xét lịch đề xuất này có phù hợp với thời gian rảnh của bạn (${agent.availableTime}) không.
2. Nếu phù hợp: "agreed": true, phản hồi hào hứng xác nhận, nhắc bạn ấy chuẩn bị tài liệu hoặc câu hỏi trước buổi học.
3. Nếu muốn điều chỉnh giờ khác phù hợp hơn: "agreed": false, giải thích lý do ngắn gọn và đề xuất 2 khung giờ thay thế.
4. Trả về định dạng JSON thuần túy (không markdown):
{
  "agreed": true hoặc false,
  "aiResponse": "Phản hồi thân thiện xưng mình - bạn bằng tiếng Việt",
  "suggestedAlternativeSlots": [
    {
      "date": "${getUpcomingDateStr(2)}",
      "startTime": "20:00",
      "endTime": "21:00",
      "mode": "online"
    },
    {
      "date": "${getUpcomingDateStr(4)}",
      "startTime": "19:30",
      "endTime": "21:00",
      "mode": "online"
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.6,
        maxOutputTokens: 600
      }
    });

    totalAIApiCalls += 1;
    let resultJson: any = {};
    try {
      const cleaned = (response.text || '{}').replace(/```json\n?|```/g, '').trim();
      resultJson = JSON.parse(cleaned);
    } catch {
      resultJson = {
        agreed: true,
        aiResponse: `Lịch ${userProposal?.date} lúc ${userProposal?.startTime} rất ổn với mình! Mình xác nhận buổi học thử nhé, hẹn gặp bạn!`,
        suggestedAlternativeSlots: []
      };
    }

    res.json({
      aiId: agent.id,
      aiName: agent.displayName,
      ...resultJson
    });
  } catch (err: any) {
    console.error('Trial schedule negotiate error:', err);
    res.status(500).json({ error: 'Lỗi thương lượng lịch từ AI', details: err?.message });
  }
});

// 5. Admin AI Management Controls
app.post('/api/admin/ai/toggle-agent', (req: Request, res: Response) => {
  const { aiId, enabled } = req.body;
  const agent = getAIAgentById(aiId);
  if (agent) {
    agent.enabled = enabled;
    return res.json({ success: true, agent });
  }
  res.status(404).json({ error: 'Agent not found' });
});

app.post('/api/admin/ai/toggle-demo', (req: Request, res: Response) => {
  const { demoMode } = req.body;
  demoModeActive = demoMode;
  res.json({ success: true, demoModeActive });
});

app.post('/api/admin/ai/toggle-autonomous', (req: Request, res: Response) => {
  const { autonomous } = req.body;
  aiAutonomousMode = autonomous;
  res.json({ success: true, aiAutonomousMode });
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
