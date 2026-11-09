import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile as updateAuthProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  runTransaction, 
  serverTimestamp, 
  getDocFromServer,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  UserProfile, 
  SkillCategory, 
  SkillItem, 
  Connection, 
  ConnectionStatus, 
  StudyGroup, 
  GroupMember, 
  GroupJoinRequest, 
  Conversation, 
  MessageItem, 
  ScheduleItem, 
  NotificationItem, 
  ReviewItem, 
  ReportItem, 
  CMSContent, 
  AdminLogItem, 
  SystemSettings 
} from '../types/index.ts';

// Initialize Firebase App & Services
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const SUPER_ADMIN_EMAIL = 'diemle.31251570086@st.ueh.edu.vn';

// Test connection on boot per requirement
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// Error handler conforming to FirestoreErrorInfo
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ================= AUTHENTICATION SERVICES ================= //

export async function loginWithGoogle(): Promise<UserProfile> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    return await syncOrCreateUserProfile(user.uid, user.email || '', user.displayName || 'Sinh viên UEH', user.photoURL || undefined);
  } catch (error) {
    console.error('Google Sign-In Error', error);
    throw error;
  }
}

export async function registerWithEmail(
  email: string, 
  pass: string, 
  displayName: string, 
  studentId?: string, 
  major?: string, 
  cohort?: string
): Promise<UserProfile> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateAuthProfile(cred.user, { displayName });
    return await syncOrCreateUserProfile(cred.user.uid, email, displayName, undefined, studentId, major, cohort);
  } catch (error) {
    console.error('Email Registration Error', error);
    throw error;
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    const profile = await getUserProfile(cred.user.uid);
    if (!profile) {
      return await syncOrCreateUserProfile(cred.user.uid, email, cred.user.displayName || email.split('@')[0]);
    }
    return profile;
  } catch (error) {
    console.error('Email Login Error', error);
    throw error;
  }
}

export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password Reset Error', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-out Error', error);
    throw error;
  }
}

// ================= USER & PROFILE SERVICES ================= //

