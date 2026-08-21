'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KnowledgeStructure } from '@/components/teaching/knowledge/knowledge-structure';
import { useKnowledge } from '@/lib/teaching/use-knowledge';
import { trackLearningEvent } from '@/lib/teaching/track-event';
import { useRouter } from 'next/navigation';
import { useStudentProgress } from '@/lib/teaching/use-learn';
import {
  Search,
  FileText,
  File,
  FileCheck,
  BookMarked,
  Download,
  Bookmark,
  BookOpen,
  Star,
  Trash2,
  Layers,
  Box,
  GitBranch,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

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

interface ResourceItem {
  id: string;
  name: string;
  type: string;
  size: number;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: '待解析',
  parsing: '解析中',
  extracting: '抽取中',
  ready: '已索引',
  failed: '失败',
};

export default function StudentResourcesPage() {
  const [activeTab, setActiveTab] = useState('knowledge-base');
  const { doc, stats } = useKnowledge();
  const router = useRouter();
  const { progress } = useStudentProgress();
  const learnedIds = new Set(
    Object.values(progress)
      .filter((p) => p.status === 'learned')
      .map((p) => p.pointId),
  );
  const [materials, setMaterials] = useState<ResourceItem[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchMaterials = async () => {
      setMaterialsLoading(true);
      try {
        const res = await fetch('/api/teaching/resources', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setMaterials(Array.isArray(json?.resources) ? json.resources : []);
        }
      } catch {
        // best-effort: leave list empty
      } finally {
        if (!cancelled) setMaterialsLoading(false);
      }
    };
    void fetchMaterials();
    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = [
    { label: '章节', value: stats?.chapterCount ?? 0, icon: BookOpen },
    { label: '小节', value: stats?.sectionCount ?? 0, icon: Layers },
    { label: '知识点', value: stats?.pointCount ?? 0, icon: Box },
    { label: '关联关系', value: stats?.relationCount ?? 0, icon: GitBranch },
    { label: '易错点', value: stats?.mistakeCount ?? 0, icon: AlertTriangle },
  ];

  const fileTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'ppt':
      case 'pptx':
        return <File className="h-5 w-5 text-amber-500" />;
      case 'docx':
      case 'doc':
        return <FileCheck className="h-5 w-5 text-emerald-500" />;
      case 'txt':
        return <BookMarked className="h-5 w-5 text-purple-500" />;
      default:
        return <File className="h-5 w-5 text-slate-400" />;
    }
  };

  const favorites = [
    {
      id: 1,
      type: '知识点',
      title: '卡尔曼滤波原理',
      chapter: '第一章 1.2',
      desc: '状态估计的核心算法',
    },
    { id: 2, type: '资料', title: '具身智能导论.pdf', chapter: '教材', desc: '教材 P.45-P.52' },
    {
      id: 3,
      type: '问答',
      title: 'RRT算法为什么是概率完备的？',
      chapter: '第三章 3.2',
      desc: 'AI 答疑记录',
    },
    {
      id: 4,
      type: '知识点',
      title: 'PPO 算法 clip 机制',
      chapter: '第四章 4.1',
      desc: '限制策略更新幅度',
    },
  ];

  const filteredMaterials = materials.filter((m) =>
    m.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div>
      <PageHeader title="学习资源" description="课程知识库、知识图谱、课程资料与个人收藏" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-[520px]">
          <TabsTrigger value="knowledge-base">课程知识库</TabsTrigger>
          <TabsTrigger value="knowledge-graph">知识图谱</TabsTrigger>
          <TabsTrigger value="materials">课程资料</TabsTrigger>
          <TabsTrigger value="favorites">我的收藏</TabsTrigger>
        </TabsList>

        {/* Knowledge Base */}
        <TabsContent value="knowledge-base" className="mt-6">
          <KnowledgeStructure
            doc={doc ?? undefined}
            onSelectPoint={(id) => {
              void trackLearningEvent({
                eventType: 'study',
                knowledgeNodeId: id,
                score: null,
                durationMinutes: 10,
              });
            }}
          />
        </TabsContent>

        {/* Knowledge Graph */}
        <TabsContent value="knowledge-graph" className="mt-6">
          <KnowledgeGraph
            doc={doc ?? undefined}
            learnedPointIds={learnedIds}
            onLearn={(id) => router.push(`/teaching/student/learn?point=${id}`)}
          />
        </TabsContent>

        {/* Course Materials (real uploaded resources) */}
        <TabsContent value="materials" className="mt-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索资料..."
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Badge variant="outline" className="text-xs">
              {materials.length} 份
            </Badge>
          </div>

          {materialsLoading ? (
            <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载中...
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
              {materials.length === 0 ? '教师暂未上传课程资料' : '没有匹配的资料'}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMaterials.map((m) => (
                <Card
                  key={m.id}
                  className="transition-base hover:border-primary/30 hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        {fileTypeIcon(m.type)}
                      </div>
                      <Badge
                        variant={
                          m.status === 'ready'
                            ? 'default'
                            : m.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                        }
                        className="text-xs"
                      >
                        {STATUS_LABEL[m.status] ?? m.status}
                      </Badge>
                    </div>
                    <h4 className="mb-1 truncate text-sm font-medium">{m.name}</h4>
                    <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{(m.size / 1024 / 1024).toFixed(1)} MB</span>
                      <span>·</span>
                      <span className="uppercase">{m.type}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={`/api/teaching/resources/${m.id}/file`} download>
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        查看 / 下载
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
                <div
                  key={f.id}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-base hover:bg-accent/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                    {f.type === '知识点' && <BookOpen className="h-5 w-5 text-amber-600" />}
                    {f.type === '资料' && <FileText className="h-5 w-5 text-amber-600" />}
                    {f.type === '问答' && <FileCheck className="h-5 w-5 text-amber-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{f.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {f.type}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {f.chapter} · {f.desc}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    查看
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
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
