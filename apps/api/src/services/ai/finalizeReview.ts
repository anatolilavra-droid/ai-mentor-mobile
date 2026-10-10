import { ISSUE_SEVERITIES, type CodeReviewAction, type CodeReviewOutput } from '@ai-mentor/shared';

const SEVERITY_RANK = new Map(ISSUE_SEVERITIES.map((severity, index) => [severity, index]));

/** Which optional parts each action may return. */
const ALLOWED: Record<CodeReviewAction, { steps: boolean; code: boolean }> = {
  explain: { steps: true, code: false },
  review: { steps: false, code: false },
  fix: { steps: false, code: true },
  improve: { steps: false, code: true },
};

/**
 * Makes a schema-valid review consistent with the request: drops parts the
 * action does not use, removes line numbers outside the code, and orders issues
 * from errors to tips (stable within a severity).
 */
export function finalizeReview(
  output: CodeReviewOutput,
  request: { action: CodeReviewAction; lines: number },
): CodeReviewOutput {
  const allowed = ALLOWED[request.action];
  const issues = output.issues
    .map(({ line, ...issue }) =>
      line !== undefined && line <= request.lines ? { ...issue, line } : issue,
    )
    .map((issue, index) => ({ issue, index }))
    .sort(
      (a, b) =>
        (SEVERITY_RANK.get(a.issue.severity) ?? 0) - (SEVERITY_RANK.get(b.issue.severity) ?? 0) ||
        a.index - b.index,
    )
    .map(({ issue }) => issue);

  const fixedCode =
    allowed.code && output.fixedCode && output.fixedCode.trim().length > 0
      ? output.fixedCode
      : undefined;

  return {
    summary: output.summary,
    ...(allowed.steps && output.steps?.length ? { steps: output.steps } : {}),
    issues,
    ...(fixedCode !== undefined ? { fixedCode } : {}),
    ...(fixedCode !== undefined && output.changes?.length ? { changes: output.changes } : {}),
    nextStep: output.nextStep,
    confidence: output.confidence,
  };
}