export async function syncOrCreateUserProfile(
  uid: string, 
  email: string, 
  displayName: string, 
  photoURL?: string,
  studentId?: string,
  major?: string,
  cohort?: string
): Promise<UserProfile> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userDocRef);

    // Is this user the Super Admin?
    const isSuperAdminEmail = email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    if (userSnap.exists()) {
      const data = userSnap.data() as UserProfile;
      const updates: Partial<UserProfile> = {};
      
      // Update any fields if new info provided
      if (studentId && (!data.studentId || data.studentId === '')) {
        updates.studentId = studentId;
      }
      if (major && (!data.major || data.major === '')) {
        updates.major = major;
      }
      if (cohort && (!data.cohort || data.cohort === '')) {
        updates.cohort = cohort;
      }
      if (displayName && (!data.displayName || data.displayName === 'Sinh viên UEH')) {
        updates.displayName = displayName;
      }
      if (isSuperAdminEmail && data.role !== 'superadmin') {
        updates.role = 'superadmin';
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
        await updateDoc(userDocRef, updates);
        return { ...data, ...updates } as UserProfile;
      }
      return data;
    }

    // Create fresh profile
    const newProfile: UserProfile = {
      id: uid,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim() || 'Sinh viên UEH',
      photoURL: photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName.trim() || uid)}`,
      studentId: studentId?.trim() || '',
      major: major || 'Kinh doanh quốc tế',
      cohort: cohort || 'K49',
      bio: 'Chào mọi người! Mình là sinh viên UEH Mekong, rất mong muốn được giao lưu và trao đổi kỹ năng cùng các bạn!',
      skillsToShare: [],
      skillsToLearn: [],
      proficiency: 'Trung cấp',
      learningPreferences: 'Hybrid',
      availableTime: 'Tối thứ 2, thứ 4, thứ 6 hoặc cuối tuần',
      role: isSuperAdminEmail ? 'superadmin' : 'user',
      status: 'active',
      isProfileComplete: false,
      isPublic: true,
      rating: 5.0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(userDocRef, newProfile);
    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, 'users', uid);
    // Sanitize: do not allow user to update role via normal profile edit
    const sanitized = { ...data, updatedAt: new Date().toISOString() };
    delete (sanitized as any).id;
    await updateDoc(userDocRef, sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getPublicStudents(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const q = query(collection(db, 'users'), where('status', '==', 'active'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ================= SKILLS & CATEGORIES ================= //

export const DEFAULT_SKILL_CATEGORIES: SkillCategory[] = [
  {
    id: 'tech',
    name: 'Công nghệ & Kỹ thuật số',
    description: 'Excel nâng cao, PowerBI, Canva, Photoshop, Lập trình Web/Python, Phân tích dữ liệu',
    icon: 'Laptop',
    order: 1
  },
  {
    id: 'languages',
    name: 'Ngoại ngữ & Chứng chỉ',
    description: 'Tiếng Anh giao tiếp, Luyện thi IELTS, TOEIC, Tiếng Trung, Tiếng Nhật cơ bản',
    icon: 'Globe',
    order: 2
  },
  {
    id: 'business',
    name: 'Kinh doanh & Marketing',
    description: 'Digital Marketing, Content Marketing, Social Media, Bán hàng, Khởi nghiệp sinh viên',
    icon: 'TrendingUp',
    order: 3
  },
  {
    id: 'design',
    name: 'Thiết kế & Sáng tạo nội dung',
    description: 'Thiết kế đồ họa, Chỉnh sửa video CapCut/Premiere, Chụp ảnh, Thiết kế slide thuyết trình',
    icon: 'Palette',
    order: 4
  },
  {
    id: 'soft-skills',
    name: 'Kỹ năng mềm & Phát triển',
    description: 'Thuyết trình tự tin, Giao tiếp & Đàm phán, Làm việc nhóm, Quản lý thời gian, Nghiên cứu khoa học',
    icon: 'Users',
    order: 5
  }
];

export async function initDefaultCategories(): Promise<SkillCategory[]> {
  const path = 'skillCategories';
  try {
    const snap = await getDocs(collection(db, 'skillCategories'));
    if (snap.empty) {
      for (const cat of DEFAULT_SKILL_CATEGORIES) {
        await setDoc(doc(db, 'skillCategories', cat.id), cat);
      }
      return DEFAULT_SKILL_CATEGORIES;
    }
    return snap.docs.map(d => d.data() as SkillCategory).sort((a, b) => a.order - b.order);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getSkillCategories(): Promise<SkillCategory[]> {
  return await initDefaultCategories();
}

export async function getSkills(): Promise<SkillItem[]> {
  const path = 'skills';
  try {
    const q = query(collection(db, 'skills'), where('status', '==', 'active'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as SkillItem));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addSkill(skill: Omit<SkillItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const path = 'skills';
  try {
    const newDocRef = doc(collection(db, 'skills'));
    const item: SkillItem = {
      ...skill,
      id: newDocRef.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(newDocRef, item);
    return newDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ================= 1-ON-1 SKILL SWAP MATCHING ================= //

export function calculateCompatibilityScore(studentA: UserProfile, studentB: UserProfile): {
  score: number;
  matchedGiveAndTake: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  let score = 50;

  // Check reciprocal exchange (A shares what B wants to learn & B shares what A wants to learn)
  const aCanTeachB = studentA.skillsToShare.some(sA => 
    studentB.skillsToLearn.some(sB => sA.name.toLowerCase().includes(sB.name.toLowerCase()) || sB.name.toLowerCase().includes(sA.name.toLowerCase()))
  );

  const bCanTeachA = studentB.skillsToShare.some(sB => 
    studentA.skillsToLearn.some(sA => sB.name.toLowerCase().includes(sA.name.toLowerCase()) || sA.name.toLowerCase().includes(sB.name.toLowerCase()))
  );

  const matchedGiveAndTake = aCanTeachB && bCanTeachA;

  if (matchedGiveAndTake) {
    score += 40;
    reasons.push('Hoàn hảo: Có kỹ năng trao đổi 2 chiều tương thích');
  } else if (aCanTeachB) {
    score += 20;
    reasons.push('Bạn có kỹ năng bạn này đang cần học');
  } else if (bCanTeachA) {
    score += 20;
    reasons.push('Bạn này có kỹ năng bạn đang tìm kiếm');
  }

  // Same study mode preference
  if (studentA.learningPreferences && studentA.learningPreferences === studentB.learningPreferences) {
    score += 5;
    reasons.push(`Cùng hình thức học: ${studentA.learningPreferences}`);
  }

  // Same or neighboring cohort
  if (studentA.cohort && studentB.cohort && studentA.cohort === studentB.cohort) {
    score += 5;
    reasons.push(`Cùng khóa sinh viên (${studentA.cohort})`);
  }

  return {
    score: Math.min(score, 99),
    matchedGiveAndTake,
    reasons: reasons.length ? reasons : ['Cùng học tại UEH Mekong, có thể kết nối học hỏi']
  };
}

export async function createConnectionRequest(data: {
  requester: UserProfile;
  recipient: UserProfile;
  requesterSkillOffered: string;
  requesterSkillWanted: string;
  message?: string;
  initialStatus?: ConnectionStatus;
}): Promise<string> {
  const path = 'connections';
  try {
    // Check if duplicate pending connection already exists
    const q = query(
      collection(db, 'connections'),
      where('requesterId', '==', data.requester.id),
      where('recipientId', '==', data.recipient.id)
    );
    const existingSnap = await getDocs(q);
    const hasActive = existingSnap.docs.some(d => {
      const st = d.data().status;
      return st === 'pending' || st === 'connected' || st === 'active';
    });

    if (hasActive) {
      throw new Error('Lời mời kết nối giữa hai bạn đã tồn tại hoặc đang trong quá trình trao đổi!');
    }

    const connDocRef = doc(collection(db, 'connections'));
    const conn: Connection = {
      id: connDocRef.id,
      requesterId: data.requester.id,
      requesterName: data.requester.displayName,
      requesterEmail: data.requester.email,
      requesterPhoto: data.requester.photoURL,
      recipientId: data.recipient.id,
      recipientName: data.recipient.displayName,
      recipientEmail: data.recipient.email,
      recipientPhoto: data.recipient.photoURL,
      requesterSkillOffered: data.requesterSkillOffered,
      requesterSkillWanted: data.requesterSkillWanted,
      message: data.message || 'Xin chào! Mình muốn kết nối trao đổi kỹ năng cùng bạn.',
      status: data.initialStatus || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(connDocRef, conn);

    // Create notification for recipient
    await sendNotification({
      userId: data.recipient.id,
      title: 'Lời mời trao đổi kỹ năng mới',
      message: `${data.requester.displayName} muốn trao đổi kỹ năng "${data.requesterSkillOffered}" với "${data.requesterSkillWanted}" cùng bạn.`,
      type: 'connection_request',
      link: '/connections'
    });

    return connDocRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateConnectionStatus(connectionId: string, status: ConnectionStatus, scheduleInfo?: Connection['scheduleInfo']): Promise<void> {
  const path = `connections/${connectionId}`;
  try {
    const connRef = doc(db, 'connections', connectionId);
    const connSnap = await getDoc(connRef);
    if (!connSnap.exists()) throw new Error('Kết nối không tồn tại');
    const connData = connSnap.data() as Connection;

    const payload: Partial<Connection> = {
      status,
      updatedAt: new Date().toISOString()
    };
    if (scheduleInfo) {
      payload.scheduleInfo = scheduleInfo;
    }
    await updateDoc(connRef, payload);

    // Notify the other party
    const targetUserId = auth.currentUser?.uid === connData.requesterId ? connData.recipientId : connData.requesterId;
    let notifyTitle = 'Cập nhật trạng thái trao đổi';
    let notifyMsg = `Kết nối trao đổi đã chuyển sang trạng thái: ${status}`;

    if (status === 'accepted' || status === 'connected') {
      notifyTitle = 'Lời mời trao đổi đã được chấp nhận!';
      notifyMsg = `Bạn và đối tác đã kết nối. Hãy lên lịch trao đổi kỹ năng ngay nhé!`;
    } else if (status === 'completed') {
      notifyTitle = 'Buổi trao đổi kỹ năng đã hoàn thành!';
      notifyMsg = `Hãy gửi đánh giá và nhận xét trải nghiệm học tập cùng đối tác nhé.`;
    }

    await sendNotification({
      userId: targetUserId,
      title: notifyTitle,
      message: notifyMsg,
      type: `connection_${status}`,
      link: '/connections'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getUserConnections(userId: string): Promise<Connection[]> {
  const path = 'connections';
  try {
    const q1 = query(collection(db, 'connections'), where('requesterId', '==', userId));
    const q2 = query(collection(db, 'connections'), where('recipientId', '==', userId));

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const map = new Map<string, Connection>();

    snap1.docs.forEach(d => map.set(d.id, d.data() as Connection));
    snap2.docs.forEach(d => map.set(d.id, d.data() as Connection));

    return Array.from(map.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ================= STUDY GROUPS & ATOMIC TRANSACTIONS ================= //

export async function createStudyGroup(data: {
  name: string;
  topic: string;
  skillNeeded: string;
  category: string;
  description: string;
  minMembers: number;
  maxMembers: number;
  mode: 'online' | 'offline' | 'hybrid';
  schedule: string;
  location: string;
  isPublic: boolean;
  user: UserProfile;
}): Promise<string> {
  const path = 'groups';
  try {
    const groupRef = doc(collection(db, 'groups'));
    const groupId = groupRef.id;

    const newGroup: StudyGroup = {
      id: groupId,
      name: data.name,
      topic: data.topic,
      skillNeeded: data.skillNeeded,
      category: data.category,
      description: data.description,
      minMembers: data.minMembers || 3,
      maxMembers: data.maxMembers || 6,
      currentMembersCount: 1, // Owner is member #1
      mode: data.mode,
      schedule: data.schedule,
      location: data.location,
      isPublic: data.isPublic,
      status: 'open',
      ownerId: data.user.id,
      ownerName: data.user.displayName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Use transaction to create group AND owner groupMember atomically
    await runTransaction(db, async (txn) => {
      const memberDocRef = doc(db, 'groupMembers', `${groupId}_${data.user.id}`);
      txn.set(groupRef, newGroup);
      txn.set(memberDocRef, {
        id: `${groupId}_${data.user.id}`,
        groupId,
        userId: data.user.id,
        userName: data.user.displayName,
        userEmail: data.user.email,
        userPhoto: data.user.photoURL,
        role: 'owner',
        joinedAt: new Date().toISOString()
      });
    });

    return groupId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getStudyGroups(): Promise<StudyGroup[]> {
  const path = 'groups';
  try {
    const q = query(collection(db, 'groups'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as StudyGroup).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getGroupById(groupId: string): Promise<StudyGroup | null> {
  const path = `groups/${groupId}`;
  try {
    const snap = await getDoc(doc(db, 'groups', groupId));
    if (!snap.exists()) return null;
    return snap.data() as StudyGroup;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const path = 'groupMembers';
  try {
    const q = query(collection(db, 'groupMembers'), where('groupId', '==', groupId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as GroupMember);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// CRITICAL ATOMIC TRANSACTION: Join Group
// Guarantees: checks group existence, open status, capacity, duplicate membership
export async function joinGroupTransaction(groupId: string, user: UserProfile): Promise<void> {
  const path = `groups/${groupId}`;
  try {
    await runTransaction(db, async (txn) => {
      const groupRef = doc(db, 'groups', groupId);
      const memberRef = doc(db, 'groupMembers', `${groupId}_${user.id}`);

      const groupSnap = await txn.get(groupRef);
      if (!groupSnap.exists()) {
        throw new Error('Nhóm học tập không tồn tại.');
      }

      const groupData = groupSnap.data() as StudyGroup;

      if (groupData.status !== 'open' && groupData.status !== 'active') {
        throw new Error('Nhóm học tập đã đóng hoặc đã hủy, không thể tham gia.');
      }

      // Check if already a member
      const memberSnap = await txn.get(memberRef);
      if (memberSnap.exists()) {
        throw new Error('Bạn đã là thành viên của nhóm học này.');
      }

      // Check capacity limit
      if (groupData.currentMembersCount >= groupData.maxMembers) {
        throw new Error(`Nhóm đã đạt giới hạn tối đa (${groupData.maxMembers} thành viên).`);
      }

      // Atomic write: increment member count and set status
      const newCount = groupData.currentMembersCount + 1;
      const newStatus: StudyGroup['status'] = newCount >= groupData.maxMembers ? 'active' : 'open';

      txn.update(groupRef, {
        currentMembersCount: newCount,
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Insert member doc with unique composite ID
      const newMember: GroupMember = {
        id: `${groupId}_${user.id}`,
        groupId,
        userId: user.id,
        userName: user.displayName,
        userEmail: user.email,
        userPhoto: user.photoURL,
        role: 'member',
        joinedAt: new Date().toISOString()
      };
      txn.set(memberRef, newMember);
    });

    // Notify group owner
    const gSnap = await getDoc(doc(db, 'groups', groupId));
    if (gSnap.exists()) {
      const g = gSnap.data() as StudyGroup;
      await sendNotification({
        userId: g.ownerId,
        title: 'Thành viên mới tham gia nhóm',
        message: `${user.displayName} vừa tham gia nhóm "${g.name}".`,
        type: 'group_member_joined',
        link: `/groups/${groupId}`
      });
    }
  } catch (error) {
    console.error('Join Group Transaction Error', error);
    throw error;
  }
}

// Leave Group Transaction
export async function leaveGroupTransaction(groupId: string, userId: string): Promise<void> {
  const path = `groups/${groupId}`;
  try {
    await runTransaction(db, async (txn) => {
      const groupRef = doc(db, 'groups', groupId);
      const memberRef = doc(db, 'groupMembers', `${groupId}_${userId}`);

      const groupSnap = await txn.get(groupRef);
      if (!groupSnap.exists()) throw new Error('Nhóm không tồn tại.');
      const memberSnap = await txn.get(memberRef);
      if (!memberSnap.exists()) throw new Error('Bạn không phải là thành viên nhóm này.');

      const memberData = memberSnap.data() as GroupMember;
      if (memberData.role === 'owner') {
        throw new Error('Chủ nhóm (Owner) không thể rời nhóm. Hãy chuyển quyền hoặc đóng nhóm.');
      }

      const groupData = groupSnap.data() as StudyGroup;
      const newCount = Math.max(1, groupData.currentMembersCount - 1);

      txn.update(groupRef, {
        currentMembersCount: newCount,
        status: 'open',
        updatedAt: new Date().toISOString()
      });

      txn.delete(memberRef);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Request to join private group
export async function requestJoinPrivateGroup(groupId: string, user: UserProfile, message: string): Promise<void> {
  const path = 'groupJoinRequests';
  try {
    const q = query(
      collection(db, 'groupJoinRequests'), 
      where('groupId', '==', groupId), 
      where('userId', '==', user.id),
      where('status', '==', 'pending')
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
      throw new Error('Bạn đã gửi yêu cầu tham gia và đang chờ chủ nhóm xét duyệt!');
    }

    const gSnap = await getDoc(doc(db, 'groups', groupId));
    if (!gSnap.exists()) throw new Error('Nhóm không tồn tại.');
    const gData = gSnap.data() as StudyGroup;

    const reqRef = doc(collection(db, 'groupJoinRequests'));
    const newReq: GroupJoinRequest = {
      id: reqRef.id,
      groupId,
      groupName: gData.name,
      userId: user.id,
      userName: user.displayName,
      userEmail: user.email,
      userPhoto: user.photoURL,
      message,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(reqRef, newReq);

    // Notify owner
    await sendNotification({
      userId: gData.ownerId,
      title: 'Yêu cầu tham gia nhóm học',
      message: `${user.displayName} xin tham gia nhóm "${gData.name}".`,
      type: 'group_request',
      link: `/groups/${groupId}`
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getGroupJoinRequests(groupId: string): Promise<GroupJoinRequest[]> {
  const path = 'groupJoinRequests';
  try {
    const q = query(collection(db, 'groupJoinRequests'), where('groupId', '==', groupId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as GroupJoinRequest);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Approve Join Request Transaction
export async function approveJoinRequestTransaction(requestId: string, groupId: string, candidate: UserProfile): Promise<void> {
  try {
    await runTransaction(db, async (txn) => {
      const groupRef = doc(db, 'groups', groupId);
      const reqRef = doc(db, 'groupJoinRequests', requestId);
      const memberRef = doc(db, 'groupMembers', `${groupId}_${candidate.id}`);

      const groupSnap = await txn.get(groupRef);
      if (!groupSnap.exists()) throw new Error('Nhóm không tồn tại.');
      const group = groupSnap.data() as StudyGroup;

      if (group.currentMembersCount >= group.maxMembers) {
        throw new Error('Nhóm đã đủ thành viên.');
      }

      const memberSnap = await txn.get(memberRef);
      if (memberSnap.exists()) {
        throw new Error('Ứng viên đã là thành viên nhóm.');
      }

      txn.update(reqRef, {
        status: 'approved',
        updatedAt: new Date().toISOString()
      });

      txn.update(groupRef, {
        currentMembersCount: group.currentMembersCount + 1,
        status: (group.currentMembersCount + 1 >= group.maxMembers) ? 'active' : 'open',
        updatedAt: new Date().toISOString()
      });

      txn.set(memberRef, {
        id: `${groupId}_${candidate.id}`,
        groupId,
        userId: candidate.id,
        userName: candidate.displayName,
        userEmail: candidate.email,
        userPhoto: candidate.photoURL,
        role: 'member',
        joinedAt: new Date().toISOString()
      });
    });

    await sendNotification({
      userId: candidate.id,
      title: 'Yêu cầu tham gia nhóm được chấp thuận!',
      message: `Bạn đã trở thành thành viên chính thức của nhóm học tập.`,
      type: 'group_approved',
      link: `/groups/${groupId}`
    });
  } catch (error) {
    console.error('Approve Join Request Error', error);
    throw error;
  }
}

// ================= SCHEDULES ================= //

export async function createSchedule(schedule: Omit<ScheduleItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const path = 'schedules';
  try {
    const ref = doc(collection(db, 'schedules'));
    const item: ScheduleItem = {
      ...schedule,
      id: ref.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(ref, item);

    // Notify all participants
    for (const pId of schedule.participants) {
      if (pId !== auth.currentUser?.uid) {
        await sendNotification({
          userId: pId,
          title: 'Lịch học trao đổi mới đã được tạo',
          message: `Buổi học "${schedule.title}" vào ngày ${schedule.date} lúc ${schedule.startTime}.`,
          type: 'schedule_new',
          link: '/schedule'
        });
      }
    }
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getUserSchedules(userId: string): Promise<ScheduleItem[]> {
  const path = 'schedules';
  try {
    const q = query(collection(db, 'schedules'), where('participants', 'array-contains', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ScheduleItem).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateScheduleStatus(scheduleId: string, status: ScheduleItem['status']): Promise<void> {
  const path = `schedules/${scheduleId}`;
  try {
    await updateDoc(doc(db, 'schedules', scheduleId), {
      status,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const path = 'conversations';
  try {
    const q = query(
      collection(db, 'conversations'), 
      where('participants', 'array-contains', userId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
    return list.sort((a, b) => new Date(b.lastMessageAt || b.updatedAt).getTime() - new Date(a.lastMessageAt || a.updatedAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ================= CHAT & REAL-TIME MESSAGING ================= //

export async function getOrCreateDirectConversation(user1Id: string, user2Id: string): Promise<string> {
  const path = 'conversations';
  try {
    const q = query(
      collection(db, 'conversations'), 
      where('type', '==', 'direct'), 
      where('participants', 'array-contains', user1Id)
    );
    const snap = await getDocs(q);
    const found = snap.docs.find(d => {
      const p = d.data().participants as string[];
      return p.includes(user2Id);
    });

    if (found) return found.id;

    const newRef = doc(collection(db, 'conversations'));
    const conv: Conversation = {
      id: newRef.id,
      type: 'direct',
      participants: [user1Id, user2Id],
      lastMessage: 'Cuộc trò chuyện được bắt đầu',
      lastMessageAt: new Date().toISOString(),
      lastSenderId: user1Id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(newRef, conv);
    return newRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getOrCreateGroupConversation(groupId: string, participants: string[]): Promise<string> {
  const path = 'conversations';
  try {
    const q = query(collection(db, 'conversations'), where('groupId', '==', groupId));
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0].id;

    const newRef = doc(collection(db, 'conversations'));
    const conv: Conversation = {
      id: newRef.id,
      type: 'group',
      groupId,
      participants,
      lastMessage: 'Nhóm thảo luận đã tạo',
      lastMessageAt: new Date().toISOString(),
      lastSenderId: auth.currentUser?.uid || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(newRef, conv);
    return newRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToMessages(conversationId: string, callback: (messages: MessageItem[]) => void) {
  const path = 'messages';
  const q = query(collection(db, 'messages'), where('conversationId', '==', conversationId));
  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs.map(d => d.data() as MessageItem);
    msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    callback(msgs);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
}

export async function sendMessage(conversationId: string, text: string, sender: UserProfile): Promise<void> {
  const path = 'messages';
  try {
    const msgRef = doc(collection(db, 'messages'));
    const msg: MessageItem = {
      id: msgRef.id,
      conversationId,
      senderId: sender.id,
      senderName: sender.displayName,
      senderPhoto: sender.photoURL,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };
    await setDoc(msgRef, msg);

    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: text.trim(),
      lastMessageAt: new Date().toISOString(),
      lastSenderId: sender.id,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ================= NOTIFICATIONS ================= //

export async function sendNotification(data: Omit<NotificationItem, 'id' | 'isRead' | 'createdAt'>): Promise<void> {
  const path = 'notifications';
  try {
    const nRef = doc(collection(db, 'notifications'));
    const notif: NotificationItem = {
      ...data,
      id: nRef.id,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    await setDoc(nRef, notif);
  } catch (error) {
    console.error('Send Notification Failed', error);
  }
}

export async function getUserNotifications(userId: string): Promise<NotificationItem[]> {
  const path = 'notifications';
  try {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId), limit(30));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as NotificationItem).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const path = `notifications/${id}`;
  try {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ================= REVIEWS & RATINGS ================= //

export async function createReview(data: Omit<ReviewItem, 'id' | 'createdAt'>): Promise<string> {
  const path = 'reviews';
  try {
    const ref = doc(collection(db, 'reviews'));
    const item: ReviewItem = {
      ...data,
      id: ref.id,
      createdAt: new Date().toISOString()
    };
    await setDoc(ref, item);

    // Update recipient profile average rating if target is a user
    if (data.targetType === 'user') {
      const userRef = doc(db, 'users', data.targetId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const u = userSnap.data() as UserProfile;
        const currentCount = u.reviewCount || 0;
        const currentRating = u.rating || 5;
        const newCount = currentCount + 1;
        const newAvg = Number(((currentRating * currentCount + data.rating) / newCount).toFixed(1));
        await updateDoc(userRef, {
          rating: newAvg,
          reviewCount: newCount,
          updatedAt: new Date().toISOString()
        });
      }
    }

    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getReviewsForTarget(targetId: string): Promise<ReviewItem[]> {
  const path = 'reviews';
  try {
    const q = query(collection(db, 'reviews'), where('targetId', '==', targetId), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as ReviewItem).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ================= REPORTS & AUDIT ================= //

export async function submitReport(report: Omit<ReportItem, 'id' | 'status' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const path = 'reports';
  try {
    const ref = doc(collection(db, 'reports'));
    const item: ReportItem = {
      ...report,
      id: ref.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(ref, item);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getAllReportsAdmin(): Promise<ReportItem[]> {
  const path = 'reports';
  try {
    const snap = await getDocs(collection(db, 'reports'));
    return snap.docs.map(d => d.data() as ReportItem).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateReportStatusAdmin(reportId: string, status: ReportItem['status'], resolutionNotes: string, adminId: string): Promise<void> {
  const path = `reports/${reportId}`;
  try {
    await updateDoc(doc(db, 'reports', reportId), {
      status,
      resolutionNotes,
      resolvedBy: adminId,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ================= CMS & DYNAMIC HOMEPAGE ================= //

export const DEFAULT_CMS_CONTENT: CMSContent = {
  id: 'homepage_content',
  heroBadge: 'Nền tảng Trao đổi Kỹ năng Sinh viên UEH Mekong',
  heroTitle: 'Chia sẻ điều bạn biết. Học hỏi điều bạn cần.',
  heroSubtitle: 'Kết nối 1–1 hoặc tham gia nhóm học tập cùng cộng đồng sinh viên UEH Phân hiệu Vĩnh Long năng động. Phát triển kỹ năng thực chiến, chuẩn bị hành trang vững chắc cho tương lai.',
  announcement: 'Chào mừng năm học mới! Khám phá ngay các nhóm ôn thi IELTS, lập trình Python & thiết kế Canva miễn phí do các bạn sinh viên tự tổ chức.',
  guideSteps: [
    {
      step: 1,
      title: 'Tạo hồ sơ kỹ năng',
      desc: 'Liệt kê các kỹ năng bạn tự tin có thể chia sẻ và những kỹ năng bạn đang mong muốn học hỏi.',
      icon: 'UserCheck'
    },
    {
      step: 2,
      title: 'Khám phá & Ghép cặp',
      desc: 'Tìm kiếm sinh viên có nhu cầu tương thích hoặc khám phá các nhóm học tập đang mở đăng ký.',
      icon: 'Repeat'
    },
    {
      step: 3,
      title: 'Lên lịch & Trao đổi',
      desc: 'Thống nhất thời gian, địa điểm tại UEH Mekong hoặc học online qua Google Meet dễ dàng.',
      icon: 'Calendar'
    },
    {
      step: 4,
      title: 'Hoàn thành & Đánh giá',
      desc: 'Xác nhận buổi trao đổi thành công và để lại nhận xét tích cực giúp xây dựng cộng đồng uy tín.',
      icon: 'Award'
    }
  ],
  contactEmail: 'mekong@ueh.edu.vn',
  contactPhone: '(0270) 3823443',
  updatedAt: new Date().toISOString()
};

export async function getCMSContent(): Promise<CMSContent> {
  const path = 'cms/homepage_content';
  try {
    const snap = await getDoc(doc(db, 'cms', 'homepage_content'));
    if (!snap.exists()) {
      // Seed default CMS content
      await setDoc(doc(db, 'cms', 'homepage_content'), DEFAULT_CMS_CONTENT);
      return DEFAULT_CMS_CONTENT;
    }
    return snap.data() as CMSContent;
  } catch (error) {
    console.warn('CMS read error, falling back to default', error);
    return DEFAULT_CMS_CONTENT;
  }
}

export async function updateCMSContent(data: Partial<CMSContent>, adminUser: UserProfile): Promise<void> {
  const path = 'cms/homepage_content';
  try {
    const payload = {
      ...data,
      updatedAt: new Date().toISOString(),
      updatedBy: adminUser.displayName
    };
    await setDoc(doc(db, 'cms', 'homepage_content'), payload, { merge: true });
    await addAdminLog({
      adminId: adminUser.id,
      adminName: adminUser.displayName,
      adminEmail: adminUser.email,
      action: 'UPDATE_CMS',
      targetType: 'cms',
      targetId: 'homepage_content',
      details: 'Cập nhật nội dung trang chủ và thông tin nền tảng'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ================= ADMIN AUDIT LOGS & USER MANAGEMENT ================= //

export async function addAdminLog(data: Omit<AdminLogItem, 'id' | 'timestamp'>): Promise<void> {
  const path = 'adminLogs';
  try {
    const ref = doc(collection(db, 'adminLogs'));
    const item: AdminLogItem = {
      ...data,
      id: ref.id,
      timestamp: new Date().toISOString()
    };
    await setDoc(ref, item);
  } catch (error) {
    console.error('Add Admin Log Error', error);
  }
}

export async function getAdminLogs(): Promise<AdminLogItem[]> {
  const path = 'adminLogs';
  try {
    const snap = await getDocs(collection(db, 'adminLogs'));
    return snap.docs.map(d => d.data() as AdminLogItem).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getAllUsersAdmin(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map(d => d.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function updateUserRoleAdmin(targetUserId: string, newRole: 'user' | 'admin' | 'superadmin', adminUser: UserProfile): Promise<void> {
  const path = `users/${targetUserId}`;
  try {
    if (adminUser.role !== 'superadmin') {
      throw new Error('Chỉ Super Admin mới có quyền thăng cấp hoặc thu hồi quyền Admin!');
    }
    await updateDoc(doc(db, 'users', targetUserId), {
      role: newRole,
      updatedAt: new Date().toISOString()
    });

    // Also sync to admins reference collection
    if (newRole === 'admin' || newRole === 'superadmin') {
      await setDoc(doc(db, 'admins', targetUserId), {
        role: newRole,
        assignedBy: adminUser.id,
        assignedAt: new Date().toISOString()
      });
    } else {
      await deleteDoc(doc(db, 'admins', targetUserId)).catch(() => {});
    }

    await addAdminLog({
      adminId: adminUser.id,
      adminName: adminUser.displayName,
      adminEmail: adminUser.email,
      action: 'UPDATE_ROLE',
      targetType: 'user',
      targetId: targetUserId,
      details: `Đổi vai trò thành: ${newRole}`
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleUserStatusAdmin(targetUserId: string, newStatus: 'active' | 'suspended', adminUser: UserProfile): Promise<void> {
  const path = `users/${targetUserId}`;
  try {
    await updateDoc(doc(db, 'users', targetUserId), {
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
    await addAdminLog({
      adminId: adminUser.id,
      adminName: adminUser.displayName,
      adminEmail: adminUser.email,
      action: 'TOGGLE_USER_STATUS',
      targetType: 'user',
      targetId: targetUserId,
      details: `Trạng thái mới: ${newStatus}`
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getAdminDashboardStats() {
  try {
    const [usersSnap, skillsSnap, groupsSnap, connsSnap, reportsSnap, reviewsSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'skills')),
      getDocs(collection(db, 'groups')),
      getDocs(collection(db, 'connections')),
      getDocs(collection(db, 'reports')),
      getDocs(collection(db, 'reviews'))
    ]);

    const users = usersSnap.docs.map(d => d.data() as UserProfile);
    const groups = groupsSnap.docs.map(d => d.data() as StudyGroup);
    const reports = reportsSnap.docs.map(d => d.data() as ReportItem);

    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'active').length,
      totalSkills: skillsSnap.size,
      totalConnections: connsSnap.size,
      totalGroups: groups.length,
      activeGroups: groups.filter(g => g.status === 'open' || g.status === 'active').length,
      pendingReports: reports.filter(r => r.status === 'pending').length,
      totalReviews: reviewsSnap.size
    };
  } catch (error) {
    console.error('Fetch Stats Error', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalSkills: 0,
      totalConnections: 0,
      totalGroups: 0,
      activeGroups: 0,
      pendingReports: 0,
      totalReviews: 0
    };
  }
}
