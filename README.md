# 具身智能课程教学智能体

> Embodied Intelligent Teaching Agents · 面向具身智能课程的「教师 · AI · 学生」协同教学平台

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-F69220.svg)](https://pnpm.io/)

## 这是什么

一款专为**具身智能课程**打造的 AI 教学平台。它把课程内容结构化为**知识图谱**，用**长期学习记忆**作引擎、**多智能体协同**作大脑，让 AI 同时扮演"助教"与"学伴"，贯穿备课、答疑、练习、学情分析全流程，形成「教师 -> AI -> 学生 -> AI -> 教师」的教学闭环。

基于开源多智能体课堂框架 [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) 二次开发。

## 价值与亮点

- **知识图谱驱动**：课程内容拆解为知识节点与关联，学情、答疑、练习都围绕图谱展开，可溯源、可量化。
- **RAG 智能答疑**：教材分块 + 向量检索 + 重排，答案直达原文段落，告别"幻觉式"解答。
- **长期学习记忆**：持续捕获真实学习事件，AI 教师随学生行为演化——越用越懂每个学生。
- **教学 Agent 循环**：LangGraph 编排教师分析 / 学生引导 Agent，自动生成学习建议、组卷与薄弱点干预。
- **教师 / 学生双端**：教师聚焦学情洞察与备课，学生获得个性化路径与即时答疑，各取所需。
- **多模型即插即用**：OpenAI、DeepSeek、通义、智谱、Kimi 等 20+ 模型与本地 Ollama 自由切换。

## 功能一览

**教师端** `/teaching/teacher`

| 模块 | 能力 |
| --- | --- |
| 课程概览 | 班级学情统计 · 知识掌握雷达 · AI 教学建议 · 学习预警 |
| 课程建设 | 知识结构管理 · 资源上传 · 知识图谱构建 |
| 教学工具 | 智能组卷 · 学情分析 · AI 备课助手 · 知识溯源 |

**学生端** `/teaching/student`

| 模块 | 能力 |
| --- | --- |
| AI 学习助手 | 个性化推荐 · 学习路径规划 · 今日学习建议 |
| 学习资源 | 课程资源浏览 · 知识检索 · 教材原文索引 |
| 答疑中心 | RAG 智能问答 · 教材溯源 · 知识关联推理 |
| 练习测试 | 章节练习 · 专项测试 · 错题与薄弱点分析 |

## 快速开始

### 1. 环境要求

Node.js ≥ 20.9（见 `.nvmrc`）、pnpm、PostgreSQL（含 pgvector 扩展）。

### 2. 安装依赖

```bash
pnpm install
pnpm postinstall   # 构建内部包（首次 / 依赖更新后）
```

### 3. 配置环境变量

```bash
cp .env.example .env.local
```

按需填写 `DATABASE_URL` 与任一模型 `*_API_KEY`（如 `OPENAI_API_KEY`、`DEEPSEEK_API_KEY`）。本地 `pnpm dev` 无需 `AUTH_SECRET` 即可登录；生产部署前请设置随机 `AUTH_SECRET`（生成方式见 `.env.example`）。

### 4. 初始化数据库

执行 `scripts/init-teaching-schema.sql` 创建教学知识库表结构与向量索引，详见 `DATABASE-SETUP-GUIDE.md`。

### 5. 启动

```bash
pnpm dev          # http://localhost:3000
```

打开后选择「教师」或「学生」角色进入对应工作台。

### 构建与测试

```bash
pnpm build        # 生产构建
pnpm test         # 单元测试（Vitest）
```

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | Next.js 16 + React 19 |
| 语言 | TypeScript 5 |
| 样式 | Tailwind CSS 4 + shadcn/ui |
| 状态管理 | Zustand |
| AI 编排 | LangGraph |
| 存储 | PostgreSQL + pgvector |
| 包管理 | pnpm workspace |
| 测试 | Vitest + Playwright |

## 项目结构

```
app/teaching/          教学模块（teacher / student）
app/api/teaching/      教学 API（知识 / RAG / 练习 / 学情 / Agent …）
lib/teaching/          领域逻辑（知识库 / RAG / Agent / 编排）
public/docs/           课程教材（ch01–ch17，分章 Markdown）
scripts/               数据库 schema 与文档构建脚本
```

## 许可证

基于上游 [OpenMAIC](https://github.com/THU-MAIC/OpenMAIC) 二次开发，沿用其 MIT 许可证，详见 [LICENSE](./LICENSE)。