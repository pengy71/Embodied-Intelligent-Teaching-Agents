export type TeachingAgentType = 'student-guidance' | 'teacher-analytics';

export interface TeachingKnowledgeNode {
  id: string;
  title: string;
  chapterId: string;
  chapterTitle: string;
  sectionId: string;
  sectionTitle: string;
  level: 'chapter' | 'section' | 'knowledge' | 'common-mistake';
  dependencies: string[];
  masteryBaseline: number;
  orderIndex: number;
}

export interface TeachingKnowledgeEdge {
  source: string;
  target: string;
  relation: 'contains' | 'prerequisite' | 'related' | 'mistake-of';
}

export interface TeachingStudentProfile {
  id: string;
  name: string;
  goal: string;
  level: string;
  preferences: {
    pace: string;
    style: string;
    resourcePriority: string;
  };
}

export interface TeachingLearningEvent {
  id: string;
  studentId: string;
  eventType: 'study' | 'practice' | 'qa' | 'quiz' | 'review';
  knowledgeNodeId: string;
  score: number | null;
  durationMinutes: number;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface StudentGuidanceTask {
  id: string;
  title: string;
  type: '复习' | '新知' | '练习' | '测验';
  chapter: string;
  estimated: string;
  reason: string;
  targetNodeId: string;
  done: boolean;
}

export interface StudentGuidancePhase {
  id: string;
  title: string;
  status: 'completed' | 'in_progress' | 'not_started';
  progress: number;
  estimatedDays: number;
  actualDays?: number;
  completedDate?: string;
  nodes: Array<{
    id: string;
    name: string;
    mastery: number;
    status: 'completed' | 'learning' | 'not_started';
  }>;
}

export interface StudentGuidanceResult {
  generatedAt: string;
  modelString: string;
  stats: {
    studyDays: number;
    totalHours: number;
    currentStreak: number;
    masteredPoints: number;
    totalPoints: number;
    overallProgress: number;
  };
  guidanceMessage: string;
  weakPoints: Array<{ id: string; title: string; mastery: number; reason: string }>;
  todayPlan: StudentGuidanceTask[];
  path: {
    overallProgress: number;
    estimatedDaysLeft: number;
    estimatedCompletion: string;
    currentPhase: string;
    phases: StudentGuidancePhase[];
    milestones: Array<{ title: string; date: string; achieved: boolean }>;
  };
  report: {
    status: string;
    strengths: string;
    improvements: string;
    nextWeekGoal: string;
    investmentLabel: string;
    masteryLabel: string;
    overallComment: string;
  };
  adaptationEvents: Array<{ label: string; action: string; time: string }>;
}

export interface TeacherAnalyticsStudent {
  id: string;
  name: string;
  progress: number;
  mastery: number;
  qaCount: number;
  testScore: number;
  status: '优秀' | '良好' | '及格' | '预警';
  reason?: string;
}

export interface TeacherAnalyticsResult {
  generatedAt: string;
  modelString: string;
  summary: {
    totalStudents: number;
    activeToday: number;
    averageProgress: number;
    averageMastery: number;
    warningCount: number;
  };
  radar: Array<{ name: string; mastery: number }>;
  chapters: Array<{
    id: string;
    title: string;
    mastery: number;
    points: Array<{ id: string; title: string; mastery: number }>;
  }>;
  students: TeacherAnalyticsStudent[];
  hotQuestions: Array<{ topic: string; count: number; knowledgePoint: string }>;
  questionTrend: Array<{ label: string; count: number }>;
  testDistribution: Array<{ label: string; value: number }>;
  errorDistribution: Array<{ name: string; value: number }>;
  warningStudents: TeacherAnalyticsStudent[];
  suggestions: Array<{ tag: string; title: string; body: string }>;
  exportCards: Array<{ title: string; desc: string }>;
}
