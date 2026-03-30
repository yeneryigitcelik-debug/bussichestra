"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { useChat } from "@/hooks/useChat";
import { WorkerAvatar } from "@/components/workers/WorkerAvatar";
import { Sparkles } from "lucide-react";

interface ChatWindowProps {
  workerId: string;
  workerName: string;
  workerRole: string;
}

export function ChatWindow({ workerId, workerName, workerRole }: ChatWindowProps) {
  const { messages, isLoading, error, sendMessage, stopGenerating } = useChat({
    workerId,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="flex items-center gap-4 border-b border-border bg-card px-6 py-4">
        <WorkerAvatar workerId={workerId} size="lg" status="active" />
        <div className="flex-1">
          <h2 className="font-semibold">{workerName}</h2>
          <p className="text-xs text-muted-foreground">{workerRole}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1">
          <span className="h-2 w-2 rounded-full bg-green-400 pulse-active" />
          <span className="text-xs font-medium text-green-400">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
            <div className="animate-float">
              <WorkerAvatar workerId={workerId} size="xl" showStatus={false} />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{workerName}</h3>
              <p className="text-sm text-muted-foreground">{workerRole}</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-secondary/80 px-4 py-2 ring-1 ring-white/5">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              <p className="text-xs text-muted-foreground">
                Start a conversation — ask anything about their department
              </p>
            </div>
          </div>
        ) : (
          <div className="py-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                workerName={workerName}
                workerId={workerId}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive ring-1 ring-destructive/20">
          {error}
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onStop={stopGenerating}
        isLoading={isLoading}
        placeholder={`Message ${workerName}...`}
      />
    </div>
  );
}
