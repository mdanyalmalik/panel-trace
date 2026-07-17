import path from "node:path";

import type {
  ReasoningChatRequest,
  ReasoningChatResponse
} from "../../shared/reasoning";
import type { RetrievalResult } from "../../shared/retrieval";
import { PdfPageRenderer } from "./pdfPageRenderer";
import { GeminiReasoningProvider } from "./reasoningProviders";
import type { ReasoningPageImage } from "./reasoningProviders";
import { searchEarlierPages } from "./retrievalService";
import { loadGeminiApiKey } from "./secureCredentialStore";

const currentPageEvidenceId = "evidence-current";
const pageImageMimeType = "image/jpeg";

const isReasoningDevLoggingEnabled = (): boolean =>
  process.env.NODE_ENV === "development" || Boolean(process.env.ELECTRON_RENDERER_URL);

const devLogReasoning = (step: string, details: unknown): void => {
  if (!isReasoningDevLoggingEnabled()) {
    return;
  }

  console.debug(`[Panel Trace reasoning] ${step}`, details);
};

const dataUrlToBase64 = (dataUrl: string): string => {
  const [, base64Data] = dataUrl.split(",", 2);

  if (!base64Data) {
    throw new Error("Invalid rendered page image.");
  }

  return base64Data;
};

const renderPageImage = async (
  pdfPath: string,
  pageNumber: number,
  renderer: PdfPageRenderer
): Promise<string> => {
  const pageImage = await renderer.renderPageImage(pdfPath, pageNumber);
  return dataUrlToBase64(pageImage.imageDataUrl);
};

const toReasoningPageImage = (
  result: RetrievalResult,
  imageBase64: string
): ReasoningPageImage => ({
  id: result.id,
  label: `${result.pdfName} - Page ${result.pageNumber}`,
  pdfName: result.pdfName,
  pageNumber: result.pageNumber,
  mimeType: pageImageMimeType,
  imageBase64
});

const sanitizeRetrievalQuery = (providerQuery: string, fallbackQuery: string): string => {
  const cleanedQuery = providerQuery
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```[a-z]*|```/gi, ""))
    .split("\n")
    .map((line) => line.replace(/^[-*]\s+/, "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/^["']|["']$/g, "")
    .trim();

  return cleanedQuery || fallbackQuery;
};

const formatEvidenceReferences = (markdown: string): string => {
  const evidenceLinkPattern = /(\[[^\]]+\]\(evidence:[^)]+\))([.,;:])?/g;

  return markdown
    .split("\n")
    .flatMap((line) => {
      const outputLines: string[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      evidenceLinkPattern.lastIndex = 0;

      while ((match = evidenceLinkPattern.exec(line)) !== null) {
        const textBeforeReference = line.slice(lastIndex, match.index).trim();

        if (textBeforeReference) {
          outputLines.push(textBeforeReference);
        }

        outputLines.push(match[1]);
        lastIndex = match.index + match[0].length;
      }

      const textAfterLastReference = line.slice(lastIndex).trim();

      if (textAfterLastReference) {
        outputLines.push(textAfterLastReference);
      }

      return outputLines.length > 0 ? outputLines : [line];
    })
    .join("\n");
};

export class ReasoningService {
  private userDataPath: string;
  private pageRenderer: PdfPageRenderer;

  constructor(userDataPath: string, pageRenderer: PdfPageRenderer) {
    this.userDataPath = userDataPath;
    this.pageRenderer = pageRenderer;
  }

