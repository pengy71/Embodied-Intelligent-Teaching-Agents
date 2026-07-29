"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { EChart } from "@/components/teaching/charts/echart";
import { courseStructure, courseMaterials, graphData } from "@/lib/mock-data";
import {
  Search,
  Network,
  FileText,
  File,
  FileCheck,
  BookMarked,
  Download,
  Bookmark,
  ChevronRight,
  BookOpen,
  Star,
  Trash2,
  Sparkles,
} from "lucide-react";

export default function StudentResourcesPage() {
  const [activeTab, setActiveTab] = useState("knowledge-base");

  const graphOption = {
    tooltip: { formatter: (p: { data?: { label?: string } }) => p.data?.label || "" },
    series: [
      {
        type: "graph",
        layout: "force",
        roam: true,
        label: { show: true, position: "right", color: "#1e293b", fontSize: 12, fontWeight: 500 },
        edgeSymbol: ["none", "arrow"],
        edgeSymbolSize: [0, 8],
        force: { repulsion: 300, edgeLength: 120, gravity: 0.1 },
        data: graphData.nodes.map((n) => ({
          name: n.id,
          label: n.label,
          itemStyle: { color: n.color },
          symbolSize: n.group === 0 ? 40 : 28,
        })),
        links: graphData.edges.map((e) => ({ source: e.source, target: e.target })),
        lineStyle: { color: "#cbd5e1", width: 1.5, curveness: 0.1 },
        emphasis: { focus: "adjacency", lineStyle: { width: 3, color: "#3b82f6" } },
      },
    ],
  };

  const fileTypeIcon = (type: string) => {
    switch (type) {
      case "教材": return <FileText className="h-5 w-5 text-blue-500" />;
      case "课件": return <File className="h-5 w-5 text-amber-500" />;
      case "实验文档": return <FileCheck className="h-5 w-5 text-emerald-500" />;
      case "论文": return <BookMarked className="h-5 w-5 text-purple-500" />;
      default: return <File className="h-5 w-5 text-slate-400" />;
    }
  };

  const favorites = [
    { id: 1, type: "知识点", title: "卡尔曼滤波原理", chapter: "第一章 1.2", desc: "状态估计的核心算法" },
    { id: 2, type: "资料", title: "具身智能导论.pdf", chapter: "教材", desc: "教材 P.45-P.52" },
    { id: 3, type: "问答", title: "RRT算法为什么是概率完备的？", chapter: "第三章 3.2", desc: "AI 答疑记录" },
    { id: 4, type: "知识点", title: "PPO 算法 clip 机制", chapter: "第四章 4.1", desc: "限制策略更新幅度" },
  ];

  return (
    <div>
      <PageHeader title="学习资源" description="课程知识库、知识图谱、课程资料与个人收藏" />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-[520px]">
          <TabsTrigger value="knowledge-base">课程知识库</TabsTrigger>
          <TabsTrigger value="knowledge-graph">知识图谱</TabsTrigger>
          <TabsTrigger value="materials">课程资料</TabsTrigger>
          <TabsTrigger value="favorites">我的收藏</TabsTrigger>
        </TabsList>

        {/* Knowledge Base */}
        <TabsContent value="knowledge-base" className="mt-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索知识点..." className="pl-9" />
            </div>
          </div>

          <div className="space-y-4">
            {courseStructure.chapters.map((chapter) => (
              <Card key={chapter.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BookOpen className="h-4 w-4 text-primary" />
                      {chapter.title}
                    </CardTitle>
                    <Badge variant="outline">{chapter.sections.reduce((a, s) => a + s.points.length, 0)} 知识点</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {chapter.sections.map((section) => (
                    <div key={section.id} className="rounded-lg border bg-muted/20 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{section.title}</span>
                      </div>
                      <div className="grid gap-2 pl-6 sm:grid-cols-2 lg:grid-cols-3">
                        {section.points.map((point) => (
                          <button
                            key={point.id}
                            className="group flex items-center gap-2 rounded-md border bg-card p-2.5 text-left transition-base hover:border-primary/30 hover:shadow-sm"
                          >
                            <div className={`h-2 w-2 shrink-0 rounded-full ${point.mastery >= 70 ? "bg-success" : point.mastery >= 40 ? "bg-warning" : "bg-destructive"}`} />
                            <span className="flex-1 truncate text-sm">{point.title}</span>
                            <Bookmark className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Knowledge Graph */}
        <TabsContent value="knowledge-graph" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Network className="h-4 w-4 text-primary" />
                    具身智能知识图谱
                  </CardTitle>
                  <CardDescription>查看知识点之间的关联关系，构建完整知识网络</CardDescription>
                </div>
                <Badge variant="secondary">点击节点查看详情</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <EChart option={graphOption as any} style={{ height: "500px" }} />
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { name: "环境感知", color: "#3b82f6", count: 3 },
                  { name: "世界模型", color: "#8b5cf6", count: 2 },
                  { name: "任务规划", color: "#ec4899", count: 3 },
                  { name: "多智能体", color: "#10b981", count: 2 },
                ].map((m) => (
                  <div key={m.name} className="flex items-center gap-2 rounded-lg border p-2.5">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{m.count} 节点</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Course Materials */}
        <TabsContent value="materials" className="mt-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="搜索资料..." className="pl-9" />
            </div>
          </div>

          {(() => {
            const typeOrder = ["教材", "课件", "实验文档", "论文"];
            const typeConfig: Record<string, { label: string; color: string; icon: typeof FileText }> = {
              "教材": { label: "教材", color: "text-blue-600 bg-blue-50 border-blue-200", icon: FileText },
              "课件": { label: "课件", color: "text-amber-600 bg-amber-50 border-amber-200", icon: File },
              "实验文档": { label: "实验文档", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: FileCheck },
              "论文": { label: "论文", color: "text-purple-600 bg-purple-50 border-purple-200", icon: BookMarked },
            };
            const groups: Record<string, typeof courseMaterials> = {};
            courseMaterials.forEach((m) => {
              if (!groups[m.type]) groups[m.type] = [];
              groups[m.type].push(m);
            });
            const sortedTypes = Object.keys(groups).sort((a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b));
            return (
              <div className="space-y-6">
                {sortedTypes.map((type) => {
                  const config = typeConfig[type] || { label: type, color: "text-slate-600 bg-slate-50 border-slate-200", icon: File };
                  const items = groups[type];
                  return (
                    <div key={type}>
                      <div className="mb-3 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-semibold ${config.color}`}>
                          <config.icon className="h-3.5 w-3.5" />
                          {config.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{items.length} 份</span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((m) => (
                          <Card key={m.id} className="transition-base hover:border-primary/30 hover:shadow-md">
                            <CardContent className="p-4">
                              <div className="mb-3 flex items-start justify-between">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                  {fileTypeIcon(m.type)}
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Bookmark className="h-4 w-4" />
                                </Button>
                              </div>
                              <h4 className="mb-1 truncate text-sm font-medium">{m.name}</h4>
                              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{m.size}</span>
                                <span>·</span>
                                <span>{m.pages}页</span>
                              </div>
                              <Button variant="outline" size="sm" className="w-full">
                                <Download className="mr-1.5 h-3.5 w-3.5" />
                                查看 / 下载
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </TabsContent>

        {/* Favorites */}
        <TabsContent value="favorites" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-4 w-4 text-amber-500" />
                我的收藏
              </CardTitle>
              <CardDescription>收藏的重要知识点、学习资料及问答内容</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {favorites.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-lg border p-3 transition-base hover:bg-accent/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                    {f.type === "知识点" && <BookOpen className="h-5 w-5 text-amber-600" />}
                    {f.type === "资料" && <FileText className="h-5 w-5 text-amber-600" />}
                    {f.type === "问答" && <FileCheck className="h-5 w-5 text-amber-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{f.title}</span>
                      <Badge variant="secondary" className="text-xs">{f.type}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {f.chapter} · {f.desc}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">查看</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

