# 完整数据存储设计方案

> **版本**: v1.0  
> **日期**: 2026-08-01  
> **状态**: 设计阶段  
> **项目**: 具身智能课程教学智能体 (Embodied Intelligent Teaching Agents)  
> **基于**: OpenMAIC 开源多智能体课堂框架

---

## 一、现状审计报告

### 1.1 已有存储基础设施

项目继承了 OpenMAIC 的两套存储体系：

| 存储层 | 技术栈 | 用途 | 文件位置 |
|--------|--------|------|----------|
| **DocumentStore** | PostgreSQL JSONB | 课程文档（Stage/Scene/Outline）持久化 | `packages/@openmaic/storage/src/document/pg.ts` |
| **RuntimeStore** | PostgreSQL JSONB | 学习者运行时数据（Session/Record）持久化 | `packages/@openmaic/storage/src/runtime/pg.ts` |
| **IndexedDB (Dexie)** | 浏览器本地 | 离线缓存、音频/图片临时存储、聊天会话 | `lib/utils/database.ts` |

#### 已有 PostgreSQL 表结构

```sql
-- DocumentStore 表
document_stages (id, name, description, interactive_mode, task_engine_mode, created_at, updated_at, data JSONB)
document_scenes (stage_id, id, scene_order, data JSONB)
document_outlines (stage_id, data JSONB)

-- RuntimeStore 表
runtime_sessions (id, stage_id, learner_key, kind, status, created_at, updated_at, data JSONB)
runtime_records (id, session_id, seq, scene_id, created_at, data JSONB)

-- 教学模块表（feature/knowledge-system 新增）
teaching_knowledge (id, data JSONB, updated_at)
teaching_resources (id, name, type, mime, size, status, parsed_text, point_ids JSONB, error, content bytea, created_at, updated_at)
```

#### 已有 IndexedDB 表

| 表名 | 主键 | 存储内容 |
|------|------|----------|
| `stages` | id | 课程基础信息 |
| `scenes` | id, stageId | 场景/页面数据 |
| `audioFiles` | id | TTS 音频文件 |
| `imageFiles` | id | 图片文件 |
| `chatSessions` | id, stageId | 聊天会话 |
| `playbackState` | stageId | 播放状态 |
| `stageOutlines` | stageId | 大纲缓存 |
| `mediaFiles` | id, stageId | AI 生成媒体 |
| `generatedAgents` | id, stageId | 生成的 Agent 配置 |
| `agentEditSessions` | id, stageId | Agent 编辑会话 |
| `voiceProfiles` | id | TTS 语音配置 |
| `snapshots` | auto-increment | 撤销/重做快照 |
| `chatRestoreStaging` | id | 聊天恢复暂存 |

### 1.2 教学模块现状分析

| 功能模块 | 页面文件 | 数据状态 | 问题 |
|----------|----------|----------|------|
| **课程概览（教师）** | `app/teaching/teacher/page.tsx` | ❌ 全部硬编码模拟数据 | 班级统计、学情分析均为假数据 |
| **课程建设（教师）** | `app/teaching/teacher/course/page.tsx` | ✅ 调用知识库 API | 依赖 `teaching_knowledge` 表 |
| **教学工具（教师）** | `app/teaching/teacher/tools/page.tsx` | ❌ 全部硬编码模拟数据 | 智能组卷、学情分析均为假数据 |
| **AI学习助手（学生）** | `app/teaching/student/page.tsx` | ❌ 全部硬编码模拟数据 | 学习推荐、路径规划均为假数据 |
| **学习资源（学生）** | `app/teaching/student/resources/page.tsx` | ✅ 调用资源 API | 依赖 `teaching_resources` 表 |
| **答疑中心（学生）** | `app/teaching/student/qa/page.tsx` | ❌ 硬编码模拟 AI 回复 | setTimeout 模拟，无真实 AI |
| **练习测试（学生）** | `app/teaching/student/practice/page.tsx` | ❌ 全部硬编码模拟数据 | 题目、成绩均为假数据 |

### 1.3 关键缺失

