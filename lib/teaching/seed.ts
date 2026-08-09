import type {
  TeachingLearningEvent,
  TeachingStudentProfile,
} from './types';

export const DEFAULT_TEACHING_COURSE_ID = 'embodied-intelligence';

export const defaultTeachingCourse = {
  id: DEFAULT_TEACHING_COURSE_ID,
  title: '具身智能课程',
  description:
    '面向具身智能导论课程，覆盖环境感知、世界模型、任务规划、运动规划、操作控制和多智能体协同。',
};

export const defaultStudents: TeachingStudentProfile[] = [
  {
    id: '2024001',
    name: '张明',
    goal: '补齐运动规划和操作控制基础，能够独立完成 MoveIt 实验。',
    level: '基础偏弱但学习意愿强',
    preferences: { pace: '循序渐进', style: '案例类比', resourcePriority: 'practice' },
  },
  {
    id: '2024002',
    name: '刘洋',
    goal: '深化世界模型与多智能体强化学习，准备课程项目展示。',
    level: '基础扎实',
    preferences: { pace: '快速', style: '理论推导', resourcePriority: 'paper' },
  },
  {
    id: '2024003',
    name: '陈静',
    goal: '把算法原理和机器人应用案例连接起来。',
    level: '中等偏上',
    preferences: { pace: '标准', style: '实验优先', resourcePriority: 'visual' },
  },
  {
    id: '2024004',
    name: '王浩',
    goal: '掌握任务规划链路，提升练习正确率。',
    level: '中等',
    preferences: { pace: '标准', style: '启发式提问', resourcePriority: 'balanced' },
  },
  {
    id: '2024005',
    name: '李雪',
    goal: '跟上课程进度，减少概念混淆。',
    level: '中等偏弱',
    preferences: { pace: '循序渐进', style: '图示说明', resourcePriority: 'visual' },
  },
];


export interface SeedAccount {
  id: string;
  username: string;
  /** Plaintext password; only used at seed time to derive the stored hash. */
  password: string;
  role: 'teacher' | 'student';
  displayName: string;
  /** Linked teaching_students.id; null for teachers. */
  studentId: string | null;
}

/** Test accounts: 1 teacher + 5 students. Student usernames match their student ids. */
export const defaultAccounts: SeedAccount[] = [
  {
    id: 'acc-teacher',
    username: 'teacher',
    password: 'teacher123',
    role: 'teacher',
    displayName: '陈教授',
    studentId: null,
  },
  ...defaultStudents.map((student) => ({
    id: `acc-${student.id}`,
    username: student.id,
    password: 'student123',
    role: 'student' as const,
    displayName: student.name,
    studentId: student.id,
  })),
];

function daysAgo(dayOffset: number, hour = 10): string {
  const date = new Date();
  date.setDate(date.getDate() - dayOffset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

const event = (
  id: string,
  studentId: string,
  eventType: TeachingLearningEvent['eventType'],
  knowledgeNodeId: string,
  score: number | null,
  durationMinutes: number,
  dayOffset: number,
  payload: Record<string, unknown> = {},
): TeachingLearningEvent => ({
  id,
  studentId,
  eventType,
  knowledgeNodeId,
  score,
  durationMinutes,
  occurredAt: daysAgo(dayOffset, 9 + (Number(id.replace(/\D/g, '').slice(-1)) % 9)),
  payload,
});

export const defaultLearningEvents: TeachingLearningEvent[] = [
  event('ev-001', '2024001', 'study', 'ch09-1-1', 84, 35, 14),
  event('ev-002', '2024001', 'practice', 'ch09-2-2', 78, 28, 10),
  event('ev-003', '2024001', 'qa', 'ch13-2-2', 42, 12, 5, {
    question: 'RRT 和 PRM 的区别是什么？',
  }),
  event('ev-004', '2024001', 'practice', 'ch13-2-2', 35, 25, 4),
  event('ev-005', '2024001', 'quiz', 'ch13-2-3', 32, 20, 3),
  event('ev-006', '2024001', 'qa', 'ch13-3-1', 25, 10, 2, {
    question: '抓取规划为什么要考虑接触力？',
  }),
  event('ev-007', '2024001', 'review', 'ch09-2-2', 82, 20, 1),
  event('ev-008', '2024001', 'practice', 'ch11-2-1', 46, 18, 1),

  event('ev-101', '2024002', 'study', 'ch10-1-1', 86, 45, 6),
  event('ev-102', '2024002', 'practice', 'ch10-2-1', 78, 35, 4),
  event('ev-103', '2024002', 'quiz', 'ch11-2-1', 92, 30, 2),
  event('ev-104', '2024002', 'qa', 'ch11-2-3', 84, 12, 1, {
    question: '集中式训练分布式执行如何实现？',
  }),

  event('ev-201', '2024003', 'study', 'ch09-2-2', 88, 35, 7),
  event('ev-202', '2024003', 'practice', 'ch09-2-3', 72, 25, 5),
  event('ev-203', '2024003', 'practice', 'ch13-2-2', 76, 30, 3),
  event('ev-204', '2024003', 'quiz', 'ch13-3-1', 70, 24, 1),

  event('ev-301', '2024004', 'study', 'ch13-1-1', 70, 32, 8),
  event('ev-302', '2024004', 'qa', 'ch13-2-1', 62, 10, 4, {
    question: 'LLM 任务规划如何避免幻觉？',
  }),
  event('ev-303', '2024004', 'practice', 'ch13-2-2', 64, 28, 2),
  event('ev-304', '2024004', 'quiz', 'ch13-2-3', 58, 20, 1),

  event('ev-401', '2024005', 'study', 'ch10-1-1', 60, 30, 9),
  event('ev-402', '2024005', 'qa', 'ch10-2-1', 48, 12, 6, {
    question: 'Dreamer 的 latent dynamics 是什么？',
  }),
  event('ev-403', '2024005', 'practice', 'ch13-2-2', 52, 24, 3),
  event('ev-404', '2024005', 'quiz', 'ch13-3-1', 46, 18, 1),
];
