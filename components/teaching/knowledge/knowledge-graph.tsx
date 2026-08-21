'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  getGraphNodes,
  buildGraphEdges,
  getPoint,
  type KnowledgeDoc,
  type KnowledgePointNode,
} from '@/lib/teaching/knowledge-doc';

const MODULE_POS: Record<string, { x: number; y: number }> = {
  foundations: { x: 0, y: 300 },
  generative: { x: 460, y: 0 },
  perception: { x: 460, y: 540 },
  'world-model': { x: 920, y: 0 },
  'motion-control': { x: 920, y: 540 },
  imitation: { x: 1380, y: 0 },
  rl: { x: 1380, y: 540 },
  planning: { x: 1840, y: 300 },
};

const MAX_ROWS = 7;
const NODE_DY = 58;
const NODE_DX = 224;

interface PointNodeData {
  node: KnowledgePointNode;
  dimmed: boolean;
  selected: boolean;
  learned: boolean;
}

function PointNode({ data }: NodeProps) {
  const d = data as unknown as PointNodeData;
  const { node, dimmed, selected, learned } = d;
  const { point, chapter, module: mod } = node;
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border-l-[3px] bg-white py-1.5 pl-2 pr-2.5 shadow-sm transition-opacity duration-200 ${
        dimmed ? 'opacity-20' : 'opacity-100'
      }`}
      style={{
        borderLeftColor: mod.color,
        width: 200,
        ...(selected ? { boxShadow: `0 0 0 2px ${mod.color}` } : {}),
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: mod.color, width: 5, height: 5, border: 'none' }}
      />
      <span
        className="flex-shrink-0 rounded px-1 text-[9px] font-bold leading-tight text-white"
        style={{ backgroundColor: mod.color }}
      >
        {chapter.number}
      </span>
      <span
        className="truncate text-[11px] font-medium leading-tight text-slate-700"
        title={point.title}
      >
        {point.title}
      </span>
      {learned && (
        <span className="flex-shrink-0 text-[10px] font-bold text-emerald-500">&#10003;</span>
      )}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: mod.color, width: 5, height: 5, border: 'none' }}
      />
    </div>
  );
}

const nodeTypes = { point: PointNode };

function GraphSkeleton() {
  return (
    <div className="flex h-[700px] items-center justify-center rounded-xl border bg-slate-50/50 text-sm text-muted-foreground">
      知识图谱加载中…
    </div>
  );
}

export function KnowledgeGraph({
  doc,
  learnedPointIds,
  onLearn,
}: {
  doc?: KnowledgeDoc;
  learnedPointIds?: Set<string>;
  onLearn?: (pointId: string) => void;
} = {}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hiddenModules, setHiddenModules] = useState<Set<string>>(new Set());

  const graphNodes = useMemo<KnowledgePointNode[]>(() => (doc ? getGraphNodes(doc) : []), [doc]);
  const graphEdges = useMemo(() => (doc ? buildGraphEdges(doc) : []), [doc]);

  const neighborMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of graphEdges) {
      if (!map.has(e.source)) map.set(e.source, new Set());
      if (!map.has(e.target)) map.set(e.target, new Set());
      map.get(e.source)!.add(e.target);
      map.get(e.target)!.add(e.source);
    }
    return map;
  }, [graphEdges]);

  const highlightSet = useMemo(() => {
    if (!selectedId) return null;
    const set = new Set<string>([selectedId]);
    const direct = neighborMap.get(selectedId);
    if (direct) for (const id of direct) set.add(id);
    return set;
  }, [selectedId, neighborMap]);

  const { nodes, edges } = useMemo(() => {
    const byModule = new Map<string, KnowledgePointNode[]>();
    for (const n of graphNodes) {
      if (hiddenModules.has(n.module.id)) continue;
      const list = byModule.get(n.module.id) ?? [];
      list.push(n);
      byModule.set(n.module.id, list);
    }

    const rfNodes: Node[] = [];
    for (const [moduleId, list] of byModule) {
      const base = MODULE_POS[moduleId] ?? { x: 0, y: 0 };
      list.sort(
        (a, b) => a.chapter.number - b.chapter.number || a.point.id.localeCompare(b.point.id),
      );
      list.forEach((node, i) => {
        const col = Math.floor(i / MAX_ROWS);
        const row = i % MAX_ROWS;
        const isNeighbor = highlightSet?.has(node.point.id) ?? false;
        rfNodes.push({
          id: node.point.id,
          type: 'point',
          position: { x: base.x + col * NODE_DX, y: base.y + row * NODE_DY },
          data: {
            node,
            dimmed: highlightSet !== null && !isNeighbor,
            selected: selectedId === node.point.id,
            learned: learnedPointIds?.has(node.point.id) ?? false,
          } as unknown as Record<string, unknown>,
        });
      });
    }

    const rfEdges: Edge[] = graphEdges
      .filter((e) => {
        const s = graphNodes.find((n) => n.point.id === e.source);
        const t = graphNodes.find((n) => n.point.id === e.target);
        return s && t && !hiddenModules.has(s.module.id) && !hiddenModules.has(t.module.id);
      })
      .map((e, i) => {
        const srcNode = graphNodes.find((n) => n.point.id === e.source)!;
        const active =
          highlightSet === null || (highlightSet.has(e.source) && highlightSet.has(e.target));
        if (e.type === 'prerequisite') {
          return {
            id: `e${i}`,
            source: e.source,
            target: e.target,
            animated: active,
            style: { stroke: srcNode.module.color, strokeWidth: 1.5, opacity: active ? 1 : 0.08 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: srcNode.module.color,
              width: 14,
              height: 14,
            },
          } as Edge;
        }
        const color = e.type === 'case' ? '#f59e0b' : '#94a3b8';
        const dash = e.type === 'case' ? '2 4' : '5 4';
        return {
          id: `e${i}`,
          source: e.source,
          target: e.target,
          style: {
            stroke: color,
            strokeWidth: 1,
            strokeDasharray: dash,
            opacity: active ? 0.55 : 0.05,
          },
        } as Edge;
      });

    return { nodes: rfNodes, edges: rfEdges };
  }, [graphNodes, graphEdges, hiddenModules, highlightSet, selectedId]);

  const toggleModule = useCallback((id: string) => {
    setHiddenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedDetail = useMemo(() => {
    if (!selectedId) return null;
    return {
      prereqs: graphEdges.filter((e) => e.target === selectedId && e.type === 'prerequisite'),
      dependents: graphEdges.filter((e) => e.source === selectedId && e.type === 'prerequisite'),
      related: graphEdges.filter(
        (e) => (e.source === selectedId || e.target === selectedId) && e.type === 'related',
      ),
    };
  }, [selectedId, graphEdges]);

  if (!doc) {
    return <GraphSkeleton />;
  }

  const prereqCount = graphEdges.filter((e) => e.type === 'prerequisite').length;
  const relatedCount = graphEdges.filter((e) => e.type === 'related').length;
  const caseCount = graphEdges.filter((e) => e.type === 'case').length;
  const selectedNode = selectedId
    ? (graphNodes.find((n) => n.point.id === selectedId) ?? null)
    : null;
  const modules = doc.modules;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">具身智能知识图谱</span>
        <span>·</span>
        <span>{graphNodes.length} 个知识点</span>
        <span>·</span>
        <span>{prereqCount} 前置依赖</span>
        <span>·</span>
        <span>{relatedCount} 关联关系</span>
        {caseCount > 0 && (
          <>
            <span>·</span>
            <span>{caseCount} 案例引用</span>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {modules.map((m) => {
          const hidden = hiddenModules.has(m.id);
          return (
            <button
              key={m.id}
              onClick={() => toggleModule(m.id)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all ${
                hidden ? 'border-slate-200 bg-slate-50 text-slate-400' : 'text-slate-700'
              }`}
              style={hidden ? {} : { borderColor: m.color }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={
                  hidden
                    ? { backgroundColor: 'transparent', border: `1px solid ${m.color}` }
                    : { backgroundColor: m.color }
                }
              />
              {m.name}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 bg-blue-500" />
          前置依赖（有向）
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-6 border-t border-dashed border-slate-400" />
          关联关系
        </span>
        {caseCount > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0 w-6 border-t border-dotted border-amber-500" />
            案例引用
          </span>
        )}
        <span className="ml-auto text-slate-400">点击知识点高亮关联 · 点击空白取消</span>
      </div>

      <div className="h-[700px] w-full overflow-hidden rounded-xl border bg-slate-50/50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={(_evt, node) => setSelectedId((prev) => (prev === node.id ? null : node.id))}
          onPaneClick={() => setSelectedId(null)}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          minZoom={0.15}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} size={1} color="#e2e8f0" />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) =>
              (n.data as unknown as PointNodeData)?.node?.module?.color ?? '#94a3b8'
            }
          />
        </ReactFlow>
      </div>

      {selectedNode && selectedDetail && (
        <div
          className="rounded-lg border p-3"
          style={{ borderLeftColor: selectedNode.module.color, borderLeftWidth: 4 }}
        >
          <div className="flex items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 text-xs font-bold text-white"
              style={{ backgroundColor: selectedNode.module.color }}
            >
              第{selectedNode.chapter.number}章 · {selectedNode.module.name}
            </span>
            <span className="font-medium text-foreground">{selectedNode.point.title}</span>
          </div>
          {selectedNode.point.summary && (
            <p className="mt-1.5 text-sm text-muted-foreground">{selectedNode.point.summary}</p>
          )}
          {onLearn && (
            <button
              type="button"
              onClick={() => onLearn(selectedNode.point.id)}
              className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              开始学习此知识点
            </button>
          )}
          <div className="mt-2 space-y-1.5 text-xs">
            {selectedDetail.prereqs.length > 0 && (
              <div className="flex gap-1.5">
                <span className="flex-shrink-0 font-medium text-slate-500">前置知识</span>
                <span className="text-slate-600">
                  {selectedDetail.prereqs
                    .map((e) => getPoint(doc, e.source)?.title ?? e.source)
                    .join('、')}
                </span>
              </div>
            )}
            {selectedDetail.dependents.length > 0 && (
              <div className="flex gap-1.5">
                <span className="flex-shrink-0 font-medium text-slate-500">后续应用</span>
                <span className="text-slate-600">
                  {selectedDetail.dependents
                    .map((e) => getPoint(doc, e.target)?.title ?? e.target)
                    .join('、')}
                </span>
              </div>
            )}
            {selectedDetail.related.length > 0 && (
              <div className="flex gap-1.5">
                <span className="flex-shrink-0 font-medium text-slate-500">关联知识</span>
                <span className="text-slate-600">
                  {selectedDetail.related
                    .map(
                      (e) =>
                        getPoint(doc, e.source === selectedNode.point.id ? e.target : e.source)
                          ?.title ?? '',
                    )
                    .join('、')}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
