# AGENTS.md - 项目开发指南

## 项目概述

**项目名称**：具身智能课程教学智能体 (Embodied Intelligent Teaching Agents)

**基础框架**：基于 [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) 开源多智能体课堂框架进行二次开发

**项目愿景**：构建面向具身智能课程的 AI 教学平台，通过课程知识图谱、长期学习记忆、多智能体协同，实现"教师-AI-学生"协同的智能教学模式

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 + React 19 |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS 4 + shadcn/ui |
| 状态管理 | Zustand |
| AI 编排 | LangGraph |
| 包管理 | pnpm (workspace) |
| 测试 | Vitest + Playwright |

---

## 项目结构

```
├── app/                          # Next.js App Router 页面
│   ├── teaching/                 # 🆕 教学智能体模块
│   │   ├── page.tsx             # 教学入口（角色选择）
│   │   ├── teacher/             # 教师端
│   │   │   ├── layout.tsx       # 教师端布局
│   │   │   ├── page.tsx         # 课程概览
│   │   │   ├── course/          # 课程建设
│   │   │   └── tools/           # 教学工具
│   │   └── student/             # 学生端
│   │       ├── layout.tsx       # 学生端布局
│   │       ├── page.tsx         # AI学习助手
│   │       ├── resources/       # 学习资源
│   │       ├── qa/              # 答疑中心
│   │       └── practice/        # 练习测试
│   ├── classroom/               # OpenMAIC 原有：课堂互动
│   └── page.tsx                 # OpenMAIC 原有：主页
│
├── components/
│   ├── teaching/                # 🆕 教学专用组件
│   │   ├── sidebar.tsx          # 教学侧边栏
│   │   ├── charts/              # 图表组件
│   │   └── layout/              # 布局组件
│   └── ui/                      # 通用 UI 组件（shadcn/ui）
│
├── lib/
│   ├── mock-data.ts             # 🆕 模拟数据
│   ├── utils.ts                 # 🆕 工具函数（cn）
│   ├── orchestration/           # OpenMAIC：多智能体编排
│   ├── generation/              # OpenMAIC：内容生成
│   └── store/                   # 状态管理
│
└── packages/                    # 内部包
    ├── @openmaic/dsl            # DSL 定义
    ├── @openmaic/renderer       # 渲染器
    └── @openmaic/importer       # 导入器
```

---

## 核心功能模块

### 教师端 (`/teaching/teacher`)

| 页面 | 功能 | 文件 |
|------|------|------|
| 课程概览 | 班级学情统计、知识掌握率、AI教学建议、学习预警 | `app/teaching/teacher/page.tsx` |
| 课程建设 | 知识结构管理、资源上传、知识图谱构建 | `app/teaching/teacher/course/page.tsx` |
| 教学工具 | 智能组卷、学情分析、AI备课助手、知识溯源 | `app/teaching/teacher/tools/page.tsx` |

### 学生端 (`/teaching/student`)

| 页面 | 功能 | 文件 |
|------|------|------|
| AI学习助手 | 个性化学习推荐、学习路径规划、今日学习建议 | `app/teaching/student/page.tsx` |
| 学习资源 | 课程资源浏览、知识检索、教材索引 | `app/teaching/student/resources/page.tsx` |
| 答疑中心 | 智能问答、教材溯源、知识关联推理 | `app/teaching/student/qa/page.tsx` |
| 练习测试 | 章节练习、专项测试、错题分析 | `app/teaching/student/practice/page.tsx` |

---

## 开发规范

### 命名约定

- **文件名**：kebab-case（如 `page-header.tsx`）
- **组件名**：PascalCase（如 `TeachingSidebar`）
- **路由路径**：kebab-case（如 `/teaching/teacher/course`）

### 组件开发

```typescript
// 组件文件模板
"use client";

import { cn } from "@/lib/utils";

interface MyComponentProps {
  title: string;
  className?: string;
}

export function MyComponent({ title, className }: MyComponentProps) {
  return (
    <div className={cn("base-styles", className)}>
      {title}
    </div>
  );
}
```

### 样式规范

- 使用 Tailwind CSS 工具类
- 使用 `cn()` 合并类名（来自 `@/lib/utils`）
- 颜色使用 shadcn/ui 语义化变量（`primary`, `muted`, `accent` 等）

---

## 常用命令

```bash
# 开发
pnpm dev                    # 启动开发服务器 (http://localhost:3000)

# 构建
pnpm build                  # 构建生产版本

# 代码质量
pnpm lint                   # ESLint 检查
pnpm format                 # Prettier 格式化

# 测试
pnpm test                   # 单元测试
pnpm test:e2e               # E2E 测试

# 包构建（首次或依赖更新后）
pnpm postinstall            # 构建内部包
```

---

## Git 规范

### 分支命名

- `main` - 主分支
- `feature/*` - 功能分支（如 `feature/initial-framework`）
- `fix/*` - 修复分支
- `docs/*` - 文档分支

### 提交信息格式

```
<type>: <description>

[optional body]
```

**Type 类型**：
- `feat` - 新功能
- `fix` - 修复
- `docs` - 文档
- `style` - 样式调整
- `refactor` - 重构
- `test` - 测试
- `chore` - 构建/工具

---

## 注意事项

### ⚠️ 保持 OpenMAIC 核心功能完整

- 教学功能放在 `/teaching` 路由下，不要修改原有路由
- 不要删除或修改 `app/classroom/`、`app/page.tsx` 等原有文件
- 新组件放在 `components/teaching/` 目录下

### ⚠️ Windows 开发环境

- 内部包构建脚本使用了 `rm -rf`，Windows 下需要手动执行：
  ```bash
  cd packages/@openmaic/dsl && if exist dist rmdir /s /q dist && pnpm run build
  ```

### ⚠️ 网络配置

- 如遇 GitHub 推送失败，设置 Git SSL 后端：
  ```bash
  git config --global http.sslBackend schannel
  ```

---

## 相关资源

- **OpenMAIC 文档**：[README.md](./README.md)
- **中文文档**：[README-zh.md](./README-zh.md)
- **GitHub 仓库**：https://github.com/Hongyuan-Lu/Embodied-Intelligent-Teaching-Agents
- **上游仓库**：https://github.com/THU-MAIC/OpenMAIC
