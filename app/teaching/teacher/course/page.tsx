'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { KnowledgeStructure } from '@/components/teaching/knowledge/knowledge-structure';
import { useKnowledge } from '@/lib/teaching/use-knowledge';
import {
  BookOpen,
  Layers,
  Box,
  GitBranch,
  AlertTriangle,
  Network,
  Upload,
  FileText,
  Plus,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';

const KnowledgeGraph = dynamic(
  () => import('@/components/teaching/knowledge/knowledge-graph').then((m) => m.KnowledgeGraph),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[400px] items-center justify-center rounded-xl border bg-slate-50/50 text-sm text-muted-foreground">
        知识图谱加载中…
      </div>
    ),
  },
);

interface ResourceItem {
  id: string;
  name: string;
  type: string;
  size: number;
  status: string;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: '待解析',
  parsing: '解析中',
  extracting: '抽取中',
  ready: '已索引',
  failed: '失败',
};

export default function TeacherCoursePage() {
  const { doc, stats, revalidate } = useKnowledge();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const [chapterId, setChapterId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [sectionTitle, setSectionTitle] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [prerequisites, setPrerequisites] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [delChapterId, setDelChapterId] = useState('');
  const [delSectionId, setDelSectionId] = useState('');
  const [delPointId, setDelPointId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const fetchResources = async () => {
    setResourcesLoading(true);
    try {
      const res = await fetch('/api/teaching/resources', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setResources(Array.isArray(json?.resources) ? json.resources : []);
      }
    } catch {
      // ignore: resources are best-effort
    } finally {
      setResourcesLoading(false);
    }
  };

  useEffect(() => {
    void fetchResources();
  }, []);

  const chapters = doc?.chapters ?? [];
  const selectedChapter = chapters.find((c) => c.id === chapterId);
  const sections = selectedChapter?.sections ?? [];
  const isNewSection = sectionId === '__new__';
  const delSections = chapters.find((c) => c.id === delChapterId)?.sections ?? [];
  const delPoints = delSections.find((s) => s.id === delSectionId)?.points ?? [];
  const selectedDelPoint = delPoints.find((p) => p.id === delPointId);

  const handleAddPoint = async () => {
    setSubmitMsg(null);
    if (!chapterId || !title.trim()) {
      setSubmitMsg('请选择章节并填写知识点标题');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/teaching/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId,
          sectionId: isNewSection ? '' : sectionId,
          sectionTitle: isNewSection ? sectionTitle.trim() : '',
          title: title.trim(),
          summary: summary.trim(),
          prerequisites: prerequisites
            .split(/[,，]/)
            .map((s) => s.trim())
            .filter(Boolean),
          related: [],
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? '新增知识点失败');
      }
      setTitle('');
      setSummary('');
      setPrerequisites('');
      setSectionTitle('');
      setSubmitMsg('知识点已添加，知识图谱已更新');
      await revalidate();
    } catch (e) {
      setSubmitMsg(e instanceof Error ? e.message : '新增知识点失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePoint = async (pointId: string) => {
    setDeleteMsg(null);
    setDeletingId(pointId);
    try {
      const res = await fetch('/api/teaching/knowledge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pointId }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? '删除知识点失败');
      }
      setDeleteMsg('知识点已删除，知识图谱与结构已更新');
      await revalidate();
    } catch (e) {
      setDeleteMsg(e instanceof Error ? e.message : '删除知识点失败');
    } finally {
      setDeletingId(null);
    }
  };
  const handleUpload = async (file: File) => {
    setUploadMsg(null);
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/teaching/resources', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error ?? '上传资源失败');
      }
      setUploadMsg(`已上传：${json.resource?.name ?? file.name}，AI 正在后台解析并构建知识索引`);
      await fetchResources();
    } catch (e) {
      setUploadMsg(e instanceof Error ? e.message : '上传资源失败');
    } finally {
      setUploading(false);
    }
  };

  const statCards = [
    { label: '章节', value: stats?.chapterCount ?? 0, icon: BookOpen },
    { label: '小节', value: stats?.sectionCount ?? 0, icon: Layers },
    { label: '知识点', value: stats?.pointCount ?? 0, icon: Box },
    { label: '关联关系', value: stats?.relationCount ?? 0, icon: GitBranch },
    { label: '易错点', value: stats?.mistakeCount ?? 0, icon: AlertTriangle },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">课程建设</h1>
          <p className="text-muted-foreground">管理课程知识体系、上传教学资源、构建知识图谱</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void revalidate();
            void fetchResources();
          }}
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          刷新
        </Button>
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
          <TabsTrigger value="structure">课程知识结构</TabsTrigger>
          <TabsTrigger value="graph">知识图谱</TabsTrigger>
          <TabsTrigger value="adjust">课程建设调整</TabsTrigger>
          <TabsTrigger value="resources">教学资源管理</TabsTrigger>
        </TabsList>
        <TabsContent value="structure" className="mt-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                课程知识结构
              </CardTitle>
              <CardDescription>
                五级知识体系：章节 -&gt; 小节 -&gt; 知识点 -&gt; 关联知识点 -&gt; 易错点
              </CardDescription>
            </CardHeader>
            <CardContent>
              <KnowledgeStructure doc={doc ?? undefined} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="graph" className="mt-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5 text-primary" />
                知识图谱
              </CardTitle>
              <CardDescription>课程知识关联网络（实时派生）</CardDescription>
            </CardHeader>
            <CardContent>
              <KnowledgeGraph doc={doc ?? undefined} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="adjust" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  添加知识点
                </CardTitle>
                <CardDescription>
                  新增的知识点会实时进入知识图谱，供学生答疑、练习与学情分析使用
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">所属章节</label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={chapterId}
                      onChange={(e) => {
                        setChapterId(e.target.value);
                        setSectionId('');
                      }}
                    >
                      <option value="">请选择章节</option>
                      {chapters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">所属小节</label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={sectionId}
                      onChange={(e) => setSectionId(e.target.value)}
                      disabled={!chapterId}
                    >
                      <option value="">请选择小节</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                      <option value="__new__">+ 新建小节</option>
                    </select>
                  </div>
                </div>
                {isNewSection && (
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">新小节标题</label>
                    <Input
                      value={sectionTitle}
                      onChange={(e) => setSectionTitle(e.target.value)}
                      placeholder="例如：3.4 阻抗控制"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">知识点标题 *</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="例如：笛卡尔阻抗控制"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">知识摘要</label>
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="一句话描述该知识点的核心内容"
                    rows={2}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    前置知识点 ID（逗号分隔，可选）
                  </label>
                  <Input
                    value={prerequisites}
                    onChange={(e) => setPrerequisites(e.target.value)}
                    placeholder="例如：ch03-2-1, ch03-2-2"
                  />
                </div>
                {submitMsg && (
                  <p
                    className={`text-xs ${submitMsg.includes('失败') || submitMsg.includes('请') ? 'text-destructive' : 'text-success'}`}
                  >
                    {submitMsg}
                  </p>
                )}
                <Button onClick={handleAddPoint} disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-1.5 h-4 w-4" />
                  )}
                  {submitting ? '提交中...' : '添加知识点'}
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="h-5 w-5 text-primary" />
                  已有知识点
                </CardTitle>
                <CardDescription>
                  按章节 / 小节逐级选择知识点后删除，结构与图谱会实时更新
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deleteMsg && <p className="text-xs text-muted-foreground">{deleteMsg}</p>}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">所属章节</label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={delChapterId}
                      onChange={(e) => {
                        setDelChapterId(e.target.value);
                        setDelSectionId('');
                        setDelPointId('');
                      }}
                    >
                      <option value="">请选择章节</option>
                      {chapters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">所属小节</label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={delSectionId}
                      onChange={(e) => {
                        setDelSectionId(e.target.value);
                        setDelPointId('');
                      }}
                      disabled={!delChapterId}
                    >
                      <option value="">请选择小节</option>
                      {delSections.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">知识点</label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={delPointId}
                      onChange={(e) => setDelPointId(e.target.value)}
                      disabled={!delSectionId}
                    >
                      <option value="">请选择知识点</option>
                      {delPoints.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {selectedDelPoint && (
                  <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{selectedDelPoint.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {chapters.find((c) => c.id === delChapterId)?.title} ·{' '}
                        {delSections.find((s) => s.id === delSectionId)?.title}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deletingId === delPointId}
                      onClick={() => void handleDeletePoint(delPointId)}
                    >
                      {deletingId === delPointId ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1.5 h-4 w-4" />
                      )}
                      {deletingId === delPointId ? '删除中...' : '删除该知识点'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="resources" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-primary" />
                    教学资源管理
                  </CardTitle>
                  <CardDescription>
                    上传 PDF / TXT / Markdown 教材文档，AI 自动解析并构建知识索引
                  </CardDescription>
                </div>
                <label className="inline-flex cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.md,.markdown"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUpload(f);
                      e.target.value = '';
                    }}
                  />
                  <span className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
                    {uploading ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {uploading ? '上传中...' : '上传资源'}
                  </span>
                </label>
              </div>
            </CardHeader>
            <CardContent>
              {uploadMsg && (
                <p
                  className={`mb-3 text-xs ${uploadMsg.includes('失败') ? 'text-destructive' : 'text-success'}`}
                >
                  {uploadMsg}
                </p>
              )}
              {resourcesLoading ? (
                <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载中...
                </div>
              ) : resources.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
                  暂无资源，点击右上角上传
                </div>
              ) : (
                <div className="space-y-2">
                  {resources.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(r.size / 1024 / 1024).toFixed(1)} MB · {r.type}
                        </p>
                      </div>
                      <Badge
                        variant={
                          r.status === 'ready'
                            ? 'default'
                            : r.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                        }
                        className="text-xs"
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
