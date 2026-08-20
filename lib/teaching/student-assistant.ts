export const STUDENT_ASSISTANT_STORAGE_KEY = 'openmaic.student-assistant.preferences.v1';

export interface StudentAssistantPreferences {
  templateId: string;
  pace: number;
  depth: number;
  interactionStyle: 'direct' | 'guided' | 'socratic';
  resourcePriority: 'balanced' | 'visual' | 'paper' | 'practice';
  formats: Record<'analogy' | 'diagram' | 'code' | 'citation', boolean>;
  autoAdapt: boolean;
}

export const defaultStudentAssistantPreferences: StudentAssistantPreferences = {
  templateId: 'inspiring',
  pace: 50,
  depth: 50,
  interactionStyle: 'guided',
  resourcePriority: 'balanced',
  formats: {
    analogy: true,
    diagram: true,
    code: false,
    citation: false,
  },
  autoAdapt: true,
};

const templateIds = new Set(['academic', 'inspiring', 'accessible', 'practical']);
const interactionStyles = new Set(['direct', 'guided', 'socratic']);
const resourcePriorities = new Set(['balanced', 'visual', 'paper', 'practice']);

function clampPercentage(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function normalizeStudentAssistantPreferences(value: unknown): StudentAssistantPreferences {
  if (!value || typeof value !== 'object') {
    return defaultStudentAssistantPreferences;
  }

  const source = value as Partial<StudentAssistantPreferences>;
  const formats: Partial<StudentAssistantPreferences['formats']> =
    source.formats && typeof source.formats === 'object' ? source.formats : {};

  return {
    templateId: templateIds.has(source.templateId ?? '')
      ? source.templateId!
      : defaultStudentAssistantPreferences.templateId,
    pace: clampPercentage(source.pace, defaultStudentAssistantPreferences.pace),
    depth: clampPercentage(source.depth, defaultStudentAssistantPreferences.depth),
    interactionStyle: interactionStyles.has(source.interactionStyle ?? '')
      ? source.interactionStyle!
      : defaultStudentAssistantPreferences.interactionStyle,
    resourcePriority: resourcePriorities.has(source.resourcePriority ?? '')
      ? source.resourcePriority!
      : defaultStudentAssistantPreferences.resourcePriority,
    formats: {
      analogy:
        typeof formats.analogy === 'boolean'
          ? formats.analogy
          : defaultStudentAssistantPreferences.formats.analogy,
      diagram:
        typeof formats.diagram === 'boolean'
          ? formats.diagram
          : defaultStudentAssistantPreferences.formats.diagram,
      code:
        typeof formats.code === 'boolean'
          ? formats.code
          : defaultStudentAssistantPreferences.formats.code,
      citation:
        typeof formats.citation === 'boolean'
          ? formats.citation
          : defaultStudentAssistantPreferences.formats.citation,
    },
    autoAdapt:
      typeof source.autoAdapt === 'boolean'
        ? source.autoAdapt
        : defaultStudentAssistantPreferences.autoAdapt,
  };
}

export function getPaceLabel(value: number) {
  if (value < 33) return '循序渐进';
  if (value < 66) return '标准';
  return '快速';
}

export function getDepthLabel(value: number) {
  if (value < 33) return '基础';
  if (value < 66) return '标准';
  return '深入';
}

const TEMPLATE_STYLES: Record<string, string> = {
  academic: '学术严谨型：注重理论推导、强调专业术语、精炼讲解',
  inspiring: '引导启发型：问题驱动教学、引导逐步推理、培养独立分析能力',
  accessible: '通俗易懂型：大量生活化案例、比喻类比、分步骤讲解',
  practical: '实践应用型：强调实验与案例、结合机器人应用、提供代码示例',
};

const INTERACTION_LABELS: Record<StudentAssistantPreferences['interactionStyle'], string> = {
  direct: '直接讲解',
  guided: '提问引导',
  socratic: '启发思考',
};

const RESOURCE_PRIORITY_LABELS: Record<StudentAssistantPreferences['resourcePriority'], string> = {
  balanced: '均衡呈现',
  visual: '图示优先',
  paper: '论文优先',
  practice: '实验优先',
};

/** 根据模板 id 返回可读的教学风格描述。 */
export function getTeachingStyleLabel(templateId: string): string {
  return TEMPLATE_STYLES[templateId] ?? TEMPLATE_STYLES.inspiring;
}

/** 生成注入到 AI prompt 的多行教学风格画像。 */
export function buildTeachingStyleProfile(preferences: StudentAssistantPreferences): string {
  const formatLabels: string[] = [];
  if (preferences.formats.analogy) formatLabels.push('案例类比');
  if (preferences.formats.diagram) formatLabels.push('图示说明');
  if (preferences.formats.code) formatLabels.push('代码示例');
  if (preferences.formats.citation) formatLabels.push('论文引用');
  const formatText = formatLabels.length > 0 ? formatLabels.join('、') : '无特定形式偏好';

  return [
    `教学模板：${getTeachingStyleLabel(preferences.templateId)}`,
    `教学节奏：${getPaceLabel(preferences.pace)}`,
    `内容深度：${getDepthLabel(preferences.depth)}`,
    `互动方式：${INTERACTION_LABELS[preferences.interactionStyle]}`,
    `资源呈现：${RESOURCE_PRIORITY_LABELS[preferences.resourcePriority]}`,
    `内容形式：${formatText}`,
    `自动适应：${preferences.autoAdapt ? '开启（可根据学习行为微调）' : '关闭（严格遵循上述偏好）'}`,
  ].join('\n');
}

/** 将学生偏好映射为答疑智能体使用的教学风格与深度。 */
export function preferencesToQAProfile(preferences: StudentAssistantPreferences): {
  teachingStyle: string;
  depth: string;
} {
  return {
    teachingStyle: getTeachingStyleLabel(preferences.templateId),
    depth: getDepthLabel(preferences.depth),
  };
}
