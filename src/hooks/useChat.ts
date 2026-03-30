"use client";

import { useState, useCallback, useRef } from "react";

export interface ToolCallInfo {
  id: string;
  name: string;
  label: string;
  input?: Record<string, unknown>;
  result?: unknown;
  status: "running" | "completed" | "error";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  toolCalls?: ToolCallInfo[];
}

interface UseChatOptions {
  workerId: string;
}

export function useChat({ workerId }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      setError(null);

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: content.trim(),
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", createdAt: new Date(), toolCalls: [] },
      ]);

      try {
        abortControllerRef.current = new AbortController();

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workerId,
            message: content.trim(),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || `HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);

              switch (parsed.type) {
                case "text":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + parsed.content }
                        : m
                    )
                  );
                  break;

                case "tool_start":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            toolCalls: [
                              ...(m.toolCalls || []),
                              {
                                id: parsed.id,
                                name: parsed.name,
                                label: parsed.label || parsed.name,
                                status: "running" as const,
                              },
                            ],
                          }
                        : m
                    )
                  );
                  break;

                case "tool_result":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            toolCalls: (m.toolCalls || []).map((tc) =>
                              tc.id === parsed.id
                                ? { ...tc, result: parsed.result, status: "completed" as const }
                                : tc
                            ),
                          }
                        : m
                    )
                  );
                  break;

                case "tool_error":
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? {
                            ...m,
                            toolCalls: (m.toolCalls || []).map((tc) =>
                              tc.id === parsed.id
                                ? { ...tc, result: parsed.error, status: "error" as const }
                                : tc
                            ),
                          }
                        : m
                    )
                  );
                  break;

                case "error":
                  setError(parsed.content);
                  break;
              }
            } catch {
              // Not JSON - treat as raw text
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + data }
                    : m
                )
              );
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const errorMessage =
          err instanceof Error ? err.message : "Something went wrong";
        setError(errorMessage);
        setMessages((prev) =>
          prev.filter((m) => m.id !== assistantId || m.content.length > 0)
        );
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [workerId, isLoading]
  );

  const stopGenerating = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    stopGenerating,
    clearMessages,
  };
}
