import { CheckCircle2, Circle, Loader2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/utils/cn"

const formatLabels = {
  multiple_choice: "Multiple choice",
  short_answer: "Short answer",
  true_false: "True / false",
}

function getQuestionTypeLabel(value) {
  return formatLabels[value] ?? value
}

function getAttemptStatusLabel(attempt) {
  if (!attempt) return "Draft"
  if (attempt.status === "graded") return `${Math.round(attempt.score_percent ?? 0)}%`
  if (attempt.status === "submitted") return "Submitted"
  return "Generated"
}

function QuestionBlock({ answerValue, isGraded, onAnswerChange, question, questionNumber }) {
  const savedAnswer = question.answer
  const isCorrect = savedAnswer?.is_correct

  return (
    <section className="rounded-lg border bg-background p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Question {questionNumber}</Badge>
        <Badge variant="outline">{getQuestionTypeLabel(question.question_type)}</Badge>
        {isGraded ? (
          <Badge variant={isCorrect ? "default" : "destructive"}>
            {isCorrect ? "Correct" : "Review"}
          </Badge>
        ) : null}
      </div>

      <h3 className="mt-3 text-sm font-medium leading-6">{question.prompt}</h3>

      <div className="mt-3">
        {question.question_type === "short_answer" ? (
          <Textarea
            value={answerValue}
            onChange={(event) => onAnswerChange(question.id, event.target.value)}
            placeholder="Write your answer"
            className="min-h-24"
            disabled={isGraded}
          />
        ) : (
          <div className="grid gap-2">
            {(question.question_type === "true_false"
              ? ["True", "False"]
              : question.choices ?? []
            ).map((choice) => {
              const isSelected = answerValue === choice

              return (
                <button
                  key={choice}
                  type="button"
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    isSelected ? "border-primary/40 bg-primary/10" : "hover:bg-muted/60",
                  )}
                  onClick={() => onAnswerChange(question.id, choice)}
                  disabled={isGraded}
                >
                  {isSelected ? (
                    <CheckCircle2 data-icon="inline-start" />
                  ) : (
                    <Circle data-icon="inline-start" />
                  )}
                  <span>{choice}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {isGraded ? (
        <div className="mt-3 rounded-lg border bg-muted/35 px-3 py-3 text-sm">
          <div className="font-medium">
            Score {savedAnswer?.score ?? 0}/{savedAnswer?.max_score ?? 1}
          </div>
          {savedAnswer?.feedback ? (
            <div className="mt-1 text-muted-foreground">{savedAnswer.feedback}</div>
          ) : null}
          {question.explanation ? (
            <div className="mt-2 text-muted-foreground">
              Explanation: {question.explanation}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export function QuizAttemptDialog({
  answers,
  attempt,
  isGrading,
  onAnswerChange,
  onOpenChange,
  onSubmitQuiz,
  open,
}) {
  const isGraded = attempt?.status === "graded"
  const answeredCount = (attempt?.questions ?? []).filter((question) =>
    (answers[question.id] ?? "").trim(),
  ).length
  const questionCount = attempt?.questions?.length ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden">
        <DialogHeader className="border-b px-5 pb-4 pt-5 pr-12">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="truncate">{attempt?.title ?? "Quiz"}</DialogTitle>
              <DialogDescription>
                {isGraded
                  ? "Review your assessment feedback."
                  : `${answeredCount}/${questionCount} answered`}
              </DialogDescription>
            </div>
            {attempt ? <Badge variant="secondary">{getAttemptStatusLabel(attempt)}</Badge> : null}
          </div>
        </DialogHeader>

        {attempt ? (
          <ScrollArea className="max-h-[calc(92vh-11rem)]">
            <div className="grid gap-4 px-5 py-4">
              {isGraded ? (
                <section className="rounded-lg border bg-muted/35 px-4 py-3">
                  <div className="text-2xl font-semibold">
                    {Math.round(attempt.score_percent ?? 0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {attempt.score_points ?? 0}/
                    {attempt.max_score_points ?? questionCount} points
                  </div>
                  {attempt.summary_feedback ? (
                    <p className="mt-2 text-sm">{attempt.summary_feedback}</p>
                  ) : null}
                </section>
              ) : null}

              {(attempt.questions ?? []).map((question, index) => (
                <QuestionBlock
                  key={question.id}
                  answerValue={answers[question.id] ?? ""}
                  isGraded={isGraded}
                  onAnswerChange={onAnswerChange}
                  question={question}
                  questionNumber={index + 1}
                />
              ))}
            </div>
          </ScrollArea>
        ) : null}

        <DialogFooter className="border-t px-5 py-4">
          {!isGraded && attempt ? (
            <Button
              type="button"
              onClick={onSubmitQuiz}
              disabled={isGrading}
            >
              {isGrading ? (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              ) : (
                <CheckCircle2 data-icon="inline-start" />
              )}
              {isGrading ? "Grading..." : "Submit for grading"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
