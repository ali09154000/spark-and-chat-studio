import { describe, expect, it } from "vitest";
import {
  calculateTranscriptOverallScore,
  isValidPracticeAttempt,
  parseTranscriptAssessment,
} from "@/lib/practice-assessment";

describe("practice assessment rules", () => {
  it("scores transcript categories from 0 to 100 and calculates a transparent weighted total", () => {
    expect(calculateTranscriptOverallScore({ grammar: 80, fluency: 60, vocabulary: 70, communication: 90 })).toBe(74);
    expect(() => parseTranscriptAssessment({
      categoryScores: { grammar: 101, fluency: 60, vocabulary: 70, communication: 90 },
      strengths: [], corrections: [], priorities: [], polishedVersion: "Practice text", summary: "Summary",
    })).toThrow("The assessment included an invalid score.");
  });

  it("allows the three saved practice attempts and rejects attempts outside that range", () => {
    expect([1, 2, 3].every(isValidPracticeAttempt)).toBe(true);
    expect(isValidPracticeAttempt(0)).toBe(false);
    expect(isValidPracticeAttempt(4)).toBe(false);
  });
});