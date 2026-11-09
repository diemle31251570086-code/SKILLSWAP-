import { AIAgentProfile, AI_STUDENT_AGENTS } from '../data/aiAgents.ts';

export interface AIChatResponse {
  reply: string;
  aiId: string;
  aiName: string;
  memorySnapshot?: {
    skillsDiscussed: string[];
    userStatedGoals: string[];
    agreedSchedule?: string;
  };
}

export interface AIStats {
  totalCalls: number;
  estimatedTokens: number;
  activeAgentsCount: number;
}

export async function fetchAIAgents(): Promise<{
  agents: AIAgentProfile[];
  demoModeActive: boolean;
  aiAutonomousMode: boolean;
  stats: AIStats;
}> {
  try {
    const res = await fetch('/api/ai/agents');
    if (!res.ok) throw new Error('Failed to fetch agents');
    return await res.json();
  } catch (err) {
    console.warn('Backend agents fetch failed, falling back to static definition', err);
    return {
      agents: AI_STUDENT_AGENTS,
      demoModeActive: true,
      aiAutonomousMode: true,
      stats: { totalCalls: 0, estimatedTokens: 0, activeAgentsCount: AI_STUDENT_AGENTS.length }
    };
  }
}

export async function sendAIMessage(params: {
  aiId: string;
  userMessage: string;
  conversationId?: string;
  userId?: string;
  userName?: string;
  history?: { role: 'user' | 'model'; text: string }[];
}): Promise<AIChatResponse> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error || 'Không thể nhận phản hồi từ AI Student');
  }

  return await res.json();
}

export async function requestAIGroupContribution(params: {
  aiId: string;
  groupTopic: string;
  groupName: string;
  recentMessages: { senderName: string; text: string }[];
}): Promise<{ contribution: string; aiId: string; aiName: string; aiPhoto: string }> {
  const res = await fetch('/api/ai/group-contribute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) throw new Error('Không thể tạo phản biểu nhóm từ AI');
  return await res.json();
}

export async function getAIMatchReasoning(params: {
  userSkillsShare: string[];
  userSkillsLearn: string[];
  aiId: string;
}): Promise<string> {
  try {
    const res = await fetch('/api/ai/match-reasoning', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) return 'Có tiềm năng bổ trợ kỹ năng học tập rất tốt cùng nhau.';
    const data = await res.json();
    return data.reason || 'Kỹ năng tương thích cao.';
  } catch (err) {
    return 'Cùng học tập tại UEH Mekong, có nhiều kỹ năng bổ trợ lẫn nhau.';
  }
}

export interface ProposedTrialSlot {
  date: string;
  startTime: string;
  endTime: string;
  mode: 'online' | 'offline' | 'hybrid';
  locationOrLink: string;
  duration?: string;
  agenda?: string;
}

export interface AIInvitationDecisionResult {
  aiId: string;
  aiName: string;
  aiPhoto: string;
  decision: 'accept' | 'decline';
  reason: string;
  counterQuestions?: string[];
  initialChatMessage?: string;
  proposedTrialSlots?: ProposedTrialSlot[];
}

export interface AIGroupInviteDecisionResult {
  aiId: string;
  aiName: string;
  aiPhoto: string;
  decision: 'accept' | 'decline';
  reason: string;
  initialGroupMessage?: string;
  proposedGroupTrialSlot?: ProposedTrialSlot;
}

export interface AITrialNegotiateResult {
  aiId: string;
  aiName: string;
  agreed: boolean;
  aiResponse: string;
  suggestedAlternativeSlots?: {
    date: string;
    startTime: string;
    endTime: string;
    mode: 'online' | 'offline' | 'hybrid';
  }[];
}

export async function requestAIInvitationDecision(params: {
  aiId: string;
  requester: any;
  offeredSkill: string;
  wantedSkill: string;
  message?: string;
  demoMode?: boolean;
}): Promise<AIInvitationDecisionResult> {
  const res = await fetch('/api/ai/invitation-decision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Không thể nhận đánh giá từ AI');
  }
  return await res.json();
}

export async function requestAIGroupInviteDecision(params: {
  aiId: string;
  group: any;
  membersCount: number;
  senderName: string;
  demoMode?: boolean;
}): Promise<AIGroupInviteDecisionResult> {
  const res = await fetch('/api/ai/group-invite-decision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Không thể nhận phản hồi tham gia nhóm từ AI');
  }
  return await res.json();
}

export async function requestAITrialScheduleNegotiation(params: {
  aiId: string;
  userProposal: {
    date: string;
    startTime: string;
    endTime: string;
    mode?: 'online' | 'offline' | 'hybrid';
    notes?: string;
  };
  trialType?: '1-on-1' | 'group';
  skillName: string;
  senderName: string;
}): Promise<AITrialNegotiateResult> {
  const res = await fetch('/api/ai/trial-schedule-negotiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Không thể thương lượng lịch với AI');
  }
  return await res.json();
}

export async function adminToggleAIAgent(aiId: string, enabled: boolean): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/ai/toggle-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiId, enabled })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function adminToggleAIDemo(demoMode: boolean): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/ai/toggle-demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demoMode })
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function adminToggleAIAutonomous(autonomous: boolean): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/ai/toggle-autonomous', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autonomous })
    });
    return res.ok;
  } catch {
    return false;
  }
}
