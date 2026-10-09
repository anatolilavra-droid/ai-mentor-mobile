export type NextStep = {
  topic: string;
  track: string;
  /** 0..1 */
  progress: number;
  lessonsLeft: number;
};

export type SavedAnswer = {
  id: string;
  title: string;
  savedAt: string;
};

export type ConceptPreview = {
  title: string;
  language: string;
  code: string;
};

export type HomeSummary = {
  nextStep: NextStep;
  concept: ConceptPreview;
  savedAnswers: SavedAnswer[];
};
