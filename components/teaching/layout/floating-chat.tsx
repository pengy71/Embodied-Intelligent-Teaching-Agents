"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Send,
  X,
  FileText,
  MessageCircle,
  Minimize2,
} from "lucide-react";

interface FloatingChatProps {
  className?: string;
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  source?: string;
  time: string;
}

export function FloatingChat({ className }: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "assistant",
      content:
        "你好！我是你的AI答疑教师，学习中有任何问题随时问我，我会从教材原文中为你找到答案。",
      time: "刚刚",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = {
      id: Date.now(),
      role: "user",
      content: input,
      time: "刚刚",
    };
    setMessages((prev) => [...prev, userMsg]);
    const question = input;
    setInput("");

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: `关于"${question}"：\n\n这是课程中的核心概念。根据教材原文，该知识点是理解后续内容的关键基础。\n\n建议你结合当前章节的案例进一步理解，如果还有疑问可以继续问我。`,
        source: "教材 P.45",
        time: "刚刚",
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 1200);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-primary/40 ${className}`}
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">1</span>
      </button>
    );
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:scale-105 ${className}`}
      >
        <Bot className="h-5 w-5" />
        <span className="text-sm font-medium">AI 答疑</span>
        <span className="ml-1 h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">AI 答疑教师</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              在线 · 教材溯源
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <Avatar className="h-7 w-7 shrink-0">
                {msg.role === "user" ? (
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">你</AvatarFallback>
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground p-0">
                    <Bot className="h-3.5 w-3.5" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : ""}`}>
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                </div>
                {msg.source && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <FileText className="h-2.5 w-2.5" />
                    {msg.source}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Suggested Questions */}
      {messages.length <= 2 && (
        <div className="border-t px-4 py-2">
          <p className="mb-1.5 text-[10px] text-muted-foreground">快速提问</p>
          <div className="flex flex-wrap gap-1.5">
            {["这个概念和前面学的有什么关系？", "能给个例子吗？", "考试常考吗？"].map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-foreground"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入问题，AI 从教材原文回答..."
            className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

