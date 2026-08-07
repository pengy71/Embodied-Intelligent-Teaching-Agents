"use client";

export type LearningEventType = "study" | "practice" | "qa" | "quiz" | "review";

export interface TrackLearningEventInput {
  studentId?: string;
  eventType: LearningEventType;
  knowledgeNodeId: string;
  score?: number | null;
  durationMinutes?: number;
  payload?: Record<string, unknown>;
}

const DEFAULT_STUDENT_ID = "2024001";

/** Best-effort learning-event tracking. Never throws / never blocks the UI. */
export async function trackLearningEvent(input: TrackLearningEventInput): Promise<void> {
  if (!input.knowledgeNodeId) return;
  try {
    await fetch("/api/teaching/learning-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: input.studentId ?? DEFAULT_STUDENT_ID,
        eventType: input.eventType,
        knowledgeNodeId: input.knowledgeNodeId,
        score: input.score ?? null,
        durationMinutes: input.durationMinutes ?? 0,
        payload: input.payload ?? {},
      }),
      cache: "no-store",
    });
  } catch {
    // Swallow: tracking must never break the learning experience.
  }
}