import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { TranscriptAssessment } from "@/lib/practice-assessment";

const scoreLabels = [
  ["grammar", "Grammar"],
  ["fluency", "Sentence flow"],
  ["vocabulary", "Vocabulary"],
  ["communication", "Clarity & structure"],
] as const;

const priorityLabels = {
  critical: "Critical",
  high: "High",
  moderate: "Moderate",
  "easy-win": "Easy win",
} as const;

export function AssessmentReport({ assessment }: { assessment: TranscriptAssessment }) {
  return (
    <section aria-label="Transcript assessment" className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
        <Card className="rounded-lg border-border/80 shadow-none">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Transcript score</p>
            <p className="mt-2 font-display text-5xl font-bold">{assessment.overallScore}<span className="ml-1 text-xl text-muted-foreground">/100</span></p>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">Weighted from grammar (30%), sentence flow (30%), vocabulary (20%), and clarity (20%).</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border-border/80 shadow-none">
          <CardHeader className="pb-3"><CardTitle className="text-base">What the transcript shows</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-0">
            {scoreLabels.map(([key, label]) => {
              const score = assessment.categoryScores[key];
              return <div className="grid grid-cols-[130px_minmax(0,1fr)_36px] items-center gap-3" key={key}>
                <span className="text-sm">{label}</span>
                <Progress aria-label={`${label} score`} value={score} />
                <span className="text-right text-sm tabular-nums">{score}</span>
              </div>;
            })}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              <Badge variant="secondary">Pronunciation not assessed</Badge>
              <Badge variant="secondary">Video delivery not assessed</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm leading-6 text-muted-foreground">{assessment.summary}</p>

      {assessment.strengths.length > 0 && <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">What worked</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {assessment.strengths.map((strength, index) => <li className="border-l-2 border-primary pl-3 text-sm leading-6" key={`${strength}-${index}`}>{strength}</li>)}
        </ul>
      </section>}

      {assessment.corrections.length > 0 && <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Useful corrections</h2>
        <div className="divide-y divide-border border-y border-border">
          {assessment.corrections.map((correction, index) => <article className="grid gap-2 py-4 md:grid-cols-[1fr_1fr]" key={`${correction.said}-${index}`}>
            <div><p className="text-xs font-semibold uppercase text-muted-foreground">You said</p><p className="mt-1 text-sm">“{correction.said}”</p></div>
            <div><p className="text-xs font-semibold uppercase text-primary">A natural version</p><p className="mt-1 text-sm font-medium">“{correction.natural}”</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{correction.why}</p><p className="mt-2 text-sm">Try: {correction.example}</p></div>
          </article>)}
        </div>
      </section>}

      {assessment.priorities.length > 0 && <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Your next three improvements</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {assessment.priorities.map((priority, index) => <Card className="rounded-lg border-border/80 shadow-none" key={`${priority.focus}-${index}`}>
            <CardContent className="p-4">
              <Badge variant={priority.level === "critical" ? "destructive" : "secondary"}>{priorityLabels[priority.level]}</Badge>
              <h3 className="mt-3 font-semibold">{priority.focus}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{priority.why}</p>
              <p className="mt-3 text-sm leading-6">{priority.practice}</p>
              <p className="mt-3 text-xs font-medium text-primary">{priority.minutes} min · Look for: {priority.successSignal}</p>
            </CardContent>
          </Card>)}
        </div>
      </section>}

      {assessment.polishedVersion && <details className="border-t border-border pt-4">
        <summary className="cursor-pointer font-semibold">Read a polished version</summary>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{assessment.polishedVersion}</p>
      </details>}
    </section>
  );
}