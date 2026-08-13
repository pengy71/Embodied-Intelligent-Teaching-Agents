export type TeachingAgentType = 'student-guidance' | 'teacher-analytics' | 'qa' | 'teacher-summary';

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
  schemaVersion: number;
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
  portrait: StudentPortraitScore;
}

export interface PortraitDimension {
  key: 'quiz' | 'qa' | 'practice' | 'duration' | 'wrong';
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface StudentPortraitScore {
  schemaVersion: number;
  generatedAt: string;
  studentId: string;
  dimensions: PortraitDimension[];
  portraitScore: number;
  level: '优秀' | '良好' | '及格' | '预警';
}

export interface TeacherAnalyticsStudent {
  id: string;
  name: string;
  progress: number;
  completionRate: number;
  mastery: number;
  qaCount: number;
  practiceCount: number;
  studyCount: number;
  quizCount: number;
  reviewCount: number;
  testScore: number;
  status: '优秀' | '良好' | '及格' | '预警';
  reason?: string;
}

export interface TeacherAnalyticsResult {
  schemaVersion: number;
  generatedAt: string;
  modelString: string;
  summary: {
    totalStudents: number;
    activeToday: number;
    averageProgress: number;
    averageMastery: number;
    warningCount: number;
  };
  activity: {
    totalEvents: number;
    studyCount: number;
    practiceCount: number;
    qaCount: number;
    quizCount: number;
    reviewCount: number;
  };
  radar: Array<{ name: string; mastery: number }>;
  completionDistribution: Array<{ label: string; value: number }>;
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

// === RAG 答疑相关类型 ===

export interface TextChunk {
  text: string;
  page?: number;
  chunkIndex: number;
}

export interface ChunkInsert {
  id: string;
  courseId: string;
  resourceId?: string | null;
  pointId?: string | null;
  chapterId?: string | null;
  chunkText: string;
  chunkIndex: number;
  pageRef?: string | null;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  chunkText: string;
  pageRef: string | null;
  pointId: string | null;
  chapterId: string | null;
  similarity: number;
}

export interface RagContextChunk {
  chunkText: string;
  pageRef: string | null;
  pointId: string | null;
  chapterId: string | null;
  similarity: number;
}

export interface RagContext {
  chunks: RagContextChunk[];
  relatedPoints: Array<{ id: string; title: string; summary?: string; chapter?: string }>;
  knowledgePoints: Array<{
    id: string;
    title: string;
    summary?: string;
    chapter: string;
    prerequisites: string[];
    related: string[];
  }>;
  degraded: boolean;
}

export interface QASource {
  pointId: string | null;
  title: string;
  chapter: string;
  section?: string;
  chapterNumber?: number;
  sectionNumber?: number;
  pageReference?: string;
  textExcerpt?: string;
}

export interface QAResult {
  answer: string;
  sources: QASource[];
  relatedPoints: Array<{ id: string; title: string; summary?: string; chapter?: string }>;
}


// === 习题评测智能体相关类型 ===

export type PracticeQuestionType = 'choice' | 'fill' | 'short' | 'case' | 'algorithm';
export type PracticeDifficulty = 'easy' | 'medium' | 'hard';
export type PracticeMode = 'adaptive' | 'chapter' | 'special' | 'test';

export interface GeneratedQuestion {
  id: string;
  type: PracticeQuestionType;
  difficulty: PracticeDifficulty;
  question: string;
  /** choice: 选项列表；其余题型为空 */
  options?: string[];
  /** choice: 正确选项索引；fill: 标准答案字符串（主观题为空） */
  answer?: number | string;
  /** fill: 可接受的等价答案列表（归一化比对） */
  acceptableAnswers?: string[];
  /** short/case/algorithm: 参考答案 */
  referenceAnswer?: string;
  /** short/case/algorithm: 评分要点 */
  gradingCriteria?: string;
  explanation: string;
  pointId: string;
  pointTitle: string;
  chapter: string;
  source: string;
}

export type AttributionCause =
  | 'concept-confusion'
  | 'formula-misuse'
  | 'logic-gap'
  | 'careless'
  | 'other';

export interface ErrorAttribution {
  cause: AttributionCause;
  explanation: string;
  /** 建议复盘的知识点 id（含本题 pointId 及其前置/关联点） */
  reviewPointIds: string[];
}

export interface GradedQuestion {
  question: GeneratedQuestion;
  /** 学生作答：choice 为选项索引，其余为文本；未作为 null */
  studentAnswer: number | string | null;
  /** 0-100 */
  score: number;
  passed: boolean;
  /** 主观题评语；客观题为空 */
  feedback?: string;
  attribution?: ErrorAttribution;
}

export interface PracticeReport {
  roundId: string;
  generatedAt: string;
  modelString: string;
  questionCount: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  score: number;
  accuracy: number;
  byType: Array<{ type: PracticeQuestionType; total: number; correct: number; accuracy: number }>;
  byDifficulty: Array<{ difficulty: PracticeDifficulty; total: number; correct: number; accuracy: number }>;
  weakPoints: Array<{ pointId: string; title: string; chapter: string; wrongCount: number }>;
  recommendations: string[];
}

export interface PracticeRound {
  roundId: string;
  gradedQuestions: GradedQuestion[];
  report: PracticeReport;
}


// === 阶段测试与薄弱知识点 ===

export type StageTestStatus = 'published' | 'closed';
export type StageTestDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';

export interface StageTestConfig {
  chapterIds: string[];
  count: number;
  difficulty: StageTestDifficulty;
}

export interface StageTest {
  id: string;
  courseId: string;
  title: string;
  description: string;
  config: StageTestConfig;
  status: StageTestStatus;
  createdBy: string;
  createdAt: string;
  dueAt: string | null;
}

export interface StageTestSubmission {
  id: string;
  testId: string;
  studentId: string;
  score: number;
  detail: Record<string, unknown>;
  submittedAt: string;
}

/** 阶段测试在学生端的视图，含本人提交状态。 */
export interface StudentStageTest {
  test: StageTest;
  submitted: boolean;
  score: number | null;
  submittedAt: string | null;
}

/** 学生薄弱知识点（用于专项练习选题）。 */
export interface PracticeWeakPoint {
  id: string;
  title: string;
  chapter: string;
  mastery: number;
  wrongCount: number;
}
