import {
  GEMINI_REASONING_MODEL
} from "../../shared/reasoning";
import type {
  GeminiConnectionTestResult
} from "../../shared/reasoning";

export const PANEL_TRACE_REASONING_SYSTEM_PROMPT = `You are the reasoning engine for Panel Trace.

Answer questions about manga/comic pages using ONLY the supplied images.

Do not invent information.
Do not reference future events.
If evidence is insufficient, say so.
Cite every factual claim using the supplied evidence IDs.
Keep answers concise and easy to read in a narrow chat panel.
Use short paragraphs instead of bullet points.
Avoid commas.
Place each evidence reference on its own line.
Do not put a period after an evidence reference.
Return Markdown.`;

const PANEL_TRACE_QUERY_PLANNER_PROMPT = `You are the retrieval query planner for Panel Trace.

You will receive a user question and the current manga/comic page image.
Write a concise retrieval query that will help find relevant earlier pages.
Use only the user question and current page image.
Do not answer the user.
Do not reference future events.
Avoid commas.
Return only the retrieval query text.`;

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

type GeminiPart =
  | {
      text: string;
    }
  | {
      inline_data: {
        mime_type: string;
        data: string;
      };
    };

const isReasoningDevLoggingEnabled = (): boolean =>
  process.env.NODE_ENV === "development" || Boolean(process.env.ELECTRON_RENDERER_URL);

const devLogReasoning = (step: string, details: unknown): void => {
  if (!isReasoningDevLoggingEnabled()) {
    return;
  }

  console.debug(`[Panel Trace reasoning] ${step}`, details);
};

const redactGeminiParts = (parts: GeminiPart[]): GeminiPart[] =>
  parts.map((part) => {
    if ("text" in part) {
      return part;
    }

    return {
      inline_data: {
        mime_type: part.inline_data.mime_type,
        data: `<redacted image base64 ${part.inline_data.data.length} chars>`
      }
    };
  });

export interface ReasoningPageImage {
  id: string;
  label: string;
  pdfName: string;
  pageNumber: number;
  mimeType: string;
  imageBase64: string;
}

export interface ReasoningProviderQueryRequest {
  question: string;
  currentPage: ReasoningPageImage;
}

export interface ReasoningProviderAnswerRequest extends ReasoningProviderQueryRequest {
  retrievalQuery: string;
  chatHistory: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  evidencePages: ReasoningPageImage[];
}

export interface ReasoningProvider {
  displayName: string;
  craftRetrievalQuery(request: ReasoningProviderQueryRequest): Promise<string>;
  answer(request: ReasoningProviderAnswerRequest): Promise<string>;
}

export class GeminiReasoningError extends Error {
  code: GeminiConnectionTestResult["code"];

  constructor(code: GeminiConnectionTestResult["code"], message: string) {
    super(message);
    this.name = "GeminiReasoningError";
    this.code = code;
  }
}

