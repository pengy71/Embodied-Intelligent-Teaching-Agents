"use client";

export type LearningEventType = "study" | "practice" | "qa" | "quiz" | "review";

export interface TrackLearningEventInput {
  /** Deprecated - the server now derives the student from the session. */
  studentId?: string;
  eventType: LearningEventType;
  knowledgeNodeId: string;
  score?: number | null;
  durationMinutes?: number;
  payload?: Record<string, unknown>;
}

/** Best-effort learning-event tracking. Never throws / never blocks the UI.
 *  The student id is resolved on the server from the authenticated session. */
export async function trackLearningEvent(input: TrackLearningEventInput): Promise<void> {
  if (!input.knowledgeNodeId) return;
  try {
    await fetch("/api/teaching/learning-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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