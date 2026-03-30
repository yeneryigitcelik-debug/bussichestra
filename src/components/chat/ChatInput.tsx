"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, onStop, isLoading, placeholder = "Type a message..." }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    if (value.trim() && !isLoading) {
      onSend(value);
      setValue("");
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-card/80 p-4 backdrop-blur-sm">
      <div className="flex items-end gap-2">
        <div className="flex-1 rounded-xl border border-border bg-background ring-1 ring-white/5 transition-all focus-within:ring-2 focus-within:ring-purple-500/30">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none max-h-[200px]"
            disabled={isLoading}
          />
        </div>
        {isLoading ? (
          <button
            onClick={onStop}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/90 text-white shadow-lg shadow-destructive/20 transition-all hover:bg-destructive"
          >
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all",
              value.trim()
                ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40"
                : "bg-secondary text-muted-foreground"
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
