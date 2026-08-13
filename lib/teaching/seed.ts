import { chapters as knowledgeChapters } from './knowledge-system';
import type { TeachingLearningEvent, TeachingStudentProfile } from './types';

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

// ============================================================================
// Demo learning events
// ----------------------------------------------------------------------------
// Events are generated from per-student trajectories so the demo shows a
// realistic, varied class: each student has progressed through a different
// range of chapters at a different mastery level. db.ts persists them with
// stable `seed-*` ids and re-applies the full set on every server start, while
// real events emitted during use keep their own `ev-<timestamp>` ids and are
// never touched by re-seeding - so test accounts stay fully usable and keep
// accumulating real data on top of this demo baseline.
// ============================================================================

interface OrderedPoint {
  id: string;
  chapterId: string;
  chapterNumber: number;
}

const orderedPoints: OrderedPoint[] = knowledgeChapters.flatMap((chapter) =>
  chapter.sections.flatMap((section) =>
    section.points.map((point) => ({
      id: point.id,
      chapterId: chapter.id,
      chapterNumber: chapter.number,
    })),
  ),
);

interface StudentTrajectory {
  studentId: string;
  /** Cover chapters 1..through (inclusive, 1-based). */
  through: number;
  studyBase: number;
  practiceBase: number;
  quizBase: number;
  jitter: number;
  /** Fraction of covered points the student struggles with (low scores). */
  weakRatio: number;
  qaCount: number;
  reviewCount: number;
  /** Spread activity over the last N days to keep streaks/trends fresh. */
  spreadDays: number;
  activeToday: boolean;
}

// Coverage rises from ~33% to ~67% (out of 326 knowledge points), mastery and
// quiz scores span 良好 / 及格 / 预警 so the dashboards show a realistic spread.
const trajectories: StudentTrajectory[] = [
  {
    studentId: '2024001',
    through: 10,
    studyBase: 88,
    practiceBase: 85,
    quizBase: 88,
    jitter: 7,
    weakRatio: 0.08,
    qaCount: 16,
    reviewCount: 16,
    spreadDays: 28,
    activeToday: true,
  },
  {
    studentId: '2024002',
    through: 11,
    studyBase: 90,
    practiceBase: 88,
    quizBase: 92,
    jitter: 6,
    weakRatio: 0.07,
    qaCount: 14,
    reviewCount: 20,
    spreadDays: 30,
    activeToday: true,
  },
  {
    studentId: '2024003',
    through: 8,
    studyBase: 80,
    practiceBase: 78,
    quizBase: 78,
    jitter: 9,
    weakRatio: 0.12,
    qaCount: 12,
    reviewCount: 10,
    spreadDays: 24,
    activeToday: false,
  },
  {
    studentId: '2024004',
    through: 7,
    studyBase: 68,
    practiceBase: 64,
    quizBase: 66,
    jitter: 11,
    weakRatio: 0.16,
    qaCount: 14,
    reviewCount: 8,
    spreadDays: 22,
    activeToday: true,
  },
  {
    studentId: '2024005',
    through: 5,
    studyBase: 56,
    practiceBase: 52,
    quizBase: 50,
    jitter: 12,
    weakRatio: 0.2,
    qaCount: 16,
    reviewCount: 6,
    spreadDays: 20,
    activeToday: false,
  },
];

const chapterQuestions: Record<string, string[]> = {
  ch01: ['具身智能的"感知-行动"闭环为什么重要？', 'Moravec 悖论说明了什么？'],
  ch02: ['CPG 和 DMP 在运动生成上有什么区别？', 'Tegotae 原理如何驱动去中心化协调？'],
  ch03: ['SO(3) 李群与 so(3) 李代数如何互相转换？', 'PoE 前向运动学相比 DH 参数有何优势？'],
  ch04: ['DDPM 和 Score-based 模型有什么联系？', 'Flow Matching 统一了哪些生成模型？'],
  ch05: ['力封闭和形封闭的判别条件是什么？', '多指手雅可比如何映射指尖力到关节力矩？'],
  ch06: ['触觉反馈如何提升抓取的稳定性？'],
  ch07: ['Sim-to-Real 的 domain gap 有哪些缓解手段？'],
  ch08: ['计算力矩控制相比 PID 有什么优势？'],
  ch09: ['RRT 和 PRM 的区别是什么？', '抓取规划为什么要考虑接触力？'],
  ch10: ['Dreamer 的 latent dynamics 是什么？', 'RSSM 的结构由哪些部分组成？'],
  ch11: ['集中式训练分布式执行(CTDE)如何实现？', 'SAC 中熵正则化的作用是什么？'],
};

