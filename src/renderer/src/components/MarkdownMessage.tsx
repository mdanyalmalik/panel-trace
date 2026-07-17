import type { ReactNode } from "react";

import type { RetrievalResult } from "../../../shared/retrieval";

interface MarkdownMessageProps {
  markdown: string;
  evidence: RetrievalResult[];
  onOpenEvidence: (result: RetrievalResult) => void;
}

const linkPattern = /\[([^\]]+)\]\((evidence:[^)]+)\)/g;
const boldPattern = /\*\*([^*]+)\*\*/g;

const renderTextWithBold = (text: string, keyPrefix: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  boldPattern.lastIndex = 0;

  while ((match = boldPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    nodes.push(
      <strong key={`${keyPrefix}-bold-${match.index}`} className="font-bold text-zinc-50">
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
};

const renderInlineMarkdown = (
  text: string,
  evidenceById: Map<string, RetrievalResult>,
  onOpenEvidence: (result: RetrievalResult) => void,
  keyPrefix: string
): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  linkPattern.lastIndex = 0;

  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        ...renderTextWithBold(text.slice(lastIndex, match.index), `${keyPrefix}-${lastIndex}`)
      );
    }

    const label = match[1];
    const evidenceId = match[2].replace(/^evidence:/, "");
    const evidenceResult = evidenceById.get(evidenceId);

    if (evidenceResult) {
      nodes.push(
        <button
          key={`${keyPrefix}-link-${match.index}`}
          className="inline cursor-pointer rounded-md px-1 font-bold text-teal-200 underline decoration-teal-300/40 underline-offset-4 transition duration-75 hover:bg-teal-400/10 hover:text-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-300/30"
          type="button"
          onClick={() => onOpenEvidence(evidenceResult)}
        >
          {label}
        </button>
      );
    } else {
      nodes.push(label);
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(...renderTextWithBold(text.slice(lastIndex), `${keyPrefix}-${lastIndex}`));
  }

  return nodes;
};

const MarkdownMessage = ({
  markdown,
  evidence,
  onOpenEvidence
}: MarkdownMessageProps): JSX.Element => {
  const evidenceById = new Map(evidence.map((result) => [result.id, result]));
  const blocks = markdown
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return <p>No answer returned.</p>;
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        if (/^#{1,3}\s/.test(block)) {
          const headingText = block.replace(/^#{1,3}\s+/, "");

          return (
            <h3 key={`block-${blockIndex}`} className="text-sm font-black text-zinc-50">
              {renderInlineMarkdown(
                headingText,
                evidenceById,
                onOpenEvidence,
                `heading-${blockIndex}`
              )}
            </h3>
          );
        }

        const lines = block.split("\n").map((line) => line.trim());
        const isList = lines.every((line) => /^[-*]\s+/.test(line));

        if (isList) {
          return (
            <ul key={`block-${blockIndex}`} className="list-disc space-y-1 pl-5">
              {lines.map((line, lineIndex) => (
                <li key={`block-${blockIndex}-line-${lineIndex}`}>
                  {renderInlineMarkdown(
                    line.replace(/^[-*]\s+/, ""),
                    evidenceById,
                    onOpenEvidence,
                    `list-${blockIndex}-${lineIndex}`
                  )}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`block-${blockIndex}`} className="whitespace-pre-wrap">
            {renderInlineMarkdown(
              block,
              evidenceById,
              onOpenEvidence,
              `paragraph-${blockIndex}`
            )}
          </p>
        );
      })}
    </div>
  );
};

export default MarkdownMessage;
