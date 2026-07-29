"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Upload,
  FileText,
  Video,
  Link2,
  Plus,
  Settings,
  ChevronRight,
  Layers,
  Network,
} from "lucide-react";

const chapters = [
  {
    id: 1,
    title: "第一章 具身智能概述",
    sections: 4,
    knowledgePoints: 12,
    status: "completed",
  },
  {
    id: 2,
    title: "第二章 环境感知与世界模型",
    sections: 5,
    knowledgePoints: 18,
    status: "in-progress",
  },
  {
    id: 3,
    title: "第三章 任务规划与决策",
    sections: 4,
    knowledgePoints: 15,
    status: "in-progress",
  },
  {
    id: 4,
    title: "第四章 运动规划与控制",
    sections: 6,
    knowledgePoints: 22,
    status: "pending",
  },
  {
    id: 5,
    title: "第五章 多智能体协同",
    sections: 4,
    knowledgePoints: 16,
    status: "pending",
  },
];

const resources = [
  { name: "具身智能导论.pdf", type: "pdf", size: "15.2 MB" },
  { name: "环境感知PPT.pptx", type: "ppt", size: "28.5 MB" },
  { name: "路径规划算法详解.pdf", type: "pdf", size: "8.7 MB" },
  { name: "实验指导手册.pdf", type: "pdf", size: "5.3 MB" },
];

export default function TeacherCoursePage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">课程建设</h1>
          <p className="text-muted-foreground">
            管理课程知识体系、上传教学资源、构建知识图谱
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            课程设置
          </Button>
          <Button size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            新增章节
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Course Structure */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              课程知识结构
            </CardTitle>
            <CardDescription>
              五级知识体系：章节 → 小节 → 知识点 → 关联知识点 → 易错点
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className="flex items-center gap-4 rounded-lg border p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold">
                    {chapter.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">{chapter.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {chapter.sections} 小节 · {chapter.knowledgePoints} 个知识点
                    </p>
                  </div>
                  <Badge
                    variant={
                      chapter.status === "completed"
                        ? "default"
                        : chapter.status === "in-progress"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {chapter.status === "completed"
                      ? "已完成"
                      : chapter.status === "in-progress"
                      ? "进行中"
                      : "待建设"}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Graph Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              知识图谱
            </CardTitle>
            <CardDescription>课程知识关联网络</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed bg-muted/50">
              <div className="text-center">
                <Network className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  已构建 83 个知识点节点
                </p>
                <p className="text-xs text-muted-foreground">
                  156 条关联关系
                </p>
                <Button variant="outline" size="sm" className="mt-3">
                  查看完整图谱
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resource Upload */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  教学资源管理
                </CardTitle>
                <CardDescription>
                  上传教材、PPT、视频等课程资源，AI自动解析并构建知识索引
                </CardDescription>
              </div>
              <Button size="sm">
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                上传资源
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {resources.map((resource, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    {resource.type === "pdf" ? (
                      <FileText className="h-4 w-4 text-primary" />
                    ) : resource.type === "ppt" ? (
                      <FileText className="h-4 w-4 text-amber-600" />
                    ) : (
                      <Video className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{resource.name}</p>
                    <p className="text-xs text-muted-foreground">{resource.size}</p>
                  </div>
                  <Badge variant="outline">已索引</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start gap-2">
              <Plus className="h-4 w-4" />
              添加知识点
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Link2 className="h-4 w-4" />
              建立关联关系
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <Network className="h-4 w-4" />
              生成知识图谱
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2">
              <FileText className="h-4 w-4" />
              导出课程大纲
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}