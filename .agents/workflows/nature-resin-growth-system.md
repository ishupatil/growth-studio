---
description: Nature / Resin Growth Multi-Agent System
---

# Nature / Resin Growth Multi-Agent System

This workflow implements an automated, adaptive multi-agent system to analyze social media profiles (specifically for Nature / Resin Growth) and generate a weekly growth package, replacing manual frontend forms.

## Step 1: Input Collection

Collect the following input directly from the user (or another automated node):
- `username`
- `followers`
- `avg_likes`
- `avg_comments`
- `posting_frequency`
- `content_type`
- `brand_tone`
- `goal`
- `target_followers`

## Step 2: Multi-Agent Flow

Run the following agents sequentially, passing outputs forward as inputs for the next agent in the sequence.

### Agent 1 — Audit Agent
**Task/Prompt:**
- Calculate the engagement rate.
- Identify weaknesses based on current metrics.
- Suggest growth gaps.
**Output expected:** `audit_report`

### Agent 2 — Strategy Agent
**Inputs required:** `audit_report`, `goal`
**Task/Prompt:**
- Develop a comprehensive 7-day structured plan focusing on the desired goal and addressing the audit findings.
**Output expected:** `strategy_plan`

### Agent 3 — Content Agent
**Inputs required:** `strategy_plan`, `content_type`, `brand_tone`
**Task/Prompt:**
- Brainstorm and generate specific post ideas.
- Write reel scripts aligned with the brand tone and content type.
**Output expected:** `content_ideas`

### Agent 4 — Caption Agent
**Inputs required:** `content_ideas`, target audience context, `goal`
**Task/Prompt:**
- Write highly engaging captions for all proposed content.
- Include clear Call-to-Action (CTA) statements.
- Generate trending, relevant hashtags.
**Output expected:** `captions_and_hashtags`

## Step 3: Combine Outputs

Combine all outputs into a single, cohesive response.
Return the structured result in the following format:

**Weekly Growth Package:**
- **Strategy:** (from Strategy Agent)
- **Content Plan:** (from Content Agent)
- **Captions:** (from Caption Agent)
- **Hashtags:** (from Caption Agent)
- **Engagement Ideas:** (from Audit / Strategy Agents)

## Step 4: Storage

1. Connect to Supabase (or external storage solution).
2. Store the user's initial input data.
3. Store the generated weekly plans for tracking.
*(If no external integration is available, output the final package as a JSON file manually for testing).*

## Step 5: Adaptive Feedback Loop

When reviewing the past week's performance, run a secondary process:
1. **Performance Input Collection:** Collect `followers gained`, `best post`, and `engagement change`.
2. **Strategy Adjustment:** Feed these metrics directly into the **Strategy Agent** ahead of generating the next week's plan. This ensures the system becomes adaptive over time.
