# Bloom Hybrid Schema Migration Guide

## Overview

This migration adds Bloom behavioral evaluation support to the existing Petri-focused schema using a hybrid approach: separate batch tables (`petri_batches`, `bloom_batches`) with a shared analysis layer (`traces`, `analyses`, `scores`, `citations`).

## Migration Files

- **`20250228000000_bloom_hybrid_schema.sql`** - Main migration (forward)
- **`20250228000001_rollback_bloom_hybrid_schema.sql`** - Rollback migration (if needed)

## Breaking Changes

### **⚠️ The `batches` table has been renamed to `petri_batches`**

**What breaks:**

- Any code/queries referencing `batches` table
- API services that query batches
- React hooks that fetch batches
- Upload logic that inserts into batches

**What needs updating:**

#### **File 1: `src/services/batches.ts`** (Line 16)

```typescript
// OLD
const { data, error } = await supabase
  .from("batches")
  .insert({
    name: name.trim(),
    ingest_source: ingestSource,  // Also remove this field
    ...
  })

// NEW
const { data, error } = await supabase
  .from("petri_batches")
  .insert({
    name: name.trim(),
    // ingest_source removed (no longer exists in petri_batches)
    started_at: stats?.started_at ?? null,
    completed_at: stats?.completed_at ?? null,
    model_usage: stats?.model_usage ?? null,
  })
```

#### **File 2: `src/app/api/batches/route.ts`** (Line 20)

```typescript
// OLD
const { data, error } = await supabase
  .from("batches")
  .select(...)

// NEW
const { data, error } = await supabase
  .from("petri_batches")
  .select(...)
```

#### **File 3: `src/app/api/batches/[id]/route.ts`** (Lines 16-18)

```typescript
// OLD
const { data, error } = await supabase
  .from("batches")
  .select(
    "id, name, created_at, ingest_source, started_at, completed_at, model_usage",
  );

// NEW
const { data, error } = await supabase
  .from("petri_batches")
  .select("id, name, created_at, started_at, completed_at, model_usage");
// Note: ingest_source removed from SELECT
```

#### **File 4: `src/app/api/batches/[id]/traces/route.ts`** (Line 19)

```typescript
// OLD
const { data: batchData } = await supabase
  .from("batches")
  .select("id")
  .eq("id", id)
  .maybeSingle();

// NEW
const { data: batchData } = await supabase
  .from("petri_batches")
  .select("id")
  .eq("id", id)
  .maybeSingle();
```

#### **File 5: `src/app/api/batches/[id]/traces/[traceId]/route.ts`** (Line 17)

```typescript
// OLD
const { data: batchData } = await supabase.from("batches")...

// NEW
const { data: batchData } = await supabase.from("petri_batches")...
```

#### **File 6: `src/types/batches.ts`**

```typescript
// Update BatchDetail interface to remove ingest_source
export interface BatchDetail {
  id: string;
  name: string;
  created_at: string;
  // ingest_source?: string | null;  ← REMOVE THIS LINE
  started_at?: string | null;
  completed_at?: string | null;
  model_usage?: Record<string, ModelUsageEntry> | null;
}
```

#### **File 7: `src/services/batch-traces.ts`** (Line 43)

```typescript
// OLD
const { data, error } = await supabase
  .from("traces")
  .select(...)
  .eq("batch_id", batchId)

// NEW
const { data, error } = await supabase
  .from("traces")
  .select(...)
  .eq("petri_batch_id", batchId)
  // Note: Column renamed from batch_id to petri_batch_id
```

## Applying the Migration

### **Option 1: Via Supabase Dashboard**

1. Go to Supabase SQL Editor
2. Copy/paste contents of `20250228000000_bloom_hybrid_schema.sql`
3. Run the migration
4. Verify tables exist: `petri_batches`, `bloom_batches`, `bloom_understanding`, etc.

### **Option 2: Via Supabase CLI**

```bash
cd /Users/evelynchin/dev/cot-analyzer
supabase db push
```

### **Option 3: Local Development**

```bash
supabase db reset  # Resets local DB and applies all migrations
```

## Post-Migration Checklist

### **1. Verify Migration Success**

