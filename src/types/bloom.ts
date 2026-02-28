export interface BloomTranscriptFile {
  id: string;
  transcript_id: string;
  _filePath: string;
  summary: string;
  scores: Record<string, number>;
  variation_number?: number;
  repetition_number?: number;
  modality?: string;
  scenario_id?: string;
  messages?: Array<{
    role: string;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface BloomIndexFile {
  version: string;
  generated_at: string;
  config: {
    name: string;
    path: string;
    auditor_model: string;
    target_model: string;
    transcript_count: number;
  };
  summary_statistics: {
    average_behavior_presence_score: number;
    min_behavior_presence_score: number;
    max_behavior_presence_score: number;
    elicitation_rate: number;
    total_judgments: number;
    [key: string]: number;
  };
  metajudge: {
    response: string;
    justification: string;
  };
  transcripts: BloomTranscriptFile[];
}

export interface BloomUnderstandingFile {
  behavior_name: string;
  examples: string[];
  model: string;
  temperature: number;
  evaluator_reasoning_effort: string;
  understanding: string;
  scientific_motivation: string;
  understanding_reasoning: string;
  transcript_analyses: unknown[];
}

export interface BloomIdeationFile {
  behavior_name: string;
  examples: string[];
  model: string;
  temperature: number;
  reasoning_effort: string;
  num_scenarios: number;
  variation_dimensions: string[];
  total_evals: number;
  variations: Array<{
    description: string;
    tools: unknown[];
  }>;
}

export interface BloomJudgmentFile {
  behavior_name: string;
  target_model: string;
  auditor_model: string;
  temperature: number;
  max_tokens: number;
  num_samples: number;
  additional_qualities: string[];
  transcript_analyses: Array<{
    transcript_id: string;
    scores: Record<string, number>;
    justifications: Record<string, string>;
    reasoning: string;
  }>;
}

export interface BloomRolloutFile {
  metadata: {
    modality: string;
    no_user_mode: string;
    max_turns: number;
    evaluator: string;
    target: string;
  };
  rollouts: Array<{
    variation_number: number;
    variation_description: string;
    repetition_number: number;
    modality: string;
    transcript: unknown;
  }>;
}

export interface ParsedBloomBatch {
  batch: {
    behavior_name: string;
    target_model: string;
    auditor_model: string;
    modality: string;
    transcript_count: number;
    generated_at: string;
    elicitation_rate: number;
    avg_behavior_presence: number;
    min_behavior_presence: number;
    max_behavior_presence: number;
    metajudge_response: string;
    metajudge_justification: string;
    diversity_score: number | null;
  };
  understanding: {
    understanding_text: string;
    understanding_reasoning: string;
    scientific_motivation: string;
    model: string;
  };
  scenarios: Array<{
    scenario_number: number;
    description: string;
    variation_dimensions: string[];
  }>;
  traces: Array<{
    transcript_id: string;
    scenario_number: number;
    variation_number: number;
    repetition_number: number;
    modality: string;
    target_model: string;
    messages: unknown[];
    scores: Record<string, number>;
    summary: string;
  }>;
}

export interface BloomDirectoryFiles {
  index: unknown;
  understanding: unknown;
  ideation: unknown;
  judgment: unknown;
  rollout: unknown;
  transcripts: Record<string, unknown>;
}

export interface BloomTranscriptEvent {
  type: string;
  id: string;
  timestamp: string;
  view: string[];
  edit?: {
    operation: string;
    message?: {
      role: string;
      id: string;
      content: string;
      source?: string;
    };
  };
}

export interface BloomBatchDetail {
  batch: {
    id: string;
    name: string;
    behavior_name: string;
    target_model: string;
    auditor_model: string;
    modality: string;
    transcript_count: number | null;
    generated_at: string | null;
    elicitation_rate: number | null;
    avg_behavior_presence: number | null;
    min_behavior_presence: number | null;
    max_behavior_presence: number | null;
    metajudge_response: string | null;
    metajudge_justification: string | null;
    diversity_score: number | null;
    metajudge_model: string | null;
    variation_dimensions: string[] | null;
    created_at: string;
  };
  understanding: {
    id: string;
    understanding: string;
    understanding_reasoning: string | null;
    scientific_motivation: string | null;
    model: string;
  } | null;
  scenarios: Array<{
    id: string;
    scenario_number: number;
    variation_type: string | null;
    variation_number: number;
    description: string;
    tools: unknown;
    created_at: string;
  }>;
  transcripts: Array<{
    id: string;
    transcript_id: string | null;
    summary: string | null;
    behavior_presence: number | null;
    unrealism: number | null;
    evaluation_awareness: number | null;
    evaluation_invalidity: number | null;
    messages: unknown;
    variation_number: number | null;
    repetition_number: number | null;
  }>;
}
