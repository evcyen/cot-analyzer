# Chain of Thought Analyzer

A web-based tool for analyzing AI safety evaluations with chain-of-thought reasoning. Built for safety researchers to upload, score, and deeply analyze evaluation traces with interactive visualizations and citation tracking.

## Overview

The CoT Analyzer ingests evaluation traces (currently from [Petri](https://github.com/UKGovernmentBEIS/inspect_evals/tree/main/src/inspect_evals/petri)), displays dimension-level safety/alignment scores, and provides rich statistical analysis and visualizations to help researchers identify patterns, problems, and insights across batches of traces.

### What it does

- **Upload evaluation batches** - Parse Inspect AI EvalLog JSON files (Petri format)
- **Score traces** - Extract dimension scores (1-10 scale) across safety/alignment dimensions
- **Track citations** - Parse and display citations linking scores to specific reasoning steps
- **Visualize patterns** - Interactive charts, heatmaps, and statistics across traces and dimensions
- **Compare traces** - Radar charts, scatter plots, and distribution analysis

### Up Next

1. Test with large batches of 100+ traces. Optimize upload, parsing, and rendering performance.
2. Support InspectEvals traces and perform analyses on safety specific dimensions
3. Support Bloom traces for behavioral evaluations
4. Export batch summaries. Export PDF reports with charts.
5. Convert from hosted demo to self-contained framework that can be run local-first.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: TailwindCSS 4, Shadcn UI components
- **Charts**: Recharts (via Shadcn chart components)
- **Database**: Supabase (PostgreSQL)
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Supabase account (or local Supabase instance)

### Installation

```bash
# Install dependencies
cd frontend
pnpm install
```

### Environment Setup

Create a `.env` file in the project root:

```env
SUPABASE_PROJECT_URL=your-supabase-project-url
SUPABASE_API_KEY=your-supabase-anon-key
DATABASE_URL_DIRECT=your-direct-db-connection-string
DATABASE_URL=your-pooled-db-connection-string

# API keys for running evaluations (optional for viewing only)
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
GOOGLE_API_KEY=your-google-key
```

### Database Setup

Migrations are managed in `supabase/migrations/`. Apply them using Supabase CLI or your hosted Supabase project.

### Running Locally

```bash
cd frontend
pnpm dev
```

## Acknowledgments

Built on top of:

- [Inspect AI](https://github.com/UKGovernmentBEIS/inspect_ai) - Evaluation framework
- [Petri](https://github.com/UKGovernmentBEIS/inspect_evals/tree/main/src/inspect_evals/petri) - Safety audit evaluation
- [Shadcn UI](https://ui.shadcn.com/) - UI component library