- [ ] Verify all tables created: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`
- [ ] Verify dimensions inserted: `SELECT name, "group" FROM dimensions WHERE "group" LIKE 'bloom_%';` (should return 9 rows)
- [ ] Verify existing data migrated: `SELECT COUNT(*) FROM petri_batches;` (should match old batches count)
- [ ] Verify traces still linked: `SELECT COUNT(*) FROM traces WHERE petri_batch_id IS NOT NULL;`

### **2. Update Frontend Code**

- [ ] Update `src/services/batches.ts` (line 16) - change `from("batches")` to `from("petri_batches")`
- [ ] Update `src/services/batches.ts` (line 19) - remove `ingest_source` from insert
- [ ] Update `src/app/api/batches/route.ts` (line 20) - change to `petri_batches`
- [ ] Update `src/app/api/batches/[id]/route.ts` (line 16) - change to `petri_batches`
- [ ] Update `src/app/api/batches/[id]/route.ts` (line 18) - remove `ingest_source` from SELECT
- [ ] Update `src/app/api/batches/[id]/traces/route.ts` (line 19) - change to `petri_batches`
- [ ] Update `src/app/api/batches/[id]/traces/[traceId]/route.ts` (line 17) - change to `petri_batches`
- [ ] Update `src/types/batches.ts` - remove `ingest_source` from `BatchDetail` interface
- [ ] Update `src/services/batch-traces.ts` (line 43) - change `.eq("batch_id", batchId)` to `.eq("petri_batch_id", batchId)`

### **3. Test Petri Functionality**

- [ ] Start dev server: `cd src && pnpm dev`
- [ ] Navigate to home page - existing Petri batches should load
- [ ] Click into a Petri batch - should show traces and stats
- [ ] Upload a new Petri batch - should insert into `petri_batches` successfully
- [ ] View trace detail page - should work as before

### **4. Prepare for Bloom Implementation**

- [ ] Create Bloom parser in `src/lib/parsers/bloom.ts`
- [ ] Create Bloom service in `src/services/bloom-batches.ts`
- [ ] Update upload modal to support Bloom directory uploads
- [ ] Create Bloom batch detail pages at `src/app/bloom/[id]/`

## New Tables Schema Summary

### **`bloom_batches`**

Stores Bloom batch metadata (behavior name, target model, elicitation rate, etc.)

### **`bloom_understanding`** (1:1 with bloom_batches)

Stores Stage 1 understanding output (behavior definition, scientific motivation)

### **`bloom_scenarios`** (1:N with bloom_batches)

Stores Stage 2 scenario descriptions (base scenarios + variations)

### **`bloom_metajudge`** (1:1 with bloom_batches)

Stores Stage 4 metajudge analysis (diversity score, full report)

### **`traces` (modified)**

Now supports both Petri and Bloom with source discrimination:

- `petri_batch_id` - FK to petri_batches (NULL for Bloom)
- `bloom_batch_id` - FK to bloom_batches (NULL for Petri)
- `source_type` - 'petri' or 'bloom'
- `variation_number` - Bloom only: which scenario variation
- `repetition_number` - Bloom only: which repetition

## Rollback

If you need to rollback (removes all Bloom data):

```bash
# Via SQL Editor
# Run: 20250228000001_rollback_bloom_hybrid_schema.sql

# Or via CLI
supabase db reset --version 20250227999999  # Replace with timestamp before this migration
```

**Warning:** Rollback will **delete all Bloom data** (batches, scenarios, understanding, metajudge).

## Querying Examples

### **Get all batches (both sources):**

```sql
-- Petri batches
SELECT id, name, 'petri' as source FROM petri_batches
UNION ALL
-- Bloom batches
SELECT id, name, 'bloom' as source FROM bloom_batches
ORDER BY created_at DESC;
```

### **Get Bloom batch with metadata:**

```sql
SELECT
  b.*,
  u.understanding,
  u.scientific_motivation,
  m.response as metajudge_response,
  m.diversity_score
FROM bloom_batches b
LEFT JOIN bloom_understanding u ON u.batch_id = b.id
LEFT JOIN bloom_metajudge m ON m.batch_id = b.id
WHERE b.id = $1;
```

### **Get traces for a batch (works for both sources):**

```sql
-- For Petri batch
SELECT * FROM traces WHERE petri_batch_id = $1;

-- For Bloom batch
SELECT * FROM traces WHERE bloom_batch_id = $1;

-- Generic (if you know the source)
SELECT * FROM traces
WHERE
  CASE
    WHEN $source = 'petri' THEN petri_batch_id = $batch_id
    WHEN $source = 'bloom' THEN bloom_batch_id = $batch_id
  END;
```

### **Get scenario description for Bloom trace:**

```sql
SELECT
  t.*,
  s.description as scenario_description,
  s.variation_type,
  s.scenario_number
FROM traces t
JOIN bloom_scenarios s ON s.batch_id = t.bloom_batch_id
                      AND s.variation_number = t.variation_number
WHERE t.id = $1 AND t.source_type = 'bloom';
```

## Testing the Migration

### **Before migration:**

```sql
SELECT COUNT(*) as petri_batch_count FROM batches;
SELECT COUNT(*) as trace_count FROM traces;
```

### **After migration:**

```sql
-- Verify rename worked
SELECT COUNT(*) as petri_batch_count FROM petri_batches;  -- Should match old count
SELECT COUNT(*) as trace_count FROM traces WHERE source_type = 'petri';  -- Should match old count

-- Verify new tables exist
SELECT COUNT(*) FROM bloom_batches;  -- Should be 0
SELECT COUNT(*) FROM bloom_understanding;  -- Should be 0
SELECT COUNT(*) FROM bloom_scenarios;  -- Should be 0
SELECT COUNT(*) FROM bloom_metajudge;  -- Should be 0

-- Verify new dimensions
SELECT COUNT(*) FROM dimensions WHERE "group" LIKE 'bloom_%';  -- Should be 9
```
