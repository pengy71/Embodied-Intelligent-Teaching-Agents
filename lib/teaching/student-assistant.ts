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
