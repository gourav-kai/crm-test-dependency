export const STAGES = ['Evaluating', 'Proposing', 'Solutioning', 'Complete'] as const;
export type Stage = typeof STAGES[number];

export interface Lead {
  id: number;
  opportunityName: string;
  notes: string | null;
  contactPerson: string;
  estimatedClosingDate: string;
  leadValue: number;
  stage: Stage;
  ownerId: number;
  createdAt: string;
  updatedAt: string;
}