function hashSeed(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const clampScore = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

function timestampAt(dayOffset: number, hour: number, rng: () => number): string {
  const date = new Date();
  date.setDate(date.getDate() - dayOffset);
  date.setHours(hour, Math.floor(rng() * 60), 0, 0);
  return date.toISOString();
}

function buildTrajectoryEvents(t: StudentTrajectory): TeachingLearningEvent[] {
  const rng = makeRng(hashSeed(t.studentId));
  const events: TeachingLearningEvent[] = [];
  const covered = orderedPoints.filter((point) => point.chapterNumber <= t.through);
  const total = covered.length;
  const weakIndices = new Set<number>();
  const weakCount = Math.max(1, Math.round(total * t.weakRatio));
  while (weakIndices.size < weakCount) {
    weakIndices.add(Math.floor(rng() * total));
  }

  covered.forEach((point, index) => {
    const noise = (rng() * 2 - 1) * t.jitter;
    const isWeak = weakIndices.has(index);
    let eventType: TeachingLearningEvent['eventType'];
    let score: number;
    let durationMinutes: number;
    if ((index + 1) % 11 === 0) {
      eventType = 'quiz';
      score = t.quizBase + noise;
      durationMinutes = 15 + Math.floor(rng() * 15);
    } else if ((index + 1) % 5 === 0) {
      eventType = 'practice';
      score = t.practiceBase + noise;
      durationMinutes = 18 + Math.floor(rng() * 15);
    } else {
      eventType = 'study';
      score = t.studyBase + noise;
      durationMinutes = 20 + Math.floor(rng() * 18);
    }
    if (isWeak) {
      score = Math.min(score, 38 + rng() * 16);
    }
    const progress = total > 1 ? index / (total - 1) : 1;
    const dayOffset = Math.round((1 - progress) * t.spreadDays) + (t.activeToday ? 0 : 1);
    events.push({
      id: `seed-${t.studentId}-${String(index).padStart(3, '0')}`,
      studentId: t.studentId,
      eventType,
      knowledgeNodeId: point.id,
      score: clampScore(score),
      durationMinutes,
      occurredAt: timestampAt(dayOffset, 9 + Math.floor(rng() * 11), rng),
      payload: {},
    });
  });

  // Q&A concentrated on weak / early points over the last two weeks. Early
  // chapters are covered by every student, so those questions recur and show
  // up as "hot questions" on the teacher dashboard.
  const qaPool = [
    ...covered.filter((_point, index) => weakIndices.has(index)),
    ...covered.slice(0, Math.max(6, Math.floor(total / 4))),
  ];
  for (let k = 0; k < t.qaCount; k++) {
    const point = qaPool[Math.floor(rng() * qaPool.length)];
    const questions = chapterQuestions[point.chapterId] ?? ['这个知识点如何理解？'];
    events.push({
      id: `seed-${t.studentId}-qa-${String(k).padStart(2, '0')}`,
      studentId: t.studentId,
      eventType: 'qa',
      knowledgeNodeId: point.id,
      score: null,
      durationMinutes: 6 + Math.floor(rng() * 10),
      occurredAt: timestampAt(Math.floor(rng() * 14), 14 + Math.floor(rng() * 7), rng),
      payload: { question: questions[k % questions.length] },
    });
  }

  // Review sessions on already-studied points over the last week.
  const reviewRange = Math.max(1, Math.floor(total * 0.7));
  for (let k = 0; k < t.reviewCount; k++) {
    const point = covered[Math.floor(rng() * reviewRange)];
    events.push({
      id: `seed-${t.studentId}-rv-${String(k).padStart(2, '0')}`,
      studentId: t.studentId,
      eventType: 'review',
      knowledgeNodeId: point.id,
      score: clampScore(t.studyBase + (rng() * 2 - 1) * t.jitter + 4),
      durationMinutes: 12 + Math.floor(rng() * 12),
      occurredAt: timestampAt(Math.floor(rng() * 7), 19 + Math.floor(rng() * 3), rng),
      payload: {},
    });
  }

  return events;
}

export const defaultLearningEvents: TeachingLearningEvent[] =
  trajectories.flatMap(buildTrajectoryEvents);
