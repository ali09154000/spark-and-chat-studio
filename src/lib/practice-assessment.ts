export type TranscriptCategoryScores = {
  grammar: number;
  fluency: number;
  vocabulary: number;
  communication: number;
};

export type TranscriptCorrection = {
  said: string;
  natural: string;
  why: string;
  example: string;
};

export type PracticePriority = {
  level: "critical" | "high" | "moderate" | "easy-win";
  focus: string;
  why: string;
  practice: string;
  minutes: number;
  successSignal: string;
};

export type TranscriptAssessment = {
  categoryScores: TranscriptCategoryScores;
  overallScore: number;
  strengths: string[];
  corrections: TranscriptCorrection[];
  priorities: PracticePriority[];
  polishedVersion: string;
  summary: string;
};

const categories = ["grammar", "fluency", "vocabulary", "communication"] as const;
const priorityLevels = ["critical", "high", "moderate", "easy-win"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, label: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new Error(`Invalid assessment ${label}.`);
  }
  return value.trim();
}

function listOfText(value: unknown, label: string, limit: number): string[] {
  if (!Array.isArray(value) || value.length > limit) throw new Error(`Invalid assessment ${label}.`);
  return value.map((item) => requiredText(item, label, 500));
}

export function isValidPracticeAttempt(attempt: number): attempt is 1 | 2 | 3 {
  return Number.isInteger(attempt) && attempt >= 1 && attempt <= 3;
}

export function calculateTranscriptOverallScore(scores: TranscriptCategoryScores): number {
  return Math.round(
    scores.grammar * 0.3 +
      scores.fluency * 0.3 +
      scores.vocabulary * 0.2 +
      scores.communication * 0.2,
  );
}

export function parseTranscriptAssessment(value: unknown): TranscriptAssessment {
  if (
    !isRecord(value) ||
    !isRecord(value["categoryScores"]) ||
    !Array.isArray(value["corrections"]) ||
    !Array.isArray(value["priorities"])
  ) {
    throw new Error("The assessment could not be read.");
  }

  const categoryScores = {} as TranscriptCategoryScores;
  for (const category of categories) {
    const score = value["categoryScores"][category];
    if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > 100) {
      throw new Error("The assessment included an invalid score.");
    }
    categoryScores[category] = score;
  }

  const corrections = value["corrections"].slice(0, 5).map((item) => {
    if (!isRecord(item)) throw new Error("The assessment corrections could not be read.");
    return {
      said: requiredText(item["said"], "original wording", 500),
      natural: requiredText(item["natural"], "suggested wording", 500),
      why: requiredText(item["why"], "correction explanation", 700),
      example: requiredText(item["example"], "practice example", 500),
    };
  });

  const priorities = value["priorities"].slice(0, 3).map((item) => {
    if (
      !isRecord(item) ||
      typeof item["level"] !== "string" ||
      !priorityLevels.includes(item["level"] as PracticePriority["level"])
    ) {
      throw new Error("The assessment priorities could not be read.");
    }
    if (
      typeof item["minutes"] !== "number" ||
      !Number.isInteger(item["minutes"]) ||
      item["minutes"] < 1 ||
      item["minutes"] > 60
    ) {
      throw new Error("The assessment practice time could not be read.");
    }
    return {
      level: item["level"] as PracticePriority["level"],
      focus: requiredText(item["focus"], "priority", 240),
      why: requiredText(item["why"], "priority explanation", 500),
      practice: requiredText(item["practice"], "practice exercise", 700),
      minutes: item["minutes"],
      successSignal: requiredText(item["successSignal"], "progress signal", 300),
    };
  });

  return {
    categoryScores,
    overallScore: calculateTranscriptOverallScore(categoryScores),
    strengths: listOfText(value["strengths"], "strengths", 4),
    corrections,
    priorities,
    polishedVersion: requiredText(value["polishedVersion"], "polished version", 12_000),
    summary: requiredText(value["summary"], "summary", 1_000),
  };
}