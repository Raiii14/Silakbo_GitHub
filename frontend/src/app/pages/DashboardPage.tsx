import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router";
import { useSetup, type SetupData } from "../context/SetupContext";
import { generateSetupFiles, type GeneratedFile } from "../utils/generateSetup";
import { getChatResponse, getSuggestions, type ChatMessage } from "../utils/chatResponses";
import { BrandLogo } from "../components/BrandLogo";
import { ClearStackLogoMark } from "../components/ClearStackLogoMark";

type AiToolTab = "cursor" | "claude" | "chatgpt" | "codex" | "gemini" | "copilot";

export function DashboardPage() {
  const { data, resetData } = useSetup();
  const navigate = useNavigate();

  useEffect(() => {
    if (!data.isGenerated) {
      navigate("/setup");
    }
  }, [data.isGenerated, navigate]);

  const setupSnapshot = useMemo(() => collectSetupSnapshot(data), [data]);

  if (!data.isGenerated) {
    return null;
  }

  const files = generateSetupFiles(setupSnapshot);

  return (
    <div
      className="h-screen bg-[#f4f4f2] flex flex-col overflow-hidden"
      style={{ fontFamily: "Inter, Arial, sans-serif" }}
    >
      <header className="bg-white border-b border-[#e5e7eb] px-6 h-14 flex items-center gap-4 flex-shrink-0 z-10">
        <Link to="/" className="flex items-center no-underline shrink-0" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          <BrandLogo className="block h-7 w-auto" />
        </Link>

        <div className="hidden sm:flex items-baseline gap-2 ml-2 min-w-0 text-[13px] text-[#5c5c6b]">
          <span className="truncate font-medium text-[#17171c]">{data.projectTypes[0] ?? "Project"}</span>
          {data.stage ? (
            <>
              <span className="text-[#c4c4cc]">/</span>
              <span className="truncate">{data.stage}</span>
            </>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              resetData();
              navigate("/setup");
            }}
            className="text-[#5c5c6b] bg-transparent border border-[#e5e7eb] cursor-pointer hover:border-[#17171c] hover:text-[#17171c] transition-colors rounded-md"
            style={{ fontSize: "13px", padding: "6px 14px" }}
          >
            New setup
          </button>
        </div>
      </header>

      {data.repoAnalysis ? <RepoSignalsStrip analysis={data.repoAnalysis} /> : null}

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <section className="shrink-0 border-b border-[#e2e2e6] bg-white">
          <div className="mx-auto max-w-6xl px-6 pt-12 pb-10">
            <p
              className="m-0 text-[#8b8b99] tracking-[0.14em] uppercase"
              style={{ fontSize: "11px", fontWeight: 600 }}
            >
              Package ready
            </p>
            <h1
              className="m-0 mt-4 text-[#0f0f12] max-w-2xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(26px, 3.2vw, 34px)", lineHeight: 1.12, fontWeight: 600 }}
            >
              Your AI setup package is ready
            </h1>
            <HeroOutcomeLine setup={setupSnapshot} fileCount={files.length} />

            <div className="mt-10 grid gap-8 border-t border-[#ececf0] pt-10 sm:grid-cols-3 sm:gap-10">
              <SummaryField
                label="Project stage"
                value={setupSnapshot.stage || "Not selected"}
                hint="Pulled from your setup answers."
              />
              <SummaryField
                label="AI tools in use"
                value={formatAiToolsList(setupSnapshot.aiTools)}
                hint="We default the checklist tab to your selection. Every tool still receives the same files."
              />
              <SummaryField
                label="Top guardrails"
                value={formatGuardrails(setupSnapshot.aiAvoid)}
                hint="Also written into your workflow file for your assistant to follow."
              />
            </div>

            <div className="mt-10 rounded-lg border border-[#e5e7eb] bg-[#fafafa] px-5 py-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
              <div className="min-w-0">
                <p className="m-0 text-[#0f0f12] font-semibold" style={{ fontSize: "14px" }}>
                  Next action
                </p>
                <p className="m-0 mt-1 text-[#5c5c6b] leading-snug" style={{ fontSize: "13px" }}>
                  Copy into the assistant you use. Start with the workflow file, attach project context on new threads, and refresh{" "}
                  <span className="font-mono text-[12px] text-[#17171c]">PROGRESS_HANDOFF.md</span> after big decisions so instructions do not go
                  stale.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 sm:mt-0 sm:shrink-0">
                <CopySetupButton files={files} fileName="AI_WORKFLOW.md" />
                <CopySetupButton files={files} fileName="PROJECT_CONTEXT.md" variant="secondary" />
              </div>
            </div>

            <UseInAiToolSection files={files} defaultTab={defaultAiToolTab(setupSnapshot.aiTools)} className="mt-14" />
          </div>
        </section>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          <SetupPackagePanel files={files} />
          <ChatPanel setupData={setupSnapshot} />
        </div>
      </main>
    </div>
  );
}

function HeroOutcomeLine({ setup, fileCount }: { setup: SetupData; fileCount: number }) {
  const primary = setup.projectTypes[0];
  const stage = setup.stage;
  let scope = "This package matches what you entered.";
  if (primary && stage) {
    scope = `This package matches ${primary} at ${stage}.`;
  } else if (primary) {
    scope = `This package matches ${primary}.`;
  } else if (stage) {
    scope = `This package matches your ${stage} stage.`;
  }

  return (
    <p className="m-0 mt-4 max-w-2xl text-[#3f3f4a] leading-relaxed" style={{ fontSize: "15px" }}>
      {scope} {fileCount} markdown files are below. Check the snapshot, then use{" "}
      <strong className="font-semibold">Next action</strong> and the tool checklist to paste into your assistant.
    </p>
  );
}

function collectSetupSnapshot(data: SetupData): SetupData {
  return {
    ...data,
    projectTypes: [...data.projectTypes],
    stack: [...data.stack],
    aiTools: [...data.aiTools],
    aiHelp: [...data.aiHelp],
    aiAvoid: [...data.aiAvoid],
    learningSupport: [...data.learningSupport],
    repoAnalysis: data.repoAnalysis
      ? {
          ...data.repoAnalysis,
          folderStructure: [...data.repoAnalysis.folderStructure],
          matchedFiles: [...data.repoAnalysis.matchedFiles],
          fileExcerpts: (data.repoAnalysis.fileExcerpts ?? []).map((file) => ({ ...file })),
          missingSignals: [...data.repoAnalysis.missingSignals],
          warnings: [...data.repoAnalysis.warnings],
        }
      : null,
  };
}

function formatAiToolsList(aiTools: string[]) {
  const cleaned = aiTools.filter((t) => t !== "Not sure yet" && t !== "Other tools");
  if (cleaned.length === 0) {
    return "Not selected yet";
  }
  return cleaned.join(", ");
}

function formatGuardrails(aiAvoid: string[]) {
  if (aiAvoid.length === 0) {
    return "Ask clarifying questions; stay inside scope; verify before big changes.";
  }
  return aiAvoid.slice(0, 3).join(" · ");
}

function SummaryField({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0">
      <p className="m-0 text-[#8b8b99] tracking-[0.08em] uppercase" style={{ fontSize: "10px", fontWeight: 700 }}>
        {label}
      </p>
      <p className="m-0 mt-2 text-[#0f0f12] leading-snug" style={{ fontSize: "15px", fontWeight: 600 }}>
        {value}
      </p>
      <p className="m-0 mt-2 text-[#8b8b99] leading-snug" style={{ fontSize: "12px" }}>
        {hint}
      </p>
    </div>
  );
}

function CopySetupButton({
  files,
  fileName,
  variant = "primary",
}: {
  files: GeneratedFile[];
  fileName: string;
  variant?: "primary" | "secondary";
}) {
  const [copied, setCopied] = useState(false);
  const file = files.find((f) => f.name === fileName);

  const onClick = async () => {
    if (!file) {
      return;
    }
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const base =
    variant === "primary"
      ? "bg-[#17171c] text-white border-transparent hover:bg-[#2a2a32]"
      : "bg-white text-[#17171c] border-[#d6d6dc] hover:border-[#17171c]";

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={!file}
      className={`inline-flex items-center justify-center rounded-md border px-4 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-40 ${base}`}
    >
      {copied ? `Copied ${fileName}` : `Copy ${fileName}`}
    </button>
  );
}

function defaultAiToolTab(aiTools: string[]): AiToolTab {
  const picks = aiTools.filter((tool) => tool !== "Not sure yet" && tool !== "Other tools");
  if (picks.includes("Gemini")) {
    return "gemini";
  }
  if (picks.includes("Codex")) {
    return "codex";
  }
  if (picks.includes("ChatGPT")) {
    return "chatgpt";
  }
  if (picks.includes("Claude")) {
    return "claude";
  }
  if (picks.includes("GitHub Copilot")) {
    return "copilot";
  }
  if (picks.includes("Cursor")) {
    return "cursor";
  }
  return "chatgpt";
}

function UseInAiToolSection({
  files,
  defaultTab,
  className,
}: {
  files: GeneratedFile[];
  defaultTab: AiToolTab;
  className?: string;
}) {
  const [tab, setTab] = useState<AiToolTab>(defaultTab);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);
  const wf = files.find((f) => f.name === "AI_WORKFLOW.md");
  const ctx = files.find((f) => f.name === "PROJECT_CONTEXT.md");
  const ho = files.find((f) => f.name === "PROGRESS_HANDOFF.md");
  const names = {
    workflow: wf?.name ?? "AI_WORKFLOW.md",
    context: ctx?.name ?? "PROJECT_CONTEXT.md",
    handoff: ho?.name ?? "PROGRESS_HANDOFF.md",
  };

  const guide = getToolGuide(tab, names);

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="m-0 text-[#0f0f12]" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "20px", fontWeight: 600 }}>
            Use this in your AI tool
          </h2>
          <p className="m-0 mt-2 max-w-xl text-[#5c5c6b]" style={{ fontSize: "13px", lineHeight: 1.55 }}>
            Same files for every product below. Only the paste target and habit change. Pick a tab for a short checklist.
          </p>
        </div>
      </div>

      <div
        className="mt-6 inline-flex w-full max-w-full flex-wrap gap-1 rounded-lg border border-[#e5e7eb] bg-[#f4f4f2] p-1"
        role="tablist"
        aria-label="AI tool"
      >
        {(
          [
            ["cursor", "Cursor"],
            ["claude", "Claude"],
            ["chatgpt", "ChatGPT"],
            ["codex", "Codex"],
            ["gemini", "Gemini"],
            ["copilot", "GitHub Copilot"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-[40px] flex-1 rounded-md px-3 text-[13px] font-semibold transition-colors sm:flex-none sm:px-4 ${
              tab === id ? "bg-white text-[#0f0f12] shadow-sm" : "text-[#5c5c6b] hover:text-[#17171c]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="m-0 mt-2 max-w-3xl text-[#8b8b99]" style={{ fontSize: "11px", lineHeight: 1.45 }}>
        Other UIs (Windsurf, JetBrains AI, local models): choose the tab that matches where you keep long rules, or use ChatGPT if you only have
        a custom instructions box.
      </p>

      <div className="mt-6 rounded-lg border border-[#e5e7eb] bg-white px-5 py-6 sm:px-6">
        <p className="m-0 text-[#8b8b99] tracking-[0.08em] uppercase" style={{ fontSize: "10px", fontWeight: 700 }}>
          Where it lives
        </p>
        <p className="m-0 mt-2 text-[#0f0f12] leading-relaxed" style={{ fontSize: "14px" }}>
          {guide.where}
        </p>

        <div className="mt-6 border-t border-[#f0f0f3] pt-6">
          <p className="m-0 text-[#8b8b99] tracking-[0.08em] uppercase" style={{ fontSize: "10px", fontWeight: 700 }}>
            Checklist
          </p>
          <ol className="m-0 mt-3 list-decimal space-y-3 pl-5 text-[#3f3f4a]" style={{ fontSize: "14px", lineHeight: 1.55 }}>
            {guide.steps.map((step) => (
              <li key={step} className="pl-1">
                {step}
              </li>
            ))}
          </ol>
        </div>

        <p className="m-0 mt-6 text-[#8b8b99] leading-snug" style={{ fontSize: "12px" }}>
          Files referenced:{" "}
          <span className="font-mono text-[#17171c]">{names.workflow}</span>,{" "}
          <span className="font-mono text-[#17171c]">{names.context}</span>,{" "}
          <span className="font-mono text-[#17171c]">{names.handoff}</span>.
        </p>
      </div>
    </div>
  );
}

function getToolGuide(
  tab: AiToolTab,
  names: { workflow: string; context: string; handoff: string },
): { where: string; steps: string[] } {
  const wf = names.workflow;
  const ctx = names.context;
  const ho = names.handoff;

  if (tab === "cursor") {
    return {
      where: `Cursor project rules (for example .cursor/rules or Cursor Rules for AI). Keep ${ctx} where you can @-mention it in chat.`,
      steps: [
        `Paste ${wf} into project rules so every thread inherits the same workflow and avoid-list.`,
        `Start chats with ${ctx} attached or @-mentioned so answers match your stage, stack, and guardrails.`,
        `After big decisions or implementation shifts, update ${ho} so the next session does not inherit stale truth.`,
      ],
    };
  }

  if (tab === "claude") {
    return {
      where: `Claude Projects: project knowledge and instructions (or your team pinned context area).`,
      steps: [
        `Put ${wf} in project instructions so every thread inherits the same workflow and guardrails.`,
        `Add ${ctx} as project knowledge, or paste it at the start of a thread if you are not using Projects.`,
        `Refresh ${ho} when scope or facts change so continuity stays honest.`,
      ],
    };
  }

  if (tab === "chatgpt") {
    return {
      where: `ChatGPT custom instructions and/or Project or GPT knowledge (watch length limits; split across messages if needed).`,
      steps: [
        `Move the stable rules from ${wf} into instructions or project knowledge (keep it short if limits apply).`,
        `Paste ${ctx} at the start of important threads, or store it as project knowledge when available.`,
        `Use ${ho} as the anchor for what changed, what is still true, and what is next between sessions.`,
      ],
    };
  }

  if (tab === "codex") {
    return {
      where: `Codex in VS Code or another supported editor: long-lived rules usually live in a workspace file such as AGENTS.md, or your team standard instructions doc next to the repo root.`,
      steps: [
        `Commit ${wf} into that instructions file (or split into sections if your policy prefers smaller files).`,
        `Keep ${ctx} easy to paste into the agent panel when you start a new task.`,
        `Update ${ho} after meaningful changes so the agent is not following yesterday's plan.`,
      ],
    };
  }

  if (tab === "gemini") {
    return {
      where: `Gemini in the IDE (Gemini Code Assist) or the Gemini app: use the surface your workspace provides for project or workspace instructions, or a root-level markdown file your team treats as the AI contract.`,
      steps: [
        `Load ${wf} into that long-lived instructions area so Gemini picks up workflow and avoid-list consistently.`,
        `Attach or paste ${ctx} when you open a new task so answers stay grounded.`,
        `Touch ${ho} after decisions or releases so docs, code, and prompts do not silently disagree.`,
      ],
    };
  }

  if (tab === "copilot") {
    return {
      where: `GitHub Copilot: repository instructions (often .github/copilot-instructions.md) plus PR text when you need extra context.`,
      steps: [
        `Add ${wf} to Copilot instructions so inline suggestions respect your workflow and avoid-list.`,
        `Point humans to ${ctx} from the README; paste key sections into PRs when Copilot needs full context.`,
        `Update ${ho} after merges or planning shifts so reviewers and Copilot share the same current truth.`,
      ],
    };
  }

  const _exhaustive: never = tab;
  throw new Error(`Unhandled AI tool tab: ${_exhaustive}`);
}

type RepoAnalysis = NonNullable<SetupData["repoAnalysis"]>;

function RepoSignalsStrip({ analysis }: { analysis: RepoAnalysis }) {
  const items = [
    { label: "README", ok: analysis.hasReadme },
    { label: "Docs", ok: analysis.hasDocs },
    { label: "AI notes", ok: analysis.hasAIInstructions },
    { label: "Decisions", ok: analysis.hasDecisionLog },
    { label: "Tests", ok: analysis.hasTestSetup },
  ];
  const score = items.filter((i) => i.ok).length;

  return (
    <div className="bg-[#071829] text-white">
      <div className="mx-auto max-w-6xl px-6 py-3.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0" style={{ fontSize: "13px" }}>
            <span className="text-[#9db4d0]">Public repository review</span>
            <span className="text-[#4f6b86]"> · </span>
            <a href={analysis.repoUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#ff7759] no-underline hover:underline">
              {analysis.fullName}
            </a>
            <span className="text-[#4f6b86]"> · </span>
            <span className="text-[#c9d6e6]">
              {analysis.defaultBranch} · {analysis.matchedFiles.length} matched files
            </span>
            {analysis.warnings.length > 0 ? (
              <>
                <span className="text-[#4f6b86]"> · </span>
                <span className="text-[#ffb199]" style={{ fontSize: "12px" }}>
                  {analysis.warnings.length} signal gap{analysis.warnings.length > 1 ? "s" : ""} (see generated files)
                </span>
              </>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#c9d6e6]">
            <span className="font-semibold text-white">
              Signals {score}/{items.length}
            </span>
            <span className="hidden sm:inline text-[#4f6b86]">|</span>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {items.map((it) => (
                <span key={it.label} className={it.ok ? "text-[#7de8cc]" : "text-[#ffb199]"}>
                  {it.label} {it.ok ? "✓" : "✗"}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SetupPackagePanel({ files }: { files: GeneratedFile[] }) {
  const [activeFile, setActiveFile] = useState(0);
  const [activeTab, setActiveTab] = useState<"content" | "explanation">("explanation");
  const [copied, setCopied] = useState(false);

  const file = files[activeFile];

  const handleCopy = () => {
    navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadAll = () => {
    files.forEach((f) => {
      const blob = new Blob([f.content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.name;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="flex-1 lg:basis-0 min-h-0 flex flex-col bg-white border-r border-[#e5e7eb] overflow-hidden">
      <div className="px-5 pt-4 pb-0 border-b border-[#e5e7eb] shrink-0">
        <div className="flex items-center justify-between mb-3 gap-4">
          <div className="min-w-0">
            <h2
              className="text-[#17171c] m-0"
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "17px", fontWeight: 600 }}
            >
              Your setup package
            </h2>
            <p className="text-[#93939f] m-0 mt-0.5" style={{ fontSize: "13px" }}>
              Inspect, explain, and copy generated markdown
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadAll}
            className="shrink-0 flex items-center gap-1.5 bg-[#17171c] text-white border-none cursor-pointer hover:bg-[#2a2a30] transition-colors rounded-md"
            style={{ fontSize: "12px", fontWeight: 600, padding: "8px 14px" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1V8M6 8L3.5 5.5M6 8L8.5 5.5M1 10H11" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Download all
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-px" style={{ scrollbarWidth: "none" }}>
          {files.map((f, i) => (
            <button
              key={f.name}
              type="button"
              onClick={() => {
                setActiveFile(i);
                setActiveTab("explanation");
              }}
              className="flex items-center gap-1.5 whitespace-nowrap border-none cursor-pointer transition-colors flex-shrink-0"
              style={{
                fontSize: "12px",
                fontWeight: activeFile === i ? 600 : 500,
                padding: "8px 12px",
                borderRadius: "6px 6px 0 0",
                background: activeFile === i ? "white" : "transparent",
                color: activeFile === i ? "#17171c" : "#75758a",
                borderBottom: activeFile === i ? "2px solid #17171c" : "2px solid transparent",
              }}
            >
              <span style={{ fontSize: "14px" }}>{f.icon}</span>
              {f.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 px-5 py-3 border-b border-[#f2f2f2] bg-[#fafafa] shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("explanation")}
          className="border-none bg-transparent cursor-pointer transition-colors"
          style={{
            fontSize: "13px",
            fontWeight: activeTab === "explanation" ? 600 : 500,
            color: activeTab === "explanation" ? "#17171c" : "#75758a",
            borderBottom: activeTab === "explanation" ? "1.5px solid #17171c" : "1.5px solid transparent",
            padding: "2px 0",
          }}
        >
          Explanation
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("content")}
          className="border-none bg-transparent cursor-pointer transition-colors"
          style={{
            fontSize: "13px",
            fontWeight: activeTab === "content" ? 600 : 500,
            color: activeTab === "content" ? "#17171c" : "#75758a",
            borderBottom: activeTab === "content" ? "1.5px solid #17171c" : "1.5px solid transparent",
            padding: "2px 0",
          }}
        >
          File content
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="ml-auto flex items-center gap-1.5 border border-[#e5e7eb] bg-white rounded-md cursor-pointer hover:border-[#17171c] transition-colors"
          style={{ fontSize: "12px", color: "#75758a", padding: "5px 12px", fontWeight: 600 }}
        >
          {copied ? "Copied" : "Copy file"}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "explanation" ? (
          <div className="p-6">
            <div className="bg-[#f1f5ff] border border-[#dce6fd] rounded-lg p-5 mb-6" style={{ borderLeft: "3px solid #1863dc" }}>
              <p className="text-[#1863dc] m-0" style={{ fontSize: "13px", fontWeight: 700, marginBottom: "6px" }}>
                Why this file matters
              </p>
              <p className="text-[#212121] m-0" style={{ fontSize: "14px", lineHeight: 1.6 }}>
                {file.explanation}
              </p>
            </div>

            <div className="bg-[#f8f8f7] border border-[#e5e7eb] rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[#e5e7eb]">
                <span style={{ fontSize: "14px" }}>{file.icon}</span>
                <span className="text-[#17171c]" style={{ fontSize: "13px", fontWeight: 700, fontFamily: "monospace" }}>
                  {file.name}
                </span>
              </div>
              <pre
                className="overflow-x-auto text-[#212121] m-0"
                style={{
                  fontSize: "12px",
                  lineHeight: 1.7,
                  padding: "16px",
                  fontFamily: "monospace",
                  maxHeight: "340px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {file.content.slice(0, 800)}
                {file.content.length > 800 ? (
                  <span className="text-[#93939f]">
                    {"\n"}... {file.content.length - 800} more characters. Open "File content" for the full file.
                  </span>
                ) : null}
              </pre>
            </div>
          </div>
        ) : (
          <pre
            className="overflow-auto m-0 text-[#212121]"
            style={{
              fontSize: "12.5px",
              lineHeight: 1.7,
              padding: "24px",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              background: "white",
            }}
          >
            {file.content}
          </pre>
        )}
      </div>
    </div>
  );
}

function ChatPanel({ setupData }: { setupData: SetupData }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: buildAssistantGreeting(setupData),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await getChatResponse(text.trim(), setupData, messages);
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  const suggestions = getSuggestions(setupData);

  return (
    <div className="flex-1 lg:basis-0 flex flex-col bg-[#fafafa] min-h-0 overflow-hidden">
      <div className="px-5 py-3 border-b border-[#e5e7eb] bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-white border border-[#e8e8ec] flex items-center justify-center shrink-0">
            <ClearStackLogoMark size={12} withChip={false} />
          </div>
          <div className="min-w-0">
            <p className="m-0 text-[#17171c]" style={{ fontSize: "14px", fontWeight: 700 }}>
              Setup Coach
            </p>
            <p className="m-0 text-[#93939f]" style={{ fontSize: "12px" }}>
              Helps with setup, scope, docs, AI instructions, and public repo review. Not full app implementation.
            </p>
          </div>
          <div className="ml-auto w-2 h-2 rounded-full bg-[#28c840]" title="Online" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" ? (
              <div className="w-6 h-6 rounded-full bg-white border border-[#e8e8ec] flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <ClearStackLogoMark size={10} withChip={false} />
              </div>
            ) : null}
            <div
              className="max-w-[85%] rounded-2xl"
              style={{
                padding: "10px 14px",
                background: msg.role === "user" ? "#17171c" : "white",
                color: msg.role === "user" ? "white" : "#212121",
                border: msg.role === "assistant" ? "1px solid #e5e7eb" : "none",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
              }}
            >
              <MarkdownText content={msg.content} isUser={msg.role === "user"} />
            </div>
          </div>
        ))}

        {isTyping ? (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-full bg-[#17171c] flex items-center justify-center flex-shrink-0 mr-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-[#ff7759]" />
            </div>
            <div
              className="bg-white border border-[#e5e7eb] rounded-2xl px-4 py-3 flex items-center gap-1"
              style={{ borderRadius: "4px 18px 18px 18px" }}
            >
              {[0, 1, 2].map((j) => (
                <div
                  key={j}
                  className="w-1.5 h-1.5 rounded-full bg-[#93939f] bounce-dot"
                  style={{ animationDelay: `${j * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 1 ? (
        <div className="px-5 pb-3 shrink-0">
          <p className="text-[#93939f] mb-2" style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
            Suggested questions
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 4).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void sendMessage(s)}
                className="border border-[#e5e7eb] bg-white rounded-md text-[#212121] cursor-pointer hover:border-[#17171c] transition-colors text-left"
                style={{ fontSize: "12px", padding: "6px 12px", fontWeight: 600 }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="px-5 pb-5 pt-2 shrink-0">
        <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden focus-within:border-[#17171c] transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about scope, setup files, AI prompting, learning checkpoints..."
            rows={1}
            className="w-full resize-none outline-none border-none bg-transparent text-[#212121] placeholder-[#93939f]"
            style={{
              fontSize: "14px",
              padding: "12px 16px 4px",
              maxHeight: "120px",
              lineHeight: 1.5,
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <span className="text-[#93939f]" style={{ fontSize: "11px" }}>
              Enter to send · Shift+Enter for newline
            </span>
            <button
              type="button"
              onClick={() => void sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="flex items-center justify-center w-7 h-7 rounded-full border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ background: input.trim() ? "#17171c" : "#e5e7eb" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 6H11M11 6L7 2M11 6L7 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildAssistantGreeting(data: SetupData): string {
  const startType =
    data.startType === "new"
      ? "New project"
      : data.startType === "existing"
        ? "Existing project"
        : "Not selected";

  const repoLine = data.repoAnalysis
    ? `Repo scan: **${data.repoAnalysis.fullName}** (${data.repoAnalysis.matchedFiles.length} matched files).`
    : data.repoUrl
      ? "Repo URL saved; scan not completed."
      : "No repository linked.";

  return [
    "Your setup package is ready. I am **Setup Coach**. I use the answers you saved from **/setup**, not inventing project facts.",
    "",
    "**What I do:** scope, prompts, setup files, documentation habits, learning checkpoints, and public repo review signals.",
    "**What I do not do:** write or ship full application code. Use your coding assistant for implementation.",
    "",
    "- **Starting point:** " + startType,
    "- **Stage:** " + (data.stage || "Not selected"),
    "- **Stack:** " + (data.stack.length ? data.stack.join(", ") : "Not selected"),
    "- **AI tools:** " + (data.aiTools.length ? data.aiTools.join(", ") : "Not selected"),
    "- **Guardrails:** " + (data.aiAvoid.length ? data.aiAvoid.slice(0, 4).join(", ") : "Use the generated avoid-list"),
    "",
    repoLine,
    "",
    "Ask how to paste files into your tools, tighten a prompt, or what to log after a big decision.",
  ].join("\n");
}

function MarkdownText({ content, isUser }: { content: string; isUser: boolean }) {
  const lines = content.split("\n");

  return (
    <div style={{ fontSize: "14px", lineHeight: 1.6 }}>
      {lines.map((line, i) => {
        const displayLine = line.startsWith("- ") || line.startsWith("* ") ? line.slice(2) : line;

        const parts = displayLine.split(/(`[^`]+`)/g);
        const rendered = parts.map((part, j) => {
          if (part.startsWith("`") && part.endsWith("`")) {
            return (
              <code
                key={j}
                className="rounded px-1"
                style={{
                  fontFamily: "monospace",
                  fontSize: "12px",
                  background: isUser ? "rgba(255,255,255,0.15)" : "#f0f0f0",
                  color: isUser ? "white" : "#17171c",
                }}
              >
                {part.slice(1, -1)}
              </code>
            );
          }
          const boldSplit = part.split(/(\*\*[^*]+\*\*)/g);
          return boldSplit.map((b, k) => {
            if (b.startsWith("**") && b.endsWith("**")) {
              return (
                <strong key={k} style={{ fontWeight: 700 }}>
                  {b.slice(2, -2)}
                </strong>
              );
            }
            return b;
          });
        });

        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex items-start gap-2" style={{ marginTop: i > 0 ? "4px" : 0 }}>
              <span style={{ color: isUser ? "rgba(255,255,255,0.6)" : "#93939f", flexShrink: 0, marginTop: "2px" }}>•</span>
              <span>{rendered}</span>
            </div>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <p key={i} style={{ fontWeight: 700, margin: i > 0 ? "12px 0 4px" : "0 0 4px" }}>
              {line.slice(4)}
            </p>
          );
        }
        if (line === "") {
          return <div key={i} style={{ height: "8px" }} />;
        }
        return (
          <span key={i} style={{ display: "block" }}>
            {rendered}
          </span>
        );
      })}
    </div>
  );
}
