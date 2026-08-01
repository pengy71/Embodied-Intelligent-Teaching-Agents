"use client";

import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQA } from "@/lib/teaching/use-qa";
import {
  Send,
  Sparkles,
  Search,
  BookOpen,
  Clock,
  ChevronRight,
  Bot,
  User,
  FileText,
  Lightbulb,
  History,
  Loader2,
} from "lucide-react";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    pointId: string;
    title: string;
    chapter: string;
    pageReference?: string;
  }>;
  relatedPoints?: Array<{
    id: string;
    title: string;
    summary?: string;
    chapter?: string;
  }>;
  time: string;
}

export default function StudentQAPage() {
  const [activeTab, setActiveTab] = useState("quick");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "你好！我是你的具身智能课程 AI 答疑教师。有什么课程相关的问题都可以问我会优先从教材原文中为你找到答案。",
      time: "刚刚",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, error, askQuestion } = useQA();

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: input,
      time: "刚刚",
    };
    setMessages((prev) => [...prev, userMsg]);
    const question = input;
    setInput("");

    // 调用知识库API
    await askQuestion(question);
  };

  // 当API返回数据时，添加到消息列表
  useEffect(() => {
    if (data && !isLoading) {
      const aiMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        relatedPoints: data.relatedPoints,
        time: "刚刚",
      };
      setMessages((prev) => [...prev, aiMsg]);
    }
  }, [data, isLoading]);

  const suggestedQuestions = [
    "什么是齐次变换矩阵？",
    "RRT 和 PRM 有什么区别？",
    "PPO 算法的 clip 机制是什么？",
    "世界模型在具身智能中的作用？",
    "卡尔曼滤波的基本原理？",
    "模仿学习与强化学习的区别？",
  ];

  return (
    <div>
      <PageHeader title="智能答疑" description="基于课程知识库的智能问答，提供教材溯源" />

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Chat Area */}
        <div className="lg:col-span-3">
          <Card className="h-[calc(100vh-200px)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    AI 答疑教师
                  </CardTitle>
                  <CardDescription>基于课程知识库的智能问答</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  知识库已连接
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex h-[calc(100%-120px)] flex-col">
              {/* Messages */}
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <Avatar className="h-8 w-8 bg-primary/10">
                          <AvatarFallback className="text-primary">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        
                        {/* 教材溯源 */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-2">教材溯源：</p>
                            <div className="space-y-1">
                              {msg.sources.map((source, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                  <FileText className="h-3 w-3 text-blue-500" />
                                  <span className="font-medium">{source.title}</span>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="text-muted-foreground">{source.chapter}</span>
                                  {source.pageReference && (
                                    <>
                                      <span className="text-muted-foreground">•</span>
                                      <span className="text-muted-foreground">{source.pageReference}</span>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* 相关知识点 */}
                        {msg.relatedPoints && msg.relatedPoints.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-2">相关知识点：</p>
                            <div className="flex flex-wrap gap-1">
                              {msg.relatedPoints.map((point) => (
                                <Badge key={point.id} variant="secondary" className="text-xs">
                                  {point.title}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <p className="mt-2 text-xs text-muted-foreground">{msg.time}</p>
                      </div>
                      {msg.role === "user" && (
                        <Avatar className="h-8 w-8 bg-primary">
                          <AvatarFallback className="text-primary-foreground">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <Avatar className="h-8 w-8 bg-primary/10">
                        <AvatarFallback className="text-primary">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">正在从知识库中检索...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="mt-4 flex gap-2">
                <Textarea
                  placeholder="输入你的问题..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="min-h-[60px] flex-1"
                  disabled={isLoading}
                />
                <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Suggested Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">常见问题</CardTitle>
              <CardDescription>点击快速提问</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestedQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => {
                    setInput(q);
                  }}
                >
                  <Lightbulb className="mr-2 h-4 w-4 shrink-0 text-amber-500" />
                  <span className="text-sm">{q}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Recent History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">最近提问</CardTitle>
              <CardDescription>查看历史问答</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {messages
                .filter((m) => m.role === "user")
                .slice(-3)
                .reverse()
                .map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-start gap-2 rounded-md border p-2.5 hover:bg-muted/50 cursor-pointer"
                    onClick={() => setInput(msg.content)}
                  >
                    <History className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <span className="text-sm line-clamp-2">{msg.content}</span>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Knowledge Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">知识库状态</CardTitle>
              <CardDescription>课程知识覆盖</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">知识章节</span>
                <span className="font-medium">17 章</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">知识要点</span>
                <span className="font-medium">120+ 个</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">关联关系</span>
                <span className="font-medium">200+ 条</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">易错点</span>
                <span className="font-medium">15 个</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
