// 从章节原文 Markdown 中抽取单个知识点对应的段落内容。
// 知识点 id 形如 chCC-S-P，对应 docs 中的 "### S.P" 小节；
// 若该小节不存在（如"本章概要""练习"直接挂在 ## 级别），则回退到第 S 个 ## 节。

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const FENCE_RE = /^\s*(?:`{3,}|~{3,})/;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractPointContent(markdown: string, pointId: string): string | null {
  const match = pointId.match(/^ch\d+-(\d+)-(\d+)$/);
  if (!match) return null;
  const sectionNum = Number(match[1]);
  const target = `${match[1]}.${match[2]}`;
  const lines = markdown.split('\n');

  // 收集所有 ## 与 ### 标题的行号（跳过代码围栏内的内容）。
  const level2: number[] = [];
  const level3: { idx: number; text: string }[] = [];
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const hm = line.match(HEADING_RE);
    if (!hm) continue;
    const level = hm[1].length;
    if (level === 2) level2.push(i);
    else if (level === 3) level3.push({ idx: i, text: hm[2].trim() });
  }

  // 优先匹配 "### S.P" 小节。
  const targetRe = new RegExp('^' + escapeRegex(target) + '(?![\\d.])');
  let startIdx = -1;
  let startLevel = 0;
  for (const h of level3) {
    if (targetRe.test(h.text)) {
      startIdx = h.idx;
      startLevel = 3;
      break;
    }
  }
  // 回退：第 S 个 ## 节（适用于无 ### 子节的小节）。
  if (startIdx === -1 && sectionNum >= 1 && sectionNum <= level2.length) {
    startIdx = level2[sectionNum - 1];
    startLevel = 2;
  }
  if (startIdx === -1) return null;

  // 截取到下一个同级或更高级标题之前（含更低级子标题的内容）。
  let endIdx = lines.length;
  inFence = false;
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const hm = line.match(HEADING_RE);
    if (hm && hm[1].length <= startLevel) {
      endIdx = i;
      break;
    }
  }

  const slice = lines.slice(startIdx, endIdx).join('\n').trim();
  return slice.length > 0 ? slice : null;
}
