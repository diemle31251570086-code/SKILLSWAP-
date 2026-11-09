export type UserRole = 'user' | 'admin' | 'superadmin';
export type UserStatus = 'active' | 'suspended';
export type StudyMode = 'Online' | 'Offline' | 'Hybrid';
export type SkillLevel = 'Cơ bản' | 'Trung cấp' | 'Nâng cao';

export interface UserSkillItem {
  id: string;
  name: string;
  level: SkillLevel;
  description?: string;
}

export interface UserProfile {
  id: string; // Firebase Auth UID
  email: string;
  displayName: string;
  photoURL?: string;
  studentId?: string;
  major?: string;
  cohort?: string; // Khóa học (K48, K49, K50...)
  bio?: string;
  skillsToShare: UserSkillItem[];
  skillsToLearn: UserSkillItem[];
  proficiency?: SkillLevel;
  learningPreferences?: StudyMode;
  availableTime?: string;
  role: UserRole;
  status: UserStatus;
  isProfileComplete: boolean;
  isPublic: boolean;
  rating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  order: number;
}

export interface SkillItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string;
  level: SkillLevel;
  popular?: boolean;
  status: 'active' | 'hidden';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConnectionStatus = 
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'connected'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export interface Connection {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhoto?: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhoto?: string;
  requesterSkillOffered: string;
  requesterSkillWanted: string;
  recipientSkillOffered?: string;
  message?: string;
  status: ConnectionStatus;
  scheduleInfo?: {
    date: string;
    time: string;
    location: string;
    mode: StudyMode;
    meetingUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export type GroupStatus = 'open' | 'pending' | 'active' | 'completed' | 'cancelled' | 'reported';
export type GroupMemberRole = 'owner' | 'moderator' | 'member';

export interface StudyGroup {
  id: string;
  name: string;
  topic: string;
  skillNeeded: string;
  category: string;
  description: string;
  photoURL?: string;
  minMembers: number;
  maxMembers: number;
  currentMembersCount: number;
  mode: 'online' | 'offline' | 'hybrid';
  schedule: string;
  location: string;
  isPublic: boolean;
  status: GroupStatus;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string; // composite: groupId_userId
  groupId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto?: string;
  role: GroupMemberRole;
  joinedAt: string;
}

export interface GroupJoinRequest {
  id: string;
  groupId: string;
  groupName?: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhoto?: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  groupId?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastSenderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  text: string;
  createdAt: string;
}

export type ScheduleStatus = 'proposed' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled';

export interface ScheduleItem {
  id: string;
  type: '1-on-1' | 'group';
  title: string;
  skillName: string;
  participants: string[];
  groupId?: string;
  connectionId?: string;
  date: string;
  startTime: string;
  endTime: string;
  mode: 'online' | 'offline' | 'hybrid';
  locationOrLink: string;
  notes?: string;
  status: ScheduleStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ReviewItem {
  id: string;
  targetType: 'user' | 'group';
  targetId: string;
  targetName: string;
  reviewerId: string;
  reviewerName: string;
  reviewerPhoto?: string;
  connectionId?: string;
  groupId?: string;
  rating: number; // 1 to 5
  comment: string;
  helpfulRating?: number;
  createdAt: string;
}

export type ReportStatus = 'pending' | 'investigating' | 'resolved' | 'dismissed';

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'user' | 'group' | 'message' | 'review';
  targetId: string;
  targetName?: string;
  reason: string;
  description: string;
  status: ReportStatus;
  resolvedBy?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CMSContent {
  id: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBadge: string;
  announcement: string;
  guideSteps: {
    step: number;
    title: string;
    desc: string;
    icon: string;
  }[];
  contactEmail: string;
  contactPhone: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface AdminLogItem {
  id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  timestamp: string;
}

export interface SystemSettings {
  id: string;
  allowRegistrations: boolean;
  maintenanceMode: boolean;
  maxGroupSizeDefault: number;
  defaultApprovalMode: string;
  updatedAt: string;
}
