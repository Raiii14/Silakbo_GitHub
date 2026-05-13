import type { SetupData, RepoAnalysis } from "../context/SetupContext";
import { reviewPublicRepository } from "./githubRepoReview";

export interface GeneratedFile {
  name: string;
  content: string;
  explanation: string;
  icon: string;
}

function today(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function stageAdvice(stage: string): string {
  const map: Record<string, string> = {
    Ideation: "Focus on defining the problem and exploring solutions. Do not start coding yet.",
    "Proposal Writing": "Document your idea clearly. Avoid implementation details until the proposal is approved.",
    Planning: "Break down features into a backlog. Avoid coding until priorities are set.",
    Prototype: "Build the minimum interface to validate the core idea. Keep it throwaway-quality.",
    "MVP Development": "Build only the features on your defined MVP list. No extras.",
    Testing: "Write tests for existing features. Do not add new features during this stage.",
    Documentation: "Document the system as it exists. Avoid refactoring while documenting.",
    Maintenance: "Fix bugs and update dependencies. Avoid scope creep.",
  };
  return map[stage] || "Focus on completing your current stage before moving forward.";
}

function experiencePromptGuide(experience: string, projectType: string): string {
  if (experience === "Beginner") {
    return `As a beginner working on a ${projectType}, ask the AI to:
- Explain each step before writing code
- Break tasks into single-function requests
- Point out what you need to learn to understand the output
- Avoid advanced patterns until fundamentals are solid`;
  }
  if (experience === "Intermediate") {
    return `As an intermediate developer working on a ${projectType}, ask the AI to:
- Suggest approaches before committing to one
- Explain tradeoffs between options
- Highlight parts you should review manually
- Flag anything that might cause maintenance issues`;
  }
  return `As an experienced developer working on a ${projectType}, ask the AI to:
- Provide concise, production-quality code
- Highlight non-obvious design decisions
- Flag security or performance concerns
- Suggest tests for critical paths`;
}

function learningCheckpoints(support: string[], experience: string): string {
  const items: string[] = [];
  if (support.includes("Explain generated code")) {
    items.push("- [ ] Review and explain every code block before moving to the next task");
  }
  if (support.includes("Break features into small steps")) {
    items.push("- [ ] Decompose each feature into tasks no larger than one function or component");
  }
  if (support.includes("Identify what to learn first")) {
    items.push("- [ ] Before each session, ask: 'What concept does this build on that I should understand?'");
  }
  if (support.includes("Review code before adding more features")) {
    items.push("- [ ] Complete a code review checkpoint after each feature before starting the next");
  }
  if (support.includes("Help debug without giving the full answer immediately")) {
    items.push("- [ ] When stuck, ask for hints and narrow guidance rather than complete solutions");
  }
  if (items.length === 0) {
    items.push("- [ ] Schedule regular self-reviews of AI-generated code");
  }
  return items.join("\n");
}

function handoffSteps(stage: string, projectTypes: string[]): string {
  const type = projectTypes[0] || "project";
  const stageSteps: Record<string, string[]> = {
    Ideation: [
      "- [ ] Problem statement written and reviewed",
      "- [ ] Target users identified",
      "- [ ] 3–5 solution approaches considered",
      "- [ ] Chosen direction documented with reasoning",
    ],
    "Proposal Writing": [
      "- [ ] Executive summary complete",
      "- [ ] Feature list defined and scoped",
      "- [ ] Technology choices explained",
      "- [ ] Timeline and milestones drafted",
    ],
    Planning: [
      "- [ ] Backlog created with prioritized items",
      "- [ ] Architecture diagram or notes written",
      "- [ ] Development environment setup documented",
      "- [ ] First sprint or milestone defined",
    ],
    Prototype: [
      "- [ ] Core user flow can be demonstrated",
      "- [ ] Key assumptions identified for validation",
      "- [ ] Feedback from at least one person collected",
      "- [ ] Decision made: continue, pivot, or stop",
    ],
    "MVP Development": [
      `- [ ] All MVP features for the ${type} are working`,
      "- [ ] Critical paths have basic tests",
      "- [ ] README includes setup instructions",
      "- [ ] Known issues and limitations documented",
    ],
    Testing: [
      "- [ ] Test plan written",
      "- [ ] Unit tests cover critical functions",
      "- [ ] Edge cases identified and tested",
      "- [ ] Bugs logged with reproduction steps",
    ],
    Documentation: [
      "- [ ] README is complete and accurate",
      "- [ ] API or component documentation written",
      "- [ ] Setup and deployment steps verified",
      "- [ ] Architecture decisions documented",
    ],
    Maintenance: [
      "- [ ] All open bugs triaged",
      "- [ ] Dependencies reviewed for updates",
      "- [ ] Deprecation notices documented",
      "- [ ] Backup and recovery steps verified",
    ],
  };
  return (stageSteps[stage] || stageSteps["MVP Development"]).join("\n");
}

function buildAllowedFiles(stage: string): string[] {
  const base = ["README.md", "PROJECT_CONTEXT.md", "AI_WORKFLOW.md", "DECISIONS.md"];

  if (stage === "Ideation" || stage === "Proposal Writing") {
    return [...base, "docs/*"];
  }

  if (stage === "Planning") {
    return [...base, "docs/*", "package.json", ".env.example"];
  }

  if (stage === "Prototype") {
    return [...base, "src/*", "package.json", ".env.example"];
  }

  // MVP Development, Testing, Documentation, Maintenance
  return [...base, "src/*", "tests/*", "package.json", ".env.example", "config files"];
}

function buildVerifyStep(stage: string, experience: string): string {
  if (stage === "Testing") {
    return "Run the relevant test suite and confirm all tests pass before reporting.";
  }

  if (experience === "Beginner") {
    return "Explain what the code does, suggest a manual way to verify it works, and write a basic test if applicable.";
  }

  if (stage === "Prototype") {
    return "Confirm the change works with a manual check. Formal tests are not required at this stage.";
  }

  return "Run or suggest relevant tests. If tests do not exist for this area, write them.";
}

function repoContextBlock(repoAnalysis: RepoAnalysis | null): string {
  if (!repoAnalysis) {
    return "";
  }

  return `
## Repository Review Signals
**Repository:** ${repoAnalysis.fullName}
**Default Branch:** ${repoAnalysis.defaultBranch}
**Tree Scan Status:** ${repoAnalysis.treeScanStatus}
**Matched Setup Files:** ${repoAnalysis.matchedFiles.length}

### Findings
- README present: ${repoAnalysis.hasReadme ? "Yes" : "No"}
- Docs folder present: ${repoAnalysis.hasDocs ? "Yes" : "No"}
- AI instruction files present: ${repoAnalysis.hasAIInstructions ? "Yes" : "No"}
- Decision log present: ${repoAnalysis.hasDecisionLog ? "Yes" : "No"}
- Test setup detected: ${repoAnalysis.hasTestSetup ? "Yes" : "No"}

### Warnings
${repoAnalysis.warnings.length > 0 ? repoAnalysis.warnings.map((warning) => `- ${warning}`).join("\n") : "- No major warnings from the shallow review."}
`;
}

export function generateSetupFiles(data: SetupData): GeneratedFile[] {
  const projectType = data.projectTypes[0] || "project";
  const stage = data.stage || "MVP Development";
  const experience = data.experience || "Intermediate";
  const stack = data.stack.length > 0 ? data.stack.join(", ") : "Not specified";
  const aiTools = data.aiTools.length > 0 ? data.aiTools.join(", ") : "Not specified";
  const allowedFiles = buildAllowedFiles(stage);

  const files: GeneratedFile[] = [];

  // ── PROJECT_CONTEXT.md ──────────────────────────────────────────────────
  // Structured as the [Context] block per DiCuffa et al. (2025)
  files.push({
    name: "PROJECT_CONTEXT.md",
    icon: "📋",
    explanation:
      "This file gives your AI assistant the essential background it needs before helping you. It follows the Context + Instruction pattern from prompt engineering research — providing structured project information so the AI stays focused on your actual goals instead of guessing.",
    content: `# Project Context
> Generated by ClearStack on ${today()}
> Structure: Context + Instruction pattern (DiCuffa et al., 2025)

## [Context] Project Identity
| Field | Value |
|-------|-------|
| **Project type** | ${data.projectTypes.join(", ") || "Not specified"} |
| **Current stage** | ${stage} |
| **Experience level** | ${experience} |
| **Tech stack** | ${stack} |
| **AI tools in use** | ${aiTools} |

## [Context] Current Focus
${stageAdvice(stage)}

## [Context] Scope Boundaries
The following should be treated as **out of scope** for the current stage:
${
  stage === "Ideation" || stage === "Proposal Writing"
    ? "- Actual code implementation\n- Database schemas\n- Deployment configuration\n- Third-party integrations"
    : stage === "Prototype"
      ? "- Production-quality error handling\n- Authentication and authorization\n- Performance optimization\n- Automated tests"
      : "- New features not on the MVP list\n- Premature optimization\n- Over-engineering architecture"
}

## [Context] Files the AI May Touch
${allowedFiles.map((f) => `- ${f}`).join("\n")}

## [Instruction] What I Want AI to Help With
${data.aiHelp.map((h) => `- ${h}`).join("\n") || "- General coding assistance"}

## [Guardrails] What AI Must Avoid
${data.aiAvoid.map((a) => `- ❌ ${a}`).join("\n") || "- No specific restrictions set"}
- ❌ Do not modify files outside the listed scope
- ❌ Do not install new dependencies without explicit approval
- ❌ Ask for clarification if requirements are ambiguous

${repoContextBlock(data.repoAnalysis)}
`,
  });

  // ── AI_WORKFLOW.md ──────────────────────────────────────────────────────
  // Full Context + Instruction + Recipe + Guardrails structure
  // per DiCuffa et al. (2025) prompt pattern research
  files.push({
    name: "AI_WORKFLOW.md",
    icon: "🤖",
    explanation:
      "This is your primary copy-paste prompt for AI tools. It follows the Context + Instruction + Recipe + Guardrails pattern from prompt engineering research — the two highest-performing prompt structures for reducing back-and-forth corrections with AI.",
    content: `# AI Workflow Instructions
> Generated by ClearStack on ${today()}
> Structure: Context + Instruction + Recipe + Guardrails (DiCuffa et al., 2025)
>
> Paste this into your AI tool's system prompt, instruction file,
> or at the start of a new session (e.g., .cursorrules, CLAUDE.md, custom instructions).

---

## [Context]
**Project:** ${data.projectTypes.join(", ") || "Unspecified project"}
**Tech stack:** ${stack}
**Current stage:** ${stage}
**Experience level:** ${experience}
**AI tools in use:** ${aiTools}
**Files the AI is allowed to touch:** ${allowedFiles.join(", ")}

${experiencePromptGuide(experience, projectType)}

## [Instruction]
**Task scope:** Help me with the following areas only:
${data.aiHelp.map((h) => `- ${h}`).join("\n") || "- General development assistance"}

**Stage-specific directive:**
${stageAdvice(stage)}

## [Recipe]
Follow this sequence when I give you a task:

1. **Clarify** — Read my request and ask clarifying questions if the scope, expected behavior, or acceptance criteria are unclear. Do not assume.
2. **Plan** — Outline what you will do in 3–5 steps before writing any code. Wait for my confirmation.
3. **Implement** — Write the code for the confirmed plan. Keep changes scoped to the files listed in [Context].
4. **Verify** — ${buildVerifyStep(stage, experience)}
5. **Report** — Summarize what changed, what was tested, and what I should review manually.

## [Guardrails]
### Scope Rules
- Only modify files listed in [Context] unless I explicitly expand the scope.
- Do not add features, dependencies, or patterns not discussed in the current task.
- If a task touches more than 3 files, stop and confirm the scope with me first.

### Verification Rules
- Ask clarifying questions before writing code.
- Explain your reasoning when the approach is non-obvious.
${experience === "Beginner" ? "- Explain each code block as if teaching the concept for the first time.\n- Point out what I should learn to understand the output." : ""}

### Safety Rules
${data.aiAvoid.map((a) => `- ❌ ${a}`).join("\n") || "- No specific restrictions set"}
- ❌ Do not introduce private keys, tokens, or credentials into code
- ❌ Do not push to protected branches without explicit permission
- ❌ Do not install new dependencies without explicit approval

### Test Rules
- Confirm test coverage exists before marking a task complete.
- Write or update tests for any changed logic.
- If tests cannot run in this environment, document what should be tested.

## Code Review Checkpoint
Before asking AI to write the next feature, confirm:
- [ ] I understand what the previous code block does
- [ ] I can explain the logic to someone else
- [ ] The previous task is tested or verified manually
- [ ] This next task is scoped to a single, clear outcome

## Learning Checkpoints
${learningCheckpoints(data.learningSupport, experience)}
`,
  });

  // ── DECISIONS.md ────────────────────────────────────────────────────────
  if (data.decisionTracking === "Yes" || data.decisionTracking === "Not sure") {
    files.push({
      name: "DECISIONS.md",
      icon: "📝",
      explanation:
        "A decision log captures the 'why' behind important choices. Future teammates and AI tools need this context to avoid re-debating resolved questions or accidentally reversing intentional decisions.",
      content: `# Decision Log
> Started: ${today()}

## How to Use This File
Add an entry every time you make a significant architectural, technology, or design decision.
Keep entries short — the goal is context, not documentation for its own sake.

---

## Template

### Decision: [Short Title]
- **Date:** [date]
- **Status:** Proposed | Accepted | Superseded | Rejected
- **Context:** Why did this decision need to be made? What problem were you solving?
- **Options Considered:**
  1. Option A — [brief note]
  2. Option B — [brief note]
- **Decision:** Which option was chosen and why?
- **Consequences:** What does this make easier or harder going forward?

---

## Decisions

### Decision: Technology Stack Selection
- **Date:** ${today()}
- **Status:** Accepted
- **Context:** Need to choose the technology stack for a ${projectType} at ${stage} stage.
- **Options Considered:**
  1. ${data.stack[0] || "Option A"} — already familiar, lower learning curve
  2. Alternative — potentially better fit, but requires new learning
- **Decision:** Proceeding with ${stack}
- **Consequences:** Faster initial progress; may need to revisit if requirements change significantly.

`,
    });
  }

  // ── PROGRESS_HANDOFF.md ─────────────────────────────────────────────────
  if (data.progressHandoff === "Yes" || data.progressHandoff === "Not sure") {
    files.push({
      name: "PROGRESS_HANDOFF.md",
      icon: "🔁",
      explanation:
        "Use this file when handing off work to a teammate, resuming after a break, or starting a new AI session. A concise handoff prevents the AI from misunderstanding where you are and avoids repeating work.",
      content: `# Progress Handoff
> Last updated: ${today()}

## Project Summary
**Type:** ${data.projectTypes.join(", ") || "Not specified"}
**Stage:** ${stage}
**Stack:** ${stack}

## Current Status
- **What I'm working on:** [Describe the current task]
- **What's blocking me:** [Any blockers, or 'None']
- **Last completed:** [Most recently finished item]

## Stage Checklist: ${stage}
${handoffSteps(stage, data.projectTypes)}

## Open Questions
- [ ] [Question that needs an answer before proceeding]

## Context for Next Session
Paste this summary into your AI assistant at the start of the next session:

\`\`\`
I am working on a ${projectType} in the ${stage} stage.
My stack is: ${stack}.
I am a ${experience} developer.
Last session I completed: [fill in].
The next task is: [fill in].
Please do not suggest features outside the current stage.
\`\`\`

`,
    });
  }

  if (data.repoAnalysis) {
    files.push({
      name: "REPOSITORY_REVIEW.md",
      icon: "🔎",
      explanation:
        "This file captures the public GitHub repository signals that ClearStack found. Keep it with the rest of your setup docs so future AI sessions do not have to infer the current repo state from scratch.",
      content: `# Repository Review
> Generated by ClearStack on ${today()}

## Repository
- **Name:** ${data.repoAnalysis.fullName}
- **URL:** ${data.repoAnalysis.repoUrl}
- **Default branch:** ${data.repoAnalysis.defaultBranch}
- **Tree scan status:** ${data.repoAnalysis.treeScanStatus}

## Setup Signals
- README present: ${data.repoAnalysis.hasReadme ? "Yes" : "No"}
- Docs folder present: ${data.repoAnalysis.hasDocs ? "Yes" : "No"}
- AI instruction files present: ${data.repoAnalysis.hasAIInstructions ? "Yes" : "No"}
- Decision log present: ${data.repoAnalysis.hasDecisionLog ? "Yes" : "No"}
- Test setup detected: ${data.repoAnalysis.hasTestSetup ? "Yes" : "No"}
- Project guide present: ${data.repoAnalysis.hasProjectGuide ? "Yes" : "No"}

## Top-Level Structure
${data.repoAnalysis.folderStructure.map((path) => `- ${path}`).join("\n") || "- No top-level entries returned"}

## Matched Files
${data.repoAnalysis.matchedFiles.map((path) => `- ${path}`).join("\n") || "- No allowlisted setup files matched"}

## Missing Signals
${data.repoAnalysis.missingSignals.map((signal) => `- ${signal}`).join("\n") || "- No major setup signals missing"}

## Warnings
${data.repoAnalysis.warnings.map((warning) => `- ${warning}`).join("\n") || "- No warnings"}
`,
    });
  }

  // ── README.md recommendations ────────────────────────────────────────────
  files.push({
    name: "README_RECOMMENDATIONS.md",
    icon: "📖",
    explanation:
      "These are recommendations for your project README. A clear README helps collaborators, reviewers, and AI tools understand your project quickly. Update it whenever your setup or scope changes.",
    content: `# README Recommendations
> Generated by ClearStack on ${today()}

## Recommended README Sections for Your Stage (${stage})

${
  stage === "Ideation" || stage === "Proposal Writing"
    ? `### Minimum for Now
- Project name and one-line description
- Problem statement (2–3 sentences)
- Proposed solution overview
- Your name and contact

> You do not need setup instructions, tech details, or deployment steps yet.
> Adding them now may confuse your proposal reviewers.`
    : stage === "Prototype"
      ? `### Recommended Sections
- Project name and description
- What this prototype demonstrates
- How to run it locally (simple steps)
- Known limitations and what's intentionally not implemented
- Next steps / validation goals`
      : `### Recommended Sections
- Project name and clear description
- Tech stack badge list
- Prerequisites and local setup instructions
- How to run tests
- Folder structure overview
- Contributing guidelines (if team project)
- Known issues or limitations
- License`
}

## Anti-Patterns to Avoid
- Do not add a production deployment section if you're still in ${stage} stage
- Do not add a full API reference before your API is stable
- Keep the README under 500 lines unless the project is genuinely complex
${data.repoAnalysis ? `- Close the repo gaps first: ${data.repoAnalysis.missingSignals.join(", ") || "none"}` : ""}

## README Health Check
- [ ] Does the README explain what the project is in the first paragraph?
- [ ] Can a new person set up the project using only the README?
- [ ] Is the README accurate as of today?
`,
  });

  return files;
}

export async function analyzeRepo(url: string): Promise<RepoAnalysis> {
  return reviewPublicRepository(url);
}