const requestTimeoutMs = 60_000;
const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_REASONING_MODEL}:generateContent`;

const formatChatHistory = (
  chatHistory: ReasoningProviderAnswerRequest["chatHistory"]
): string => {
  if (chatHistory.length === 0) {
    return "- No earlier chat history.";
  }

  return chatHistory
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n\n");
};

const getTextFromResponse = (response: GeminiGenerateContentResponse): string => {
  const text = response.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter((partText): partText is string => Boolean(partText))
    .join("")
    .trim();

  if (!text) {
    throw new GeminiReasoningError(
      "provider-error",
      "Gemini returned an empty response."
    );
  }

  return text;
};

const classifyGeminiStatus = async (response: Response): Promise<GeminiReasoningError> => {
  let message = "Gemini rejected the request.";

  try {
    const parsedResponse = (await response.json()) as GeminiGenerateContentResponse;
    message = parsedResponse.error?.message ?? message;
  } catch {
    // Keep the generic message when Gemini returns a non-JSON error body.
  }

  if (response.status === 400 || response.status === 401 || response.status === 403) {
    return new GeminiReasoningError("invalid-key", message);
  }

  if (response.status === 429) {
    return new GeminiReasoningError("rate-limited", "Gemini is rate limited.");
  }

  return new GeminiReasoningError(
    response.status >= 500 ? "provider-error" : "provider-error",
    message
  );
};

const requestGemini = async (
  apiKey: string,
  systemPrompt: string,
  parts: GeminiPart[],
  stepName: string
): Promise<string> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    devLogReasoning(`${stepName}: request`, {
      model: GEMINI_REASONING_MODEL,
      endpoint: geminiEndpoint,
      systemPrompt,
      parts: redactGeminiParts(parts)
    });

    const response = await fetch(geminiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: "user",
            parts
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw await classifyGeminiStatus(response);
    }

    const text = getTextFromResponse((await response.json()) as GeminiGenerateContentResponse);
    devLogReasoning(`${stepName}: response`, { text });

    return text;
  } catch (error) {
    if (error instanceof GeminiReasoningError) {
      throw error;
    }

    throw new GeminiReasoningError("network-error", "Gemini connection failed.");
  } finally {
    clearTimeout(timeout);
  }
};

const imagePart = (page: ReasoningPageImage): GeminiPart => ({
  inline_data: {
    mime_type: page.mimeType,
    data: page.imageBase64
  }
});

const pageMetadata = (page: ReasoningPageImage): string =>
  `${page.id}: ${page.label}`;

export class GeminiReasoningProvider implements ReasoningProvider {
  displayName = "Gemini";
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  craftRetrievalQuery(request: ReasoningProviderQueryRequest): Promise<string> {
    return requestGemini(
      this.apiKey,
      PANEL_TRACE_QUERY_PLANNER_PROMPT,
      [
        {
          text: `Question:\n${request.question}\n\nCurrent page metadata:\n- ${pageMetadata(
            request.currentPage
          )}`
        },
        imagePart(request.currentPage)
      ],
      "query planning"
    );
  }

  answer(request: ReasoningProviderAnswerRequest): Promise<string> {
    const evidenceMetadata = request.evidencePages.length
      ? request.evidencePages.map((page) => `- ${pageMetadata(page)}`).join("\n")
      : "- No earlier evidence pages were retrieved.";
    const parts: GeminiPart[] = [
      {
        text: `Question:
${request.question}

Retrieval query used:
${request.retrievalQuery}

Chat history for this interaction:
${formatChatHistory(request.chatHistory)}

Current page metadata:
- ${pageMetadata(request.currentPage)}

Retrieved spoiler-safe evidence metadata:
${evidenceMetadata}

Write in short paragraphs.
Do not use bullet points.
Avoid commas.
Place each evidence reference on its own line.
Do not put a period after an evidence reference.
When citing retrieved evidence, use Markdown links exactly like [${request.evidencePages[0]?.label ?? "Evidence Page"}](evidence:${request.evidencePages[0]?.id ?? "evidence-1"}).
When citing the current page, use [${request.currentPage.label}](evidence:${request.currentPage.id}).
Only use evidence: links for IDs listed above.
Do not cite file names or image data directly.`
      },
      imagePart(request.currentPage),
      ...request.evidencePages.flatMap((page): GeminiPart[] => [
        {
          text: `Evidence image ${pageMetadata(page)}`
        },
        imagePart(page)
      ])
    ];

    return requestGemini(
      this.apiKey,
      PANEL_TRACE_REASONING_SYSTEM_PROMPT,
      parts,
      "answer generation"
    );
  }
}

export const testGeminiConnection = async (
  apiKey: string
): Promise<GeminiConnectionTestResult> => {
  const trimmedApiKey = apiKey.trim();

  if (!trimmedApiKey) {
    return {
      ok: false,
      code: "missing-key",
      message: "Gemini API key is not configured."
    };
  }

  try {
    await requestGemini(
      trimmedApiKey,
      "Return the word OK.",
      [
        {
          text: "Return the word OK."
        }
      ],
      "Gemini connection test"
    );

    return {
      ok: true,
      code: "success",
      message: "Connection successful"
    };
  } catch (error) {
    if (error instanceof GeminiReasoningError) {
      if (error.code === "invalid-key") {
        return { ok: false, code: "invalid-key", message: "Invalid API key" };
      }

      if (error.code === "rate-limited") {
        return { ok: false, code: "rate-limited", message: "Rate limited" };
      }

      if (error.code === "network-error") {
        return { ok: false, code: "network-error", message: "Connection failed" };
      }
    }

    return { ok: false, code: "provider-error", message: "Connection failed" };
  }
};
