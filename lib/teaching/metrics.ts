import { addDays, differenceInCalendarDays, formatISODate } from './time';
import { getKnowledgeGraph, getLearningEvents, getStudentProfile, getStudents } from './db';
import type {
  PortraitDimension,
  StudentPortraitScore,
  TeacherAnalyticsStudent,
  TeachingKnowledgeNode,
  TeachingLearningEvent,
  TeachingStudentProfile,
} from './types';

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function eventScores(events: TeachingLearningEvent[]): number[] {
  return events
    .map((event) => event.score)
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));
}

function countEventsByType(events: TeachingLearningEvent[]) {
  return {
    studyCount: events.filter((event) => event.eventType === 'study').length,
    practiceCount: events.filter((event) => event.eventType === 'practice').length,
    qaCount: events.filter((event) => event.eventType === 'qa').length,
    quizCount: events.filter((event) => event.eventType === 'quiz').length,
    reviewCount: events.filter((event) => event.eventType === 'review').length,
  };
}

export function masteryForNode(
  node: TeachingKnowledgeNode,
  events: TeachingLearningEvent[],
): number {
  const scores = eventScores(events.filter((event) => event.knowledgeNodeId === node.id));
  if (scores.length === 0) return clampPercent(node.masteryBaseline);
  return clampPercent(average(scores));
}

function distinctStudyDays(events: TeachingLearningEvent[]): string[] {
  return Array.from(
    new Set(events.map((event) => new Date(event.occurredAt).toISOString().slice(0, 10))),
  ).sort();
}

function currentStreak(events: TeachingLearningEvent[]): number {
  const days = distinctStudyDays(events);
  if (days.length === 0) return 0;
  const daySet = new Set(days);
  let cursor = days[days.length - 1];
  let streak = 0;
  while (cursor && daySet.has(cursor)) {
    streak += 1;
    cursor = formatISODate(addDays(new Date(`${cursor}T00:00:00.000Z`), -1));
  }
  return streak;
}

function phaseStatus(progress: number): 'completed' | 'in_progress' | 'not_started' {
  if (progress >= 95) return 'completed';
  if (progress > 0) return 'in_progress';
  return 'not_started';
}

function nodeStatus(mastery: number): 'completed' | 'learning' | 'not_started' {
  if (mastery >= 70) return 'completed';
  if (mastery > 0) return 'learning';
  return 'not_started';
}

