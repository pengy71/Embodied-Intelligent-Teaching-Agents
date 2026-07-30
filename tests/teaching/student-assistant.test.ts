import { describe, expect, it } from 'vitest';
import {
  defaultStudentAssistantPreferences,
  getDepthLabel,
  getPaceLabel,
  normalizeStudentAssistantPreferences,
} from '@/lib/teaching/student-assistant';

describe('student assistant preferences', () => {
  it('uses defaults for missing or invalid persisted data', () => {
    expect(normalizeStudentAssistantPreferences(null)).toEqual(defaultStudentAssistantPreferences);
    expect(
      normalizeStudentAssistantPreferences({
        templateId: 'unknown',
        pace: Number.NaN,
        interactionStyle: 'invalid',
      }),
    ).toMatchObject({
      templateId: 'inspiring',
      pace: 50,
      interactionStyle: 'guided',
    });
  });

  it('clamps numeric settings and preserves valid choices', () => {
    expect(
      normalizeStudentAssistantPreferences({
        templateId: 'practical',
        pace: 140,
        depth: -8,
        interactionStyle: 'socratic',
        resourcePriority: 'practice',
        formats: { analogy: false, diagram: true, code: true, citation: true },
        autoAdapt: false,
      }),
    ).toEqual({
      templateId: 'practical',
      pace: 100,
      depth: 0,
      interactionStyle: 'socratic',
      resourcePriority: 'practice',
      formats: { analogy: false, diagram: true, code: true, citation: true },
      autoAdapt: false,
    });
  });

  it('maps slider values to user-facing labels', () => {
    expect(getPaceLabel(20)).toBe('循序渐进');
    expect(getPaceLabel(50)).toBe('标准');
    expect(getPaceLabel(80)).toBe('快速');
    expect(getDepthLabel(20)).toBe('基础');
    expect(getDepthLabel(50)).toBe('标准');
    expect(getDepthLabel(80)).toBe('深入');
  });
});
