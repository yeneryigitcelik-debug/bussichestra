"use client";

import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import { WorkerAvatar } from "@/components/workers/WorkerAvatar";
import { ToolResultCard } from "@/components/chat/ToolResultCard";
import type { ChatMessage } from "@/hooks/useChat";

interface MessageBubbleProps {
  message: ChatMessage;
  workerName?: string;
  workerId?: string;
}

export function MessageBubble({ message, workerName, workerId }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;

  return (
    <div className={cn("flex gap-3 px-4 py-3 animate-fade-in-up", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      {isUser ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 ring-1 ring-white/10">
          <User className="h-4 w-4 text-purple-300" />
        </div>
      ) : (
        <WorkerAvatar workerId={workerId || "unknown"} size="md" showStatus={false} />
      )}

      {/* Message */}
      <div className={cn("flex max-w-[75%] flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
        <span className="text-[11px] font-medium text-muted-foreground">
          {isUser ? "You" : workerName || "Assistant"}
        </span>

        {/* Tool calls */}
        {hasToolCalls && (
          <div className="w-full space-y-1.5 mb-1">
            {message.toolCalls!.map((tc) => (
              <ToolResultCard key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Text content */}
        {(message.content || !hasToolCalls) && (
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
              isUser
                ? "rounded-br-md bg-gradient-to-br from-purple-600/90 to-purple-700/90 text-white ring-1 ring-purple-500/20"
                : "rounded-bl-md bg-secondary/80 text-foreground ring-1 ring-white/5"
            )}
          >
            {message.content || (
              <span className="inline-flex items-center gap-1.5 py-1">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
