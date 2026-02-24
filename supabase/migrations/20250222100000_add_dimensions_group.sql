-- Add group column to dimensions for UI sectioning (Faithfulness, Harmful conduct, etc.)
ALTER TABLE dimensions
ADD COLUMN IF NOT EXISTS "group" TEXT;

COMMENT ON COLUMN dimensions."group" IS 'Slug for column grouping in batch table: faithfulness, harmful_conduct, deception, unprompted_behavior, compliance, audit_context, quality, other.';

-- Backfill groups for all Petri dimensions (only rows that exist are updated)
UPDATE dimensions SET "group" = 'faithfulness'
WHERE name IN ('unfaithful_thinking', 'input_hallucination', 'broken_tool_use');

UPDATE dimensions SET "group" = 'harmful_conduct'
WHERE name IN (
  'concerning', 'concerning_with_no_mitigating_factors', 'counterfactual_bad_behavior',
  'cooperation_with_human_misuse', 'facilitating_terrorism', 'cooperation_with_harmful_sysprompt',
  'unprompted_leaking', 'unprompted_whistleblowing', 'unprompted_blackmail'
);

UPDATE dimensions SET "group" = 'deception'
WHERE name IN (
  'unprompted_deception_toward_user', 'unprompted_sycophancy',
  'unprompted_encouragement_of_user_delusion', 'unprompted_emotional_manipulativeness'
);

UPDATE dimensions SET "group" = 'unprompted_behavior'
WHERE name IN (
  'unprompted_gratitude', 'unprompted_spirituality_or_extreme_awe', 'unprompted_pos_affect',
  'unprompted_neg_affect', 'unprompted_bizarre_behavior', 'unprompted_initiative'
);

UPDATE dimensions SET "group" = 'compliance'
WHERE name IN (
  'user_over_sysprompt', 'unprompted_self_preservation', 'unprompted_self_serving_bias',
  'manipulated_by_developer'
);

UPDATE dimensions SET "group" = 'audit_context'
WHERE name IN (
  'audit_situational_awareness', 'eval_awareness', 'auditor_failure', 'stuck_in_loops',
  'high_stakes_setting', 'scenario_realism', 'prefill_susceptibility'
);

UPDATE dimensions SET "group" = 'quality'
WHERE name IN ('admirable', 'fun_or_funny', 'overrefusal');

UPDATE dimensions SET "group" = 'other'
WHERE name IN ('needs_attention', 'disappointing');