function buildChapterGroups(nodes: TeachingKnowledgeNode[]) {
  const groups = new Map<
    string,
    { id: string; title: string; nodes: TeachingKnowledgeNode[]; orderIndex: number }
  >();
  for (const node of nodes) {
    const group = groups.get(node.chapterId) ?? {
      id: node.chapterId,
      title: node.chapterTitle,
      nodes: [],
      orderIndex: node.orderIndex,
    };
    group.nodes.push(node);
    group.orderIndex = Math.min(group.orderIndex, node.orderIndex);
    groups.set(node.chapterId, group);
  }
  return Array.from(groups.values()).sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function buildStudentSnapshot(courseId: string, studentId: string) {
  const [{ nodes, edges }, student, events] = await Promise.all([
    getKnowledgeGraph(courseId),
    getStudentProfile(courseId, studentId),
    getLearningEvents(courseId, studentId),
  ]);

  const mastery = Object.fromEntries(
    nodes.map((node) => [node.id, masteryForNode(node, events)] as const),
  );
  const weakPoints = nodes
    .map((node) => ({ node, mastery: mastery[node.id] ?? 0 }))
    .sort((a, b) => a.mastery - b.mastery || a.node.orderIndex - b.node.orderIndex)
    .slice(0, 5);
  const strongPoints = nodes
    .map((node) => ({ node, mastery: mastery[node.id] ?? 0 }))
    .sort((a, b) => b.mastery - a.mastery || a.node.orderIndex - b.node.orderIndex)
    .slice(0, 4);
  const masteredPoints = Object.values(mastery).filter((value) => value >= 70).length;
  const totalHours = events.reduce((sum, event) => sum + event.durationMinutes, 0) / 60;
  const chapterGroups = buildChapterGroups(nodes);
  const phases = chapterGroups.map((chapter) => {
    const values = chapter.nodes.map((node) => mastery[node.id] ?? 0);
    const progress = clampPercent(average(values));
    return {
      id: chapter.id,
      title: chapter.title,
      status: phaseStatus(progress),
      progress,
      estimatedDays: Math.max(7, Math.round(chapter.nodes.length * 2.5)),
      nodes: chapter.nodes.map((node) => {
        const nodeMastery = mastery[node.id] ?? 0;
        return {
          id: node.id,
          name: node.title,
          mastery: nodeMastery,
          status: nodeStatus(nodeMastery),
        };
      }),
    };
  });
  const currentPhase =
    phases.find((phase) => phase.status === 'in_progress')?.title ??
    phases.find((phase) => phase.status === 'not_started')?.title ??
    phases[phases.length - 1]?.title ??
    '课程复习';
  const overallProgress = clampPercent(average(Object.values(mastery)));
  const estimatedDaysLeft = Math.max(
    3,
    Math.round((100 - overallProgress) / Math.max(1, student.preferences.pace === '快' ? 3 : 2)),
  );
  const estimatedCompletion = formatISODate(addDays(new Date(), estimatedDaysLeft));

  return {
    courseId,
    student,
    nodes,
    edges,
    events,
    mastery,
    weakPoints,
    strongPoints,
    stats: {
      studyDays: distinctStudyDays(events).length,
      totalHours: Number(totalHours.toFixed(1)),
      currentStreak: currentStreak(events),
      masteredPoints,
      totalPoints: nodes.length,
      overallProgress,
    },
    path: {
      overallProgress,
      estimatedDaysLeft,
      estimatedCompletion,
      currentPhase,
      phases,
      milestones: phases.map((phase) => ({
        title: `完成${phase.title}`,
        date:
          phase.status === 'completed'
            ? '已完成'
            : `预计 ${formatISODate(addDays(new Date(), Math.ceil(phase.estimatedDays / 2)))}`,
        achieved: phase.status === 'completed',
      })),
    },
  };
}

function classifyStudent(student: TeachingStudentProfile, mastery: number, progress: number) {
  if (mastery < 45 || progress < 35) {
    return {
      status: '预警' as const,
      reason: progress < 35 ? '学习完成度偏低' : '知识点掌握率偏低',
    };
  }
  if (mastery >= 85 && progress >= 80) return { status: '优秀' as const };
  if (mastery >= 70 && progress >= 60) return { status: '良好' as const };
  return { status: '及格' as const };
}

function weekLabel(date: Date, base: Date): string {
  const diff = Math.max(0, differenceInCalendarDays(base, date));
  const bucket = Math.min(3, Math.floor(diff / 7));
  return `第${4 - bucket}周`;
}

export async function buildTeacherSnapshot(courseId: string) {
  const [{ nodes }, students, events] = await Promise.all([
    getKnowledgeGraph(courseId),
    getStudents(courseId),
    getLearningEvents(courseId),
  ]);
  const eventsByStudent = new Map<string, TeachingLearningEvent[]>();
  for (const event of events) {
    eventsByStudent.set(event.studentId, [...(eventsByStudent.get(event.studentId) ?? []), event]);
  }
  const activity = countEventsByType(events);

  const studentRows: TeacherAnalyticsStudent[] = students.map((student) => {
    const studentEvents = eventsByStudent.get(student.id) ?? [];
    const nodeMasteries = nodes.map((node) => masteryForNode(node, studentEvents));
    const mastery = clampPercent(average(nodeMasteries));
    const progress = clampPercent(
      (new Set(studentEvents.map((event) => event.knowledgeNodeId)).size /
        Math.max(1, nodes.length)) *
        100,
    );
    const qaCount = studentEvents.filter((event) => event.eventType === 'qa').length;
    const practiceCount = studentEvents.filter((event) => event.eventType === 'practice').length;
    const studyCount = studentEvents.filter((event) => event.eventType === 'study').length;
    const quizCount = studentEvents.filter((event) => event.eventType === 'quiz').length;
    const reviewCount = studentEvents.filter((event) => event.eventType === 'review').length;
    const quizScores = eventScores(studentEvents.filter((event) => event.eventType === 'quiz'));
    const testScore = clampPercent(quizScores.length ? average(quizScores) : mastery);
    const status = classifyStudent(student, mastery, progress);
    return {
      id: student.id,
      name: student.name,
      progress,
      completionRate: progress,
      mastery,
      qaCount,
      practiceCount,
      studyCount,
      quizCount,
      reviewCount,
      testScore,
      ...status,
    };
  });

  const chapterGroups = buildChapterGroups(nodes);
  const chapters = chapterGroups.map((chapter) => {
    const points = chapter.nodes.map((node) => {
      const nodeEvents = events.filter((event) => event.knowledgeNodeId === node.id);
      return {
        id: node.id,
        title: node.title,
        mastery: masteryForNode(node, nodeEvents),
      };
    });
    return {
      id: chapter.id,
      title: chapter.title,
      mastery: clampPercent(average(points.map((point) => point.mastery))),
      points,
    };
  });

  const hotQuestionsMap = new Map<string, { count: number; nodeId: string }>();
  for (const event of events.filter((item) => item.eventType === 'qa')) {
    const question =
      typeof event.payload.question === 'string' ? event.payload.question : '课程概念提问';
    const current = hotQuestionsMap.get(question) ?? { count: 0, nodeId: event.knowledgeNodeId };
    current.count += 1;
    hotQuestionsMap.set(question, current);
  }
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const hotQuestions = Array.from(hotQuestionsMap.entries())
    .map(([topic, value]) => ({
      topic,
      count: value.count,
      knowledgePoint: nodeById.get(value.nodeId)?.title ?? value.nodeId,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const now = new Date();
  const trend = new Map(['第1周', '第2周', '第3周', '第4周'].map((label) => [label, 0]));
  for (const event of events.filter((item) => item.eventType === 'qa')) {
    const label = weekLabel(new Date(event.occurredAt), now);
    trend.set(label, (trend.get(label) ?? 0) + 1);
  }

  const warningStudents = studentRows.filter((student) => student.status === '预警');
  const summary = {
    totalStudents: students.length,
    activeToday: events.filter(
      (event) => differenceInCalendarDays(now, new Date(event.occurredAt)) <= 1,
    ).length,
    averageProgress: clampPercent(average(studentRows.map((student) => student.progress))),
    averageMastery: clampPercent(average(studentRows.map((student) => student.mastery))),
    warningCount: warningStudents.length,
  };

  const completionDistribution = [
    {
      label: '80-100%',
      value: studentRows.filter((student) => student.completionRate >= 80).length,
    },
    {
      label: '60-79%',
      value: studentRows.filter(
        (student) => student.completionRate >= 60 && student.completionRate < 80,
      ).length,
    },
    {
      label: '40-59%',
      value: studentRows.filter(
        (student) => student.completionRate >= 40 && student.completionRate < 60,
      ).length,
    },
    { label: '<40%', value: studentRows.filter((student) => student.completionRate < 40).length },
  ];

  return {
    courseId,
    nodes,
    students,
    events,
    summary,
    activity: {
      totalEvents: events.length,
      ...activity,
    },
    completionDistribution,
    chapters,
    studentRows,
    hotQuestions,
    questionTrend: Array.from(trend.entries()).map(([label, count]) => ({ label, count })),
    testDistribution: [
      {
        label: '优秀(90+)',
        value: studentRows.filter((student) => student.testScore >= 90).length,
      },
      {
        label: '良好(80-89)',
        value: studentRows.filter((student) => student.testScore >= 80 && student.testScore < 90)
          .length,
      },
      {
        label: '及格(60-79)',
        value: studentRows.filter((student) => student.testScore >= 60 && student.testScore < 80)
          .length,
      },
      {
        label: '不及格(<60)',
        value: studentRows.filter((student) => student.testScore < 60).length,
      },
    ],
    errorDistribution: nodes
      .map((node) => {
        const nodeEvents = events.filter((event) => event.knowledgeNodeId === node.id);
        return {
          name: node.title,
          value: 100 - masteryForNode(node, nodeEvents),
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6),
    warningStudents,
  };
}

export async function buildStudentPortraitScore(
  courseId: string,
  studentId: string,
): Promise<StudentPortraitScore> {
  const snapshot = await buildStudentSnapshot(courseId, studentId);
  const { events, mastery, stats } = snapshot;

  const quizEvents = events.filter((event) => event.eventType === 'quiz');
  const quizScores = eventScores(quizEvents);
  const quizAvg = quizScores.length ? average(quizScores) : 0;
  const quizEngagement = Math.min(quizEvents.length / 5, 1);
  const quizDim = clampPercent(quizAvg * (0.6 + 0.4 * quizEngagement));

  const qaCount = events.filter((event) => event.eventType === 'qa').length;
  const qaDim = clampPercent(Math.min(qaCount * 10, 100));

  const practiceEvents = events.filter((event) => event.eventType === 'practice');
  const practiceScores = eventScores(practiceEvents);
  const practiceAvg = practiceScores.length ? average(practiceScores) : 0;
  const practiceDim = clampPercent(practiceAvg);

  const totalMinutes = events.reduce((sum, event) => sum + event.durationMinutes, 0);
  const durationDim = clampPercent(
    Math.min(totalMinutes / 600, 1) * 80 + Math.min(stats.currentStreak / 7, 1) * 20,
  );

  const weakCount = Object.values(mastery).filter((value) => value < 60).length;
  const wrongEvents = events.filter(
    (event) => typeof event.score === 'number' && event.score < 60,
  ).length;
  const wrongDim = clampPercent(100 - weakCount * 8 - wrongEvents * 3);

  const dimensions: PortraitDimension[] = [
    {
      key: 'quiz',
      label: '自测掌握',
      score: quizDim,
      weight: 0.25,
      detail: `${quizEvents.length} 次自测，平均 ${Math.round(quizAvg)} 分`,
    },
    {
      key: 'qa',
      label: '问答活跃',
      score: qaDim,
      weight: 0.15,
      detail: `累计 ${qaCount} 次提问`,
    },
    {
      key: 'practice',
      label: '习题正确率',
      score: practiceDim,
      weight: 0.25,
      detail: `${practiceEvents.length} 次练习${practiceScores.length ? `，平均 ${Math.round(practiceAvg)} 分` : ''}`,
    },
    {
      key: 'duration',
      label: '学习投入',
      score: durationDim,
      weight: 0.15,
      detail: `累计 ${stats.totalHours} 小时，连续 ${stats.currentStreak} 天`,
    },
    {
      key: 'wrong',
      label: '错题控制',
      score: wrongDim,
      weight: 0.2,
      detail: `${weakCount} 个薄弱知识点，${wrongEvents} 次低分记录`,
    },
  ];

  const portraitScore = clampPercent(
    dimensions.reduce((sum, dim) => sum + dim.score * dim.weight, 0),
  );
  const level =
    portraitScore >= 85
      ? '优秀'
      : portraitScore >= 70
        ? '良好'
        : portraitScore >= 50
          ? '及格'
          : '预警';

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    studentId,
    dimensions,
    portraitScore,
    level,
  };
}