  async answerQuestion(request: ReasoningChatRequest): Promise<ReasoningChatResponse> {
    devLogReasoning("start", {
      query: request.query,
      folderPath: request.folderPath,
      currentPdfPath: request.currentPdfPath,
      currentPage: request.currentPage,
      chatMessageCount: request.messages.length
    });

    const apiKey = await loadGeminiApiKey(this.userDataPath);
    const currentPdfName = path.basename(request.currentPdfPath);
    const currentPageResult: RetrievalResult = {
      id: currentPageEvidenceId,
      pdfPath: request.currentPdfPath,
      pdfName: currentPdfName,
      pageNumber: request.currentPage,
      score: 1
    };
    const currentEvidence = [currentPageResult];

    if (!apiKey) {
      devLogReasoning("missing Gemini API key", {
        currentPdfPath: request.currentPdfPath,
        currentPage: request.currentPage
      });

      return {
        markdown: "Add a Gemini API key in Settings > Reasoning to generate answers.",
        evidence: currentEvidence,
        status: "missing-api-key",
        retrievalStatus: "no-results"
      };
    }

    try {
      const provider = new GeminiReasoningProvider(apiKey);
      const currentImageBase64 = await renderPageImage(
        request.currentPdfPath,
        request.currentPage,
        this.pageRenderer
      );
      const currentPage = toReasoningPageImage(currentPageResult, currentImageBase64);
      devLogReasoning("current page rendered", {
        id: currentPage.id,
        label: currentPage.label,
        mimeType: currentPage.mimeType,
        imageBase64Length: currentPage.imageBase64.length
      });

      const providerRetrievalQuery = await provider.craftRetrievalQuery({
        question: request.query,
        currentPage
      });
      const retrievalQuery = sanitizeRetrievalQuery(providerRetrievalQuery, request.query);
      devLogReasoning("retrieval query crafted", {
        rawProviderQuery: providerRetrievalQuery,
        sanitizedRetrievalQuery: retrievalQuery
      });
      const retrievalResponse = await searchEarlierPages(this.userDataPath, {
        ...request,
        query: retrievalQuery
      });
      devLogReasoning("spoiler-safe retrieval completed", {
        status: retrievalResponse.status,
        message: retrievalResponse.message,
        results: retrievalResponse.results.map((result) => ({
          id: result.id,
          pdfName: result.pdfName,
          pdfPath: result.pdfPath,
          pageNumber: result.pageNumber,
          score: result.score
        }))
      });

      if (
        retrievalResponse.status === "missing-api-key" ||
        retrievalResponse.status === "index-unavailable" ||
        retrievalResponse.status === "error"
      ) {
        return {
          markdown:
            retrievalResponse.message ??
            "Earlier-page retrieval is unavailable, so reasoning was not requested.",
          evidence: currentEvidence,
          status: "retrieval-error",
          retrievalStatus: retrievalResponse.status,
          message: retrievalResponse.message
        };
      }

      const evidencePages = await Promise.all(
        retrievalResponse.results.map(async (result, index) => {
          const imageBase64 = await renderPageImage(
            result.pdfPath,
            result.pageNumber,
            this.pageRenderer
          );

          return toReasoningPageImage(
            {
              ...result,
              id: `evidence-${index + 1}`
            },
            imageBase64
          );
        })
      );
      devLogReasoning("evidence pages rendered", {
        pages: evidencePages.map((page) => ({
          id: page.id,
          label: page.label,
          mimeType: page.mimeType,
          imageBase64Length: page.imageBase64.length
        }))
      });
      const providerEvidence = [
        {
          ...currentPageResult,
          id: currentPage.id
        },
        ...retrievalResponse.results.map((result, index) => ({
          ...result,
          id: `evidence-${index + 1}`
        }))
      ];

      const markdown = await provider.answer({
        question: request.query,
        retrievalQuery,
        chatHistory: request.messages,
        currentPage,
        evidencePages
      });
      const formattedMarkdown = formatEvidenceReferences(markdown);
      devLogReasoning("answer formatted", {
        rawMarkdown: markdown,
        formattedMarkdown
      });

      return {
        markdown: formattedMarkdown,
        evidence: providerEvidence,
        status: "success",
        retrievalStatus: retrievalResponse.status
      };
    } catch (error) {
      console.error("Reasoning provider failed:", error);
      devLogReasoning("error", {
        message: error instanceof Error ? error.message : String(error)
      });

      return {
        markdown:
          error instanceof Error
            ? `Reasoning provider failed: ${error.message}`
            : "Reasoning provider failed.",
        evidence: currentEvidence,
        status: "provider-error",
        retrievalStatus: "error",
        message: error instanceof Error ? error.message : undefined
      };
    }
  }
}
