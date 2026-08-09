"use client";

import { useState, useRef, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQA } from "@/lib/teaching/use-qa";
import { AgentLoopPanel } from "@/components/teaching/agent-loop-panel";
import { useQAHistory } from "@/lib/teaching/use-qa-history";
import { trackLearningEvent } from "@/lib/teaching/track-event";
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
    pointId: string | null;
    title: string;
    chapter: string;
    section?: string;
    chapterNumber?: number;
    sectionNumber?: number;
    pageReference?: string;
    textExcerpt?: string;
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
  const [activeTab, setActiveTab] = useState("chat");
  const [input, setInput] = useState("");
  const [teachingStyle, setTeachingStyle] = useState("引导启发型");
  const [depth, setDepth] = useState("标准");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "你好！我是你的具身智能课程 AI 答疑教师。有什么课程相关的问题都可以问我会优先从教材原文中为你找到答案。",
      time: "刚刚",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isLoading, error, askQuestion } = useQA();
  const { records: historyRecords, total: historyTotal, isLoading: historyLoading, fetchHistory } = useQAHistory();
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeTab === "history") {
      void fetchHistory();
    }
  }, [activeTab, fetchHistory]);

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
    const result = await askQuestion(question, { teachingStyle, depth });
    if (result) {
      const sourcePointId = result.sources?.[0]?.pointId ?? "";
      if (sourcePointId) {
        void trackLearningEvent({
          eventType: "qa",
          knowledgeNodeId: sourcePointId,
          score: null,
          durationMinutes: 5,
          payload: { question },
        });
      }
      const aiMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: result.answer,
        sources: result.sources,
        relatedPoints: result.relatedPoints,
        time: "刚刚",
      };
      setMessages((prev) => [...prev, aiMsg]);
      // Refresh history in background so the history tab stays up-to-date
      void fetchHistory();
    }
  };

  const handleReAsk = (question: string) => {
    setInput(question);
    setActiveTab("chat");
  };

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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="chat">
                <Bot className="mr-2 h-4 w-4" />
                智能问答
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="mr-2 h-4 w-4" />
                历史问答
              </TabsTrigger>
            <TabsTrigger value="loop">
                <Sparkles className="mr-2 h-4 w-4" />
                协同闭环
              </TabsTrigger>
            </TabsList>
            <TabsContent value="chat">
          <Card className="flex flex-col overflow-hidden" style={{ height: '750px' }}>
            <CardHeader className="shrink-0">
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
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {/* Messages */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-4">
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
                        className={`max-w-[80%] overflow-y-auto rounded-lg p-3 ${
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
                            <div className="space-y-2">
                              {msg.sources.map((source, idx) => (
                                <details key={idx} className="group rounded-md bg-background/50 px-2 py-1.5">
                                  <summary className="flex cursor-pointer items-center gap-2 text-xs">
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-[10px] font-medium text-blue-600">
                                      {idx + 1}
                                    </span>
                                    <FileText className="h-3 w-3 shrink-0 text-blue-500" />
                                    <span className="font-medium truncate">{source.title}</span>
                                    <span className="text-muted-foreground shrink-0">•</span>
                                    <span className="text-muted-foreground truncate">{source.chapter}</span>
                                    {source.pageReference && (
                                      <>
                                        <span className="text-muted-foreground shrink-0">•</span>
                                        <span className="text-muted-foreground shrink-0">{source.pageReference}</span>
                                      </>
                                    )}
                                  </summary>
                                  {(source.section || source.chapterNumber || source.sectionNumber) && (
                                    <p className="text-xs text-muted-foreground">
                                      {source.chapterNumber ? `第${source.chapterNumber}章` : null}{source.sectionNumber ? `第${source.sectionNumber}节` : null}{(source.chapterNumber || source.sectionNumber) ? ` ${source.chapter}` : source.chapter}
                                      {source.section ? ` · ${source.section}` : null}
                                    </p>
                                  )}
                                  {source.textExcerpt && (
                                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                      {source.textExcerpt}
                                    </p>
                                  )}
                                </details>
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
              </div>

              {/* Input */}
              <div className="mt-4 flex shrink-0 gap-2">
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
            </TabsContent>
            <TabsContent value="history">
              <Card className="flex flex-col overflow-hidden" style={{ height: '750px' }}>
                <CardHeader className="shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        历史问答
                      </CardTitle>
                      <CardDescription>
                        共 {historyTotal} 条提问记录
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => void fetchHistory()}>
                      刷新
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="flex-1 min-h-0 overflow-y-auto pr-4">
                    <div className="space-y-3">
                      {historyLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : historyRecords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <History className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">暂无历史问答记录</p>
                          <p className="text-xs text-muted-foreground mt-1">提问后记录将自动保存</p>
                        </div>
                      ) : (
                        historyRecords.map((record) => (
                          <div key={record.id} className="rounded-lg border p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium line-clamp-2">{record.question}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(record.createdAt).toLocaleString("zh-CN")}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedHistoryId(expandedHistoryId === record.id ? null : record.id)}
                              >
                                {expandedHistoryId === record.id ? "收起" : "展开"}
                              </Button>
                            </div>
                            {expandedHistoryId === record.id && (
                              <div className="mt-3 space-y-3">
                                <div className="rounded-md bg-muted p-3">
                                  <p className="text-sm whitespace-pre-wrap">{record.answer}</p>
                                </div>
                                {record.sources.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">
                                      教材溯源（{record.sources.length} 条）
                                    </p>
                                    <div className="space-y-1">
                                      {record.sources.map((source, sidx) => (
                                        <div key={sidx} className="flex items-center gap-2 text-xs">
                                          <FileText className="h-3 w-3 shrink-0 text-blue-500" />
                                          <span className="font-medium truncate">{source.title}</span>
                                          <span className="text-muted-foreground shrink-0">·</span>
                                          <span className="text-muted-foreground truncate">{source.chapter}</span>
                                          {source.pageReference ? (
                                            <span className="text-muted-foreground shrink-0">{source.pageReference}</span>
                                          ) : null}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {record.relatedPoints.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">相关知识点：</p>
                                    <div className="flex flex-wrap gap-1">
                                      {record.relatedPoints.map((point) => (
                                        <Badge key={point.id} variant="secondary" className="text-xs">
                                          {point.title}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <Button variant="outline" size="sm" onClick={() => handleReAsk(record.question)}>
                                  <Sparkles className="mr-1 h-3 w-3" />
                                  重新提问
                                </Button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          <TabsContent value="loop">
              <AgentLoopPanel defaultQuestion={input} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <Card className="shrink-0">
            <CardHeader>
              <CardTitle className="text-base">答疑偏好</CardTitle>
              <CardDescription>答疑 Agent 会根据你的画像调整表达方式</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={teachingStyle} onChange={(event) => setTeachingStyle(event.target.value)}>
                <option>严谨型</option>
                <option>引导启发型</option>
                <option>通俗易懂型</option>
                <option>实践应用型</option>
              </select>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={depth} onChange={(event) => setDepth(event.target.value)}>
                <option>基础</option>
                <option>标准</option>
                <option>深入</option>
              </select>
            </CardContent>
          </Card>

          {/* Suggested Questions */}
          <Card className="flex flex-1 min-h-0 flex-col overflow-hidden">
            <CardHeader className="shrink-0">
              <CardTitle className="text-base">常见问题</CardTitle>
              <CardDescription>点击快速提问</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 space-y-2 overflow-y-auto">
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

          {/* Knowledge Stats */}
          <Card className="shrink-0">
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