| 缺失项 | 严重程度 | 说明 |
|--------|----------|------|
| **向量存储 (pgvector)** | 🔴 高 | 无法实现 RAG 语义检索 |
| **Embedding 管线** | 🔴 高 | 知识点无法向量化 |
| **RAG 检索管线** | 🔴 高 | AI 答疑无法引用真实教材 |
| **学生数据模型** | 🔴 高 | 无学生账号、学习记录、成绩存储 |
| **教师数据模型** | 🔴 高 | 无教师账号、班级管理 |
| **题目/试卷模型** | 🟡 中 | 练习测试功能依赖 |
| **学习分析模型** | 🟡 中 | 学情分析功能依赖 |
| **用户认证** | 🔴 高 | 无多用户支持 |

---

## 二、总体存储架构设计

### 2.1 架构总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        客户端层 (Browser)                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │  Zustand Store│  │ IndexedDB    │  │ React Query  │                   │
│  │  (运行时状态) │  │ (离线缓存)   │  │ (API 缓存)   │                   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                   │
│         └────────┬────────┴────────┬────────┘                            │
│         ┌───────▼─────────────────▼───────┐                             │
│         │        Next.js API Routes        │                             │
│         └───────────────┬─────────────────┘                             │
└─────────────────────────┼───────────────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────────────────┐
│                    服务端层 (Node.js Runtime)                            │
│  ┌───────────────────────▼───────────────────────────────────┐          │
│  │                   数据访问层 (DAO)                         │          │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐   │          │
│  │  │ 教学DAO     │ │ OpenMAIC DAO │ │ AI/RAG 管线      │   │          │
│  │  └──────┬──────┘ └──────┬───────┘ └────────┬─────────┘   │          │
│  └─────────┼───────────────┼──────────────────┼─────────────┘          │
│  ┌─────────▼───────────────▼──────────────────▼─────────────┐          │
│  │              PostgreSQL 16 + pgvector 扩展                 │          │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐  │          │
│  │  │ OpenMAIC 表 │ │ 教学业务表   │ │ 向量/索引表      │  │          │
│  │  └─────────────┘ └──────────────┘ └──────────────────┘  │          │
│  └───────────────────────────────────────────────────────────┘          │
└───────────────────────────────────────────────────────────────────────────┘
```

### 2.2 存储分层策略

| 层级 | 存储目标 | 数据类型 | 持久性 | 同步策略 |
|------|----------|----------|--------|----------|
| **L1: 内存** | Zustand Store | UI 状态、临时表单 | 会话级 | 实时 |
| **L2: 浏览器** | IndexedDB (Dexie) | 音频/图片缓存、离线数据 | 持久化 | 异步同步 |
| **L3: API 缓存** | React Query / SWR | API 响应缓存 | TTL | 自动刷新 |
| **L4: 服务端数据库** | PostgreSQL | 所有业务数据 | 持久化 | 主数据源 |
| **L5: 向量数据库** | pgvector (同库) | 知识点 Embedding | 持久化 | 随知识库更新 |

---

## 三、完整表结构设计

### 3.1 用户与班级管理

#### 3.1.1 教师表 `teachers`

```sql
CREATE TABLE IF NOT EXISTS teachers (
    id          TEXT PRIMARY KEY,
    user_id     TEXT UNIQUE,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE,
    avatar_url  TEXT,
    department  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_teachers_email ON teachers(email);
```

#### 3.1.2 学生表 `students`

```sql
CREATE TABLE IF NOT EXISTS students (
    id          TEXT PRIMARY KEY,
    user_id     TEXT UNIQUE,
    name        TEXT NOT NULL,
    student_no  TEXT UNIQUE,
    email       TEXT UNIQUE,
    avatar_url  TEXT,
    grade       TEXT,
    major       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_student_no ON students(student_no);
```

#### 3.1.3 班级表 `classes`

```sql
CREATE TABLE IF NOT EXISTS classes (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    teacher_id  TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    semester    TEXT,
    course_name TEXT DEFAULT '具身智能导论',
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'archived')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
```

#### 3.1.4 班级-学生关联表 `class_students`

```sql
CREATE TABLE IF NOT EXISTS class_students (
    class_id    TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (class_id, student_id)
);

CREATE INDEX idx_class_students_student ON class_students(student_id);
```

### 3.2 知识体系（规范化存储）

> 现有 `teaching_knowledge` 表将整份知识文档存为单条 JSONB，查询效率低且不支持细粒度操作。新方案将知识体系拆分为规范化表结构，同时保留 JSONB 全文缓存用于兼容。

#### 3.2.1 知识模块表 `knowledge_modules`

```sql
CREATE TABLE IF NOT EXISTS knowledge_modules (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    color       TEXT,
    description TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### 3.2.2 知识章节表 `knowledge_chapters`

```sql
CREATE TABLE IF NOT EXISTS knowledge_chapters (
    id            TEXT PRIMARY KEY,
    module_id     TEXT NOT NULL REFERENCES knowledge_modules(id) ON DELETE CASCADE,
    number        INTEGER NOT NULL,
    title         TEXT NOT NULL,
    part          TEXT,
    summary       TEXT,
    is_case_study BOOLEAN DEFAULT false,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chapters_module ON knowledge_chapters(module_id);
```

#### 3.2.3 知识节表 `knowledge_sections`

```sql
CREATE TABLE IF NOT EXISTS knowledge_sections (
    id          TEXT PRIMARY KEY,
    chapter_id  TEXT NOT NULL REFERENCES knowledge_chapters(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sections_chapter ON knowledge_sections(chapter_id);
```

#### 3.2.4 知识点表 `knowledge_points`

```sql
CREATE TABLE IF NOT EXISTS knowledge_points (
    id          TEXT PRIMARY KEY,
    section_id  TEXT NOT NULL REFERENCES knowledge_sections(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    summary     TEXT,
    content     TEXT,
    difficulty  TEXT DEFAULT 'medium'
                CHECK (difficulty IN ('easy', 'medium', 'hard')),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_points_section ON knowledge_points(section_id);
CREATE INDEX idx_points_title ON knowledge_points USING gin(to_tsvector('simple', title));
```

#### 3.2.5 知识点关系表 `knowledge_relations`

```sql
CREATE TABLE IF NOT EXISTS knowledge_relations (
    id              SERIAL PRIMARY KEY,
    source_id       TEXT NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
    target_id       TEXT NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
    relation_type   TEXT NOT NULL
                    CHECK (relation_type IN ('prerequisite', 'related', 'case', 'experiment')),
    UNIQUE (source_id, target_id, relation_type)
);

CREATE INDEX idx_relations_source ON knowledge_relations(source_id);
CREATE INDEX idx_relations_target ON knowledge_relations(target_id);
```

#### 3.2.6 常见错误表 `common_mistakes`

```sql
CREATE TABLE IF NOT EXISTS common_mistakes (
    id          TEXT PRIMARY KEY,
    point_id    TEXT NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    wrong       TEXT NOT NULL,
    right       TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mistakes_point ON common_mistakes(point_id);
```

#### 3.2.7 兼容保留：知识文档全文缓存

```sql
CREATE TABLE IF NOT EXISTS teaching_knowledge (
    id          TEXT PRIMARY KEY DEFAULT 'default',
    data        JSONB NOT NULL,
    version     INTEGER NOT NULL DEFAULT 1,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 3.3 向量存储与 RAG (pgvector)

#### 3.3.1 启用 pgvector 扩展

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 3.3.2 知识点 Embedding 表 `knowledge_embeddings`

```sql
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id              SERIAL PRIMARY KEY,
    point_id        TEXT NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
    chunk_index     INTEGER NOT NULL DEFAULT 0,
    chunk_text      TEXT NOT NULL,
    embedding       vector(1536) NOT NULL,
    model           TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (point_id, chunk_index, model)
);

CREATE INDEX idx_embeddings_vector ON knowledge_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_embeddings_point ON knowledge_embeddings(point_id);
```

#### 3.3.3 资源文档 Embedding 表 `resource_embeddings`

```sql
CREATE TABLE IF NOT EXISTS resource_embeddings (
    id              SERIAL PRIMARY KEY,
    resource_id     TEXT NOT NULL REFERENCES teaching_resources(id) ON DELETE CASCADE,
    chunk_index     INTEGER NOT NULL,
    chunk_text      TEXT NOT NULL,
    page_number     INTEGER,
    embedding       vector(1536) NOT NULL,
    model           TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (resource_id, chunk_index, model)
);

CREATE INDEX idx_resource_embeddings_vector ON resource_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_resource_embeddings_resource ON resource_embeddings(resource_id);
```

#### 3.3.4 Embedding 任务队列表 `embedding_jobs`

```sql
CREATE TABLE IF NOT EXISTS embedding_jobs (
    id              TEXT PRIMARY KEY,
    source_type     TEXT NOT NULL
                    CHECK (source_type IN ('knowledge_point', 'resource')),
    source_id       TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error           TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_embedding_jobs_status ON embedding_jobs(status);
```

### 3.4 教学资源（增强现有表）

```sql
ALTER TABLE teaching_resources ADD COLUMN IF NOT EXISTS uploaded_by TEXT;
ALTER TABLE teaching_resources ADD COLUMN IF NOT EXISTS chapter_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE teaching_resources ADD COLUMN IF NOT EXISTS embedding_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE teaching_resources ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0;
ALTER TABLE teaching_resources ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
```

### 3.5 学习记录与分析

#### 3.5.1 学习进度表 `learning_progress`

```sql
CREATE TABLE IF NOT EXISTS learning_progress (
    id              SERIAL PRIMARY KEY,
    student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    point_id        TEXT NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
    class_id        TEXT REFERENCES classes(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'not_started'
                    CHECK (status IN ('not_started', 'in_progress', 'mastered')),
    mastery_score   REAL DEFAULT 0 CHECK (mastery_score >= 0 AND mastery_score <= 100),
    study_duration  INTEGER DEFAULT 0,
    last_studied_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, point_id)
);

CREATE INDEX idx_progress_student ON learning_progress(student_id);
CREATE INDEX idx_progress_point ON learning_progress(point_id);
CREATE INDEX idx_progress_class ON learning_progress(class_id);
CREATE INDEX idx_progress_status ON learning_progress(status);
```

#### 3.5.2 学习行为日志表 `learning_events`

```sql
CREATE TABLE IF NOT EXISTS learning_events (
    id              BIGSERIAL PRIMARY KEY,
    student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL
                    CHECK (event_type IN (
                        'view_point', 'ask_question', 'submit_answer',
                        'complete_practice', 'view_resource',
                        'start_session', 'end_session'
                    )),
    target_id       TEXT,
    class_id        TEXT REFERENCES classes(id) ON DELETE SET NULL,
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_student_time ON learning_events(student_id, created_at DESC);
CREATE INDEX idx_events_type ON learning_events(event_type);
CREATE INDEX idx_events_class ON learning_events(class_id);
```

### 3.6 答疑系统

#### 3.6.1 问答会话表 `qa_sessions`

```sql
CREATE TABLE IF NOT EXISTS qa_sessions (
    id              TEXT PRIMARY KEY,
    student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id        TEXT REFERENCES classes(id) ON DELETE SET NULL,
    title           TEXT,
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'archived')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qa_sessions_student ON qa_sessions(student_id);
```

#### 3.6.2 问答消息表 `qa_messages`

```sql
CREATE TABLE IF NOT EXISTS qa_messages (
    id               TEXT PRIMARY KEY,
    session_id       TEXT NOT NULL REFERENCES qa_sessions(id) ON DELETE CASCADE,
    role             TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content          TEXT NOT NULL,
    retrieved_chunks JSONB,
    source_refs      JSONB,
    model_used       TEXT,
    tokens_used      INTEGER,
    latency_ms       INTEGER,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_qa_messages_session ON qa_messages(session_id, created_at);
```

### 3.7 练习与测试

#### 3.7.1 题库表 `questions`

```sql
CREATE TABLE IF NOT EXISTS questions (
    id              TEXT PRIMARY KEY,
    type            TEXT NOT NULL
                    CHECK (type IN ('single_choice', 'multiple_choice', 'true_false', 'short_answer', 'coding')),
    difficulty      TEXT NOT NULL DEFAULT 'medium'
                    CHECK (difficulty IN ('easy', 'medium', 'hard')),
    stem            TEXT NOT NULL,
    options         JSONB,
    answer          JSONB NOT NULL,
    explanation     TEXT,
    point_ids       JSONB NOT NULL DEFAULT '[]'::jsonb,
    chapter_id      TEXT,
    source          TEXT,
    created_by      TEXT REFERENCES teachers(id) ON DELETE SET NULL,
    is_ai_generated BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_chapter ON questions(chapter_id);
CREATE INDEX idx_questions_points ON questions USING gin(point_ids);
```

#### 3.7.2 试卷表 `exam_papers`

```sql
CREATE TABLE IF NOT EXISTS exam_papers (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT,
    class_id        TEXT REFERENCES classes(id) ON DELETE SET NULL,
    created_by      TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    question_ids    JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_score     INTEGER NOT NULL DEFAULT 100,
    time_limit      INTEGER,
    status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published', 'closed')),
    published_at    TIMESTAMPTZ,
    due_at          TIMESTAMPTZ,
    is_ai_generated BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_papers_class ON exam_papers(class_id);
CREATE INDEX idx_papers_status ON exam_papers(status);
```

#### 3.7.3 答题记录表 `practice_attempts`

```sql
CREATE TABLE IF NOT EXISTS practice_attempts (
    id              TEXT PRIMARY KEY,
    student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    paper_id        TEXT REFERENCES exam_papers(id) ON DELETE SET NULL,
    question_id     TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer          JSONB NOT NULL,
    is_correct      BOOLEAN,
    score           REAL,
    time_spent      INTEGER,
    class_id        TEXT REFERENCES classes(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attempts_student ON practice_attempts(student_id);
CREATE INDEX idx_attempts_question ON practice_attempts(question_id);
CREATE INDEX idx_attempts_paper ON practice_attempts(paper_id);
CREATE INDEX idx_attempts_student_time ON practice_attempts(student_id, created_at DESC);
```

#### 3.7.4 错题本表 `wrong_questions`

```sql
CREATE TABLE IF NOT EXISTS wrong_questions (
    id              SERIAL PRIMARY KEY,
    student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    question_id     TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    wrong_count     INTEGER NOT NULL DEFAULT 1,
    last_wrong_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_mastered     BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (student_id, question_id)
);

CREATE INDEX idx_wrong_student ON wrong_questions(student_id);
CREATE INDEX idx_wrong_unmastered ON wrong_questions(student_id) WHERE NOT is_mastered;
```

### 3.8 学习推荐与路径

#### 3.8.1 学习路径表 `learning_paths`

```sql
CREATE TABLE IF NOT EXISTS learning_paths (
    id              TEXT PRIMARY KEY,
    student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id        TEXT REFERENCES classes(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    steps           JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_reasoning    TEXT,
    progress_pct    REAL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'abandoned')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_paths_student ON learning_paths(student_id);
```

#### 3.8.2 AI 推荐记录表 `ai_recommendations`

```sql
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id              TEXT PRIMARY KEY,
    student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    type            TEXT NOT NULL
                    CHECK (type IN ('daily_suggestion', 'weak_point', 'next_step', 'resource')),
    content         JSONB NOT NULL,
    reasoning       TEXT,
    context_data    JSONB,
    is_accepted     BOOLEAN,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recommendations_student ON ai_recommendations(student_id, created_at DESC);
```

### 3.9 教学分析（教师端）

```sql
CREATE TABLE IF NOT EXISTS class_analytics (
    id              SERIAL PRIMARY KEY,
    class_id        TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    snapshot_date   DATE NOT NULL,
    total_students  INTEGER NOT NULL DEFAULT 0,
    active_students INTEGER NOT NULL DEFAULT 0,
    avg_progress    REAL DEFAULT 0,
    avg_mastery     REAL DEFAULT 0,
    weak_points     JSONB DEFAULT '[]'::jsonb,
    hot_questions   JSONB DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (class_id, snapshot_date)
);

CREATE INDEX idx_analytics_class_date ON class_analytics(class_id, snapshot_date DESC);
```

### 3.10 RAG 对话上下文

```sql
CREATE TABLE IF NOT EXISTS rag_conversations (
    id              TEXT PRIMARY KEY,
    student_id      TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id      TEXT REFERENCES qa_sessions(id) ON DELETE SET NULL,
    messages        JSONB NOT NULL DEFAULT '[]'::jsonb,
    context_points  JSONB DEFAULT '[]'::jsonb,
    model_config    JSONB DEFAULT '{}'::jsonb,
    total_tokens    INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rag_conv_student ON rag_conversations(student_id);
```

---

## 四、RAG 管线设计

### 4.1 RAG 架构总览

```
① 文档摄入 (Ingestion)
上传文档 → 文档解析 → 文本分块(Chunking) → 向量化(Embedding) → pgvector 存储

② 查询检索 (Retrieval)
用户提问 → 问题向量化(Embedding) → 相似度 Top-K 检索 → 上下文拼装

③ 生成回答 (Generation)
Prompt Template + 检索上下文 + 对话历史 → LLM → 回答
```

### 4.2 文档分块策略

```typescript
const CHUNK_CONFIG = {
  knowledgePoint: {
    strategy: 'semantic',
    maxChunkSize: 500,
    overlap: 50,
    includeMetadata: true,
  },
  resource: {
    strategy: 'fixed',
    maxChunkSize: 800,
    overlap: 100,
    preserveParagraphs: true,
  },
};
```

### 4.3 检索策略

```typescript
const RETRIEVAL_CONFIG = {
  vectorSearch: {
    topK: 10,
    similarityThreshold: 0.7,
    model: 'text-embedding-3-small',
  },
  keywordSearch: {
    enabled: true,
    language: 'simple',
  },
  reranking: {
    method: 'reciprocal_rank_fusion',
    vectorWeight: 0.7,
    keywordWeight: 0.3,
  },
  topN: 5,
};
```

### 4.4 Prompt 模板

```
你是一个具身智能课程的 AI 教学助手。请基于以下教材内容回答学生的问题。

## 检索到的知识内容：
{retrieved_context}

## 学生问题：
{user_question}

## 回答要求：
1. 优先引用教材原文，标注出处（章节、页码）
2. 使用通俗易懂的语言解释专业概念
3. 如果教材中没有相关内容，请明确说明
4. 适当关联相关知识点，帮助学生建立知识网络
5. 如果学生的问题涉及常见错误，主动提醒
```

---

## 五、API 路由设计

### 5.1 教学模块 API 总览

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| **知识体系** ||||
| GET | `/api/teaching/knowledge` | 获取知识文档全文 | 公开 |
| GET | `/api/teaching/knowledge/points` | 分页查询知识点 | 公开 |
| GET | `/api/teaching/knowledge/graph` | 获取知识图谱数据 | 公开 |
| POST | `/api/teaching/knowledge/search` | 知识点语义搜索 | 公开 |
| **教学资源** ||||
| GET | `/api/teaching/resources` | 资源列表 | 教师 |
| POST | `/api/teaching/resources` | 上传资源 | 教师 |
| GET | `/api/teaching/resources/[id]` | 资源详情 | 教师 |
| DELETE | `/api/teaching/resources/[id]` | 删除资源 | 教师 |
| **RAG 答疑** ||||
| POST | `/api/teaching/qa/chat` | RAG 问答 | 学生 |
| GET | `/api/teaching/qa/sessions` | 问答历史 | 学生 |
| **练习测试** ||||
| GET | `/api/teaching/questions` | 题库查询 | 教师/学生 |
| POST | `/api/teaching/questions` | 创建题目 | 教师 |
| POST | `/api/teaching/questions/generate` | AI 生成题目 | 教师 |
| POST | `/api/teaching/practice/submit` | 提交答案 | 学生 |
| GET | `/api/teaching/practice/wrong-questions` | 错题本 | 学生 |
| **学习分析** ||||
| GET | `/api/teaching/analytics/overview` | 班级学情概览 | 教师 |
| GET | `/api/teaching/analytics/student/[id]` | 学生个人分析 | 学生/教师 |
| **学习路径** ||||
| POST | `/api/teaching/learning-path/generate` | AI 生成路径 | 学生 |
| GET | `/api/teaching/learning-path/active` | 当前路径 | 学生 |
| **班级管理** ||||
| GET | `/api/teaching/classes` | 班级列表 | 教师 |
| POST | `/api/teaching/classes` | 创建班级 | 教师 |
| POST | `/api/teaching/classes/[id]/students` | 添加学生 | 教师 |

---

## 六、数据迁移策略

### 6.1 迁移顺序

```
阶段 1：基础设施
  ├── 1.1 启用 pgvector 扩展
  ├── 1.2 创建用户/班级管理表
  └── 1.3 创建知识体系规范化表

阶段 2：数据迁移
  ├── 2.1 从 knowledge-system.ts 静态数据迁移到规范化表
  ├── 2.2 从 teaching_knowledge JSONB 提取到规范化表
  └── 2.3 为现有知识点生成 Embedding

阶段 3：功能接入
  ├── 3.1 接入 RAG 答疑 API
  ├── 3.2 接入练习测试 API
  └── 3.3 接入学习分析 API

阶段 4：前端改造
  ├── 4.1 替换硬编码模拟数据
  ├── 4.2 接入真实 API
  └── 4.3 端到端测试
```

### 6.2 知识点数据迁移要点

迁移脚本需从 `lib/teaching/knowledge-system.ts` 的静态数据中提取：
- `modules` → `knowledge_modules`
- `chapters` → `knowledge_chapters`
- `chapters[].sections` → `knowledge_sections`
- `chapters[].sections[].points` → `knowledge_points`
- `point.prerequisites/related/cases/experiments` → `knowledge_relations`
- `commonMistakes` → `common_mistakes`

### 6.3 Embedding 生成要点

- 使用 OpenAI `text-embedding-3-small` 模型（1536 维）
- 批量处理，每批 100 条
- 知识点文本格式：`"章节：{chapter_title}\\n知识点：{point_title}\\n{point_summary}"`
- 长文本需分块处理，每块不超过 500 token

---

## 七、环境变量配置

```bash
# .env.local

# ============ 数据库 ============
DATABASE_URL=postgresql://user:password@host:5432/openmaic

# ============ 认证 ============
PERSISTENCE_DEV_TOKEN=your-dev-token

# ============ LLM 提供商 ============
OPENAI_API_KEY=sk-...
OPENAI_MODELS=gpt-4o,gpt-4o-mini

# ============ Embedding ============
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# ============ RAG 配置 ============
RAG_TOP_K=10
RAG_TOP_N=5
RAG_SIMILARITY_THRESHOLD=0.7

# ============ 教学功能开关 ============
NEXT_PUBLIC_TEACHING_ENABLED=true
TEACHING_RAG_ENABLED=true
TEACHING_AI_QUESTIONS_ENABLED=true
```

### Docker Compose 增强

```yaml
postgres:
  image: pgvector/pgvector:pg16
  profiles:
    - server-persistence
  environment:
    - POSTGRES_DB=openmaic
    - POSTGRES_USER=openmaic
    - POSTGRES_PASSWORD=${PERSISTENCE_POSTGRES_PASSWORD:-openmaic-dev}
  volumes:
    - openmaic-postgres:/var/lib/postgresql/data
```

---

## 八、性能优化建议

### 8.1 索引策略

| 表 | 关键查询 | 索引类型 |
|----|----------|----------|
| `knowledge_embeddings` | 向量相似度 | HNSW (vector_cosine_ops) |
| `learning_progress` | 按学生+状态查询 | B-tree (student_id, status) |
| `practice_attempts` | 按学生+时间范围 | B-tree (student_id, created_at DESC) |
| `qa_messages` | 按会话+时间 | B-tree (session_id, created_at) |
| `learning_events` | 按学生+时间+类型 | B-tree (student_id, event_type, created_at DESC) |
| `questions` | 按知识点标签 | GIN (point_ids) |

### 8.2 分区策略

当数据量增长到百万级时，建议对 `learning_events` 等日志表按月分区。

### 8.3 缓存策略

| 数据 | 缓存位置 | TTL | 更新策略 |
|------|----------|-----|----------|
| 知识文档全文 | React Query | 15s | 窗口聚焦刷新 |
| 知识图谱数据 | React Query | 60s | 手动失效 |
| 学生学习进度 | React Query | 10s | 提交后失效 |
| Embedding 搜索结果 | 无缓存 | - | 每次实时检索 |
| 班级统计数据 | React Query | 30s | 定时刷新 |

---

## 九、安全与权限设计

### 9.1 角色权限矩阵

| 功能 | 教师 | 学生 | 访客 |
|------|------|------|------|
| 查看知识体系 | ✅ | ✅ | ✅ |
| 编辑知识体系 | ✅ | ❌ | ❌ |
| 上传教学资源 | ✅ | ❌ | ❌ |
| 查看教学资源 | ✅ | ✅ | ❌ |
| RAG 答疑 | ✅ | ✅ | ❌ |
| 练习测试 | ✅ (出题) | ✅ (答题) | ❌ |
| 查看班级数据 | ✅ (本班) | ❌ | ❌ |
| 查看个人数据 | ❌ | ✅ (自己) | ❌ |
| AI 智能组卷 | ✅ | ❌ | ❌ |
| 管理班级 | ✅ | ❌ | ❌ |

### 9.2 数据隔离原则

- 教师只能访问自己班级的数据
- 学生只能访问自己所在班级的公开数据和个人数据
- 知识体系对所有用户公开
- 教学资源按班级权限控制

---

## 十、监控与运维

### 10.1 关键指标

| 指标 | 说明 | 告警阈值 |
|------|------|----------|
| `embedding_queue_size` | 待处理 Embedding 任务数 | > 1000 |
| `rag_latency_p95` | RAG 检索 P95 延迟 | > 2s |
| `qa_response_latency` | 答疑总响应延迟 | > 10s |
| `db_connection_pool_usage` | 数据库连接池使用率 | > 80% |

### 10.2 数据备份策略

| 数据类型 | 备份频率 | 保留策略 |
|----------|----------|----------|
| PostgreSQL 全量 | 每日 | 保留 30 天 |
| PostgreSQL WAL | 实时 | 保留 7 天 |
| 教学资源文件 | 每日 | 永久 |
| Embedding 数据 | 随知识库更新 | 可重建 |

---

## 附录 A：依赖项清单

| 依赖 | 版本 | 用途 | 是否已有 |
|------|------|------|----------|
| `pg` | ^8.16.3 | PostgreSQL 客户端 | ✅ |
| `pgvector` | pg16 扩展 | 向量存储与检索 | ❌ 需安装 |
| `openai` | ^4.104.0 | Embedding API | ✅ |
| `ai` | ^6.0.168 | Vercel AI SDK | ✅ |
| `zod` | ^4.3.5 | Schema 验证 | ✅ |
| `dexie` | ^4.2.1 | IndexedDB 封装 | ✅ |

## 附录 B：文件变更清单

| 文件路径 | 变更类型 | 说明 |
|----------|----------|------|
| `lib/teaching/store.ts` | 重构 | 扩展数据库操作，增加规范化表 CRUD |
| `lib/teaching/embedding.ts` | 新增 | Embedding 生成与管理 |
| `lib/teaching/rag.ts` | 新增 | RAG 检索管线 |
| `lib/teaching/qa-service.ts` | 新增 | 答疑服务（整合 RAG + LLM） |
| `lib/teaching/analytics.ts` | 新增 | 学习分析计算 |
| `app/api/teaching/qa/chat/route.ts` | 新增 | RAG 答疑 API |
| `app/api/teaching/questions/route.ts` | 新增 | 题库 CRUD API |
| `app/api/teaching/analytics/*/route.ts` | 新增 | 学习分析 API |
| `app/api/teaching/classes/*/route.ts` | 新增 | 班级管理 API |
| `scripts/init-teaching-schema.sql` | 新增 | 数据库初始化脚本 |
| `scripts/migrate-knowledge.ts` | 新增 | 知识点数据迁移 |
| `scripts/generate-embeddings.ts` | 新增 | Embedding 批量生成 |
| `docker-compose.yml` | 修改 | 使用 pgvector 镜像 |
| `.env.example` | 修改 | 增加 RAG/Embedding 配置项 |
