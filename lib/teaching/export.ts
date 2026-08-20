import type { TeacherAnalyticsResult } from "./types";

function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Array<Array<unknown>>): string {
  return rows.map((row) => row.map(escapeCsv).join(",")).join("\r\n");
}

function downloadCsv(filename: string, rows: Array<Array<unknown>>): void {
  // 带 BOM 以便 Excel 正确识别 UTF-8 中文
  const content = "\uFEFF" + toCsv(rows);
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 完整成绩单：每个学生的进度、掌握率、测试成绩与学情状态 */
export function exportGradeSheet(analytics: TeacherAnalyticsResult): void {
  const rows: Array<Array<unknown>> = [
    [
      "学号",
      "姓名",
      "学习进度(%)",
      "完成率(%)",
      "掌握率(%)",
      "学习次数",
      "练习次数",
      "问答数",
      "测验次数",
      "复习次数",
      "测试成绩",
      "学情状态",
      "备注",
    ],
    ...analytics.students.map((student) => [
      student.id,
      student.name,
      student.progress,
      student.completionRate,
      student.mastery,
      student.studyCount,
      student.practiceCount,
      student.qaCount,
      student.quizCount,
      student.reviewCount,
      student.testScore,
      student.status,
      student.reason ?? "",
    ]),
  ];
  downloadCsv(`完整成绩单_${dateStamp()}.csv`, rows);
}

/** 阶段测试报告：成绩分布、章节掌握率与薄弱知识点 */
export function exportTestReport(analytics: TeacherAnalyticsResult): void {
  const rows: Array<Array<unknown>> = [
    ["阶段测试报告"],
    ["生成时间", new Date(analytics.generatedAt).toLocaleString("zh-CN")],
    [],
    ["成绩分布"],
    ["区间", "人数"],
    ...analytics.testDistribution.map((item) => [item.label, item.value]),
    [],
    ["章节掌握率"],
    ["章节", "掌握率(%)"],
    ...analytics.chapters.map((chapter) => [chapter.title, chapter.mastery]),
    [],
    ["薄弱知识点（错误率）"],
    ["知识点", "错误率(%)"],
    ...analytics.errorDistribution.map((item) => [item.name, item.value]),
  ];
  downloadCsv(`阶段测试报告_${dateStamp()}.csv`, rows);
}

/** 学习行为统计：活动汇总、提问趋势与高频提问 */
export function exportBehaviorStats(analytics: TeacherAnalyticsResult): void {
  const rows: Array<Array<unknown>> = [
    ["学习行为统计"],
    ["生成时间", new Date(analytics.generatedAt).toLocaleString("zh-CN")],
    [],
    ["班级活动汇总"],
    ["指标", "数值"],
    ["总事件数", analytics.activity.totalEvents],
    ["学习次数", analytics.activity.studyCount],
    ["练习次数", analytics.activity.practiceCount],
    ["问答数", analytics.activity.qaCount],
    ["测验次数", analytics.activity.quizCount],
    ["复习次数", analytics.activity.reviewCount],
    [],
    ["提问趋势"],
    ["周次", "提问数"],
    ...analytics.questionTrend.map((item) => [item.label, item.count]),
    [],
    ["高频提问"],
    ["主题", "次数", "关联知识点"],
    ...analytics.hotQuestions.map((item) => [
      item.topic,
      item.count,
      item.knowledgePoint,
    ]),
  ];
  downloadCsv(`学习行为统计_${dateStamp()}.csv`, rows);
}
