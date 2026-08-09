# 具身智能课程教学智能体

> Embodied Intelligent Teaching Agents — 面向具身智能课程的 AI 教学平台

通过课程知识图谱、长期学习记忆与多智能体协同，构建「教师 - AI - 学生」协同的智能教学模式。

## ✨ 核心特性

### 教师端 `/teaching/teacher`
- **课程概览**：班级学情统计、知识掌握率、AI 教学建议与学习预警
- **课程建设**：知识结构管理、资源上传、知识图谱构建
- **教学工具**：智能组卷、学情分析、AI 备课助手、知识溯源

### 学生端 `/teaching/student`
- **AI 学习助手**：个性化学习推荐、学习路径规划、今日学习建议
- **学习资源**：课程资源浏览、知识检索、教材索引
- **答疑中心**：基于 RAG 的智能问答、教材溯源、知识关联推理
- **练习测试**：章节练习、专项测试、错题与薄弱点分析

### 智能闭环
- **教学 Agent 循环**：基于 LangGraph 编排的教师分析 / 学生引导 Agent，捕获真实学习事件并驱动知识图谱演化
- **RAG 答疑**：教材分块、向量检索、重排与重索引，答案可溯源到原文
- **长期记忆**：学习行为持久化，AI 教师随学习行为持续演化

## 🛠 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | Next.js 16 + React 19 |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS 4 + shadcn/ui |
| 状态管理 | Zustand |
| AI 编排 | LangGraph |
| 数据存储 | PostgreSQL（教学知识库与学习记录） |
| 包管理 | pnpm (workspace) |
| 测试 | Vitest + Playwright |

## 📁 项目结构

```
app/
├── teaching/                # 教学模块
│   ├── teacher/             # 教师端（课程概览 / 课程建设 / 教学工具）
│   └── student/             # 学生端（学习助手 / 资源 / 答疑 / 练习）
├── login/                   # 登录页
├── api/
│   ├── teaching/            # 教学 API（知识 / 学习 / 答疑 / 练习 / Agent 循环 …）
│   ├── auth/                # 认证 API
│   └── generate-classroom/  # 课堂生成（AI 备课）
└── page.tsx                 # 入口（教师 / 学生角色选择）
components/teaching/         # 教学专用组件
lib/teaching/                # 教学领域逻辑（知识库 / RAG / Agent / 编排 …）
lib/auth/                    # 认证
public/docs/                 # 课程教材（分章节 Markdown）
```

## 🚀 快速开始

### 环境要求
- Node.js（见 `.nvmrc`）
- pnpm
- PostgreSQL

### 安装
```bash
pnpm install
pnpm postinstall   # 构建内部包（首次或依赖更新后）
```

### 配置
复制 `.env.example` 为 `.env.local`，按需填写数据库与模型相关配置（`DATABASE_URL`、模型 API Key 等）。

### 开发
```bash
pnpm dev          # http://localhost:3000
```

### 构建
```bash
pnpm build
```

## 🧪 测试
```bash
pnpm test         # 单元测试（Vitest）
```

## 📄 许可证

本项目基于上游 [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) 多智能体课堂框架二次开发，保留其原有许可证，详见 [LICENSE](./LICENSE)。