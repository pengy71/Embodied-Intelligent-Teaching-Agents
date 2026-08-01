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
import { personalStats } from "@/lib/mock-data";
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
} from "lucide-react";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  source?: string;
  time: string;
}

export default function StudentQAPage() {
  const [activeTab, setActiveTab] = useState("quick");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "你好！我是你的具身智能课程 AI 答疑教师。有什么课程相关的问题都可以问我，我会优先从教材原文中为你找到答案。",
      time: "刚刚",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content: input,
      time: "刚刚",
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: Message = {
        id: Date.now() + 1,
        role: "assistant",
        content: `关于"${input}"的问题，让我从教材中为你查找答案。\n\nRRT（Rapidly-exploring Random Tree）是一种基于随机采样的路径规划算法。其核心思想是通过在配置空间中随机采样并逐步扩展搜索树来探索可行路径。\n\n关键特性：\n1. 概率完备性：只要存在可行路径，随着采样次数增加，找到路径的概率趋近于1\n2. 偏好探索：搜索树会倾向探索未到达的区域\n3. 适合高维空间：相比网格法更适合高自由度机器人\n\n建议你接下来学习 PRM 算法作为对比，两者在多查询和单查询场景下各有优势。`,
        source: "教材 P.128 - Motion Planning",
        time: "刚刚",
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 1500);
  };

  const suggestedQuestions = [
    "什么是齐次变换矩阵？",
    "RRT 和 PRM 有什么区别？",
    "PPO 算法的 clip 机制是什么？",
    "世界模型在具身智能中的作用？",
  ];

  return (
    <div>
      <PageHeader title="答疑中心" description="随时向 AI 提问，获取准确、可溯源的课程知识解答" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="quick">快速提问</TabsTrigger>
          <TabsTrigger value="history">历史问答</TabsTrigger>
        </TabsList>

        {/* Quick Question - Chat Interface */}
        <TabsContent value="quick" className="mt-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Chat Area */}
            <Card className="lg:col-span-2 flex flex-col" style={{ height: "600px" }}>
              <CardHeader className="border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">AI 答疑教师</CardTitle>
                    <CardDescription className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" />
                      在线 · 引导启发型
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        {msg.role === "user" ? (
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">你</AvatarFallback>
                        ) : (
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        <div
                          className={`rounded-lg p-3 text-sm ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.content}</p>
                        </div>
                        {msg.source && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            <span>溯源：{msg.source}</span>
                          </div>
                        )}
                        <span className="mt-1 block text-xs text-muted-foreground">{msg.time}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="输入你的问题，AI 会从教材原文中为你找到答案..."
                    className="min-h-[44px] resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button size="icon" className="h-11 w-11 shrink-0" onClick={handleSend}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  按 Enter 发送 · Shift+Enter 换行 · 回答 100% 可溯源教材原文
                </p>
              </div>
            </Card>

            {/* Suggestions Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    推荐问题
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(q)}
                      className="flex w-full items-center gap-2 rounded-md border p-2.5 text-left text-sm transition-base hover:border-primary/30 hover:bg-accent/50"
                    >
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="flex-1">{q}</span>
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI 答疑特性
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { icon: FileText, text: "100% 教材原文溯源", desc: "每个回答标注教材出处" },
                    { icon: BookOpen, text: "知识图谱关联推荐", desc: "推荐前置/后续知识" },
                    { icon: Lightbulb, text: "个性化风格解答", desc: "匹配你的学习偏好" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2 rounded-md p-2">
                      <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{item.text}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* History Q&A */}
        <TabsContent value="history" className="mt-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-9 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="搜索历史问答..."
              />
            </div>
            <Badge variant="secondary">共 {personalStats.recentQA.length} 条记录</Badge>
          </div>

          <div className="space-y-3">
            {personalStats.recentQA.map((qa) => (
              <Card key={qa.id} className="transition-base hover:border-primary/30 hover:shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <History className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">{qa.question}</h4>
                      </div>
                      <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{qa.preview}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {qa.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          溯源：{qa.source}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      查看详情
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

