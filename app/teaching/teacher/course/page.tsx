'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Network,
  Upload,
  Plus,
  Settings,
  FileText,
  Layers,
  GitBranch,
  AlertTriangle,
  Box,
  Loader2,
} from 'lucide-react';
import { KnowledgeStructure } from '@/components/teaching/knowledge/knowledge-structure';
import { useKnowledge } from '@/lib/teaching/use-knowledge';
import { useResources } from '@/lib/teaching/use-resources';
import type { ResourceStatus } from '@/lib/teaching/store';

const KnowledgeGraph = dynamic(
  () => import('@/components/teaching/knowledge/knowledge-graph').then((m) => m.KnowledgeGraph),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[600px] items-center justify-center rounded-xl border bg-slate-50/50 text-sm text-muted-foreground">
        知识图谱加载中…
      </div>
    ),
  },
);

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: ResourceStatus }) {
  if (status === 'ready') {
    return (
      <Badge variant="outline" className="text-emerald-600 border-emerald-200">
        已索引
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge variant="outline" className="text-destructive border-destructive/30">
        失败
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-amber-600 border-amber-200">
      解析中
    </Badge>
  );
}

export default function TeacherCoursePage() {
  const { doc, stats, revalidate: revalidateKnowledge } = useKnowledge();
  const { resources, revalidate: revalidateResources } = useResources();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const statCards = [
    { label: '章节', value: stats?.chapterCount ?? 0, icon: BookOpen },
    { label: '小节', value: stats?.sectionCount ?? 0, icon: Layers },
    { label: '知识点', value: stats?.pointCount ?? 0, icon: Box },
    { label: '关联关系', value: stats?.relationCount ?? 0, icon: GitBranch },
    { label: '易错点', value: stats?.mistakeCount ?? 0, icon: AlertTriangle },
  ];

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/teaching/resources', { method: 'POST', body: fd });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `上传失败 (${res.status})`);
      }
      await revalidateResources();
      void revalidateKnowledge();
    } catch (e) {
      alert(e instanceof Error ? e.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">课程建设</h1>
          <p className="text-muted-foreground">管理课程知识体系、构建知识图谱、上传教学资源</p>
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-2xl font-bold leading-none">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="structure" className="w-full">
        <TabsList>
          <TabsTrigger value="structure" className="gap-1.5">
            <Layers className="h-4 w-4" />
            知识结构
          </TabsTrigger>
          <TabsTrigger value="graph" className="gap-1.5">
            <Network className="h-4 w-4" />
            知识图谱
          </TabsTrigger>
          <TabsTrigger value="resources" className="gap-1.5">
            <Upload className="h-4 w-4" />
            教学资源
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="mt-4">
          <KnowledgeStructure doc={doc ?? undefined} />
        </TabsContent>

        <TabsContent value="graph" className="mt-4">
          <KnowledgeGraph doc={doc ?? undefined} />
        </TabsContent>

        <TabsContent value="resources" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    教学资源管理
                  </CardTitle>
                  <CardDescription>
                    上传教材/PPT/文档，AI 自动解析并抽取知识点、构建知识索引（MVP 支持 PDF/TXT/MD）
                  </CardDescription>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,.markdown,.json,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(file);
                    e.target.value = '';
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {uploading ? '上传中…' : '上传资源'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {resources && resources.length > 0 ? (
                  resources.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(r.size)}
                          {r.pointIds.length > 0 ? ` · ${r.pointIds.length} 知识点` : ''}
                        </p>
                        {r.error && <p className="text-xs text-destructive truncate">{r.error}</p>}
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))
                ) : (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    暂无资源，上传 PDF/TXT/MD 后将自动抽取知识点并同步到知识库与图谱
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
