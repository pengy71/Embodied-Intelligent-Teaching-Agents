-- ============================================================
-- 具身智能课程教学智能体 - 数据库初始化脚本
-- PostgreSQL 16 + pgvector
-- ============================================================

-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 一、用户与班级管理
-- ============================================================

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
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);

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
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_student_no ON students(student_no);

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
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);

CREATE TABLE IF NOT EXISTS class_students (
    class_id    TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id  TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (class_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id);

-- ============================================================
-- 二、知识体系（规范化存储）
-- ============================================================

CREATE TABLE IF NOT EXISTS knowledge_modules (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    color       TEXT,
    description TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
CREATE INDEX IF NOT EXISTS idx_chapters_module ON knowledge_chapters(module_id);

CREATE TABLE IF NOT EXISTS knowledge_sections (
    id          TEXT PRIMARY KEY,
    chapter_id  TEXT NOT NULL REFERENCES knowledge_chapters(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sections_chapter ON knowledge_sections(chapter_id);

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
CREATE INDEX IF NOT EXISTS idx_points_section ON knowledge_points(section_id);

CREATE TABLE IF NOT EXISTS knowledge_relations (
    id              SERIAL PRIMARY KEY,
    source_id       TEXT NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
    target_id       TEXT NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
    relation_type   TEXT NOT NULL
                    CHECK (relation_type IN ('prerequisite', 'related', 'case', 'experiment')),
    UNIQUE (source_id, target_id, relation_type)
);
CREATE INDEX IF NOT EXISTS idx_relations_source ON knowledge_relations(source_id);
CREATE INDEX IF NOT EXISTS idx_relations_target ON knowledge_relations(target_id);

CREATE TABLE IF NOT EXISTS common_mistakes (
    id          TEXT PRIMARY KEY,
    point_id    TEXT NOT NULL REFERENCES knowledge_points(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    wrong       TEXT NOT NULL,
    right_answer TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mistakes_point ON common_mistakes(point_id);

-- 知识文档全文缓存（兼容旧接口）
CREATE TABLE IF NOT EXISTS teaching_knowledge (
    id          TEXT PRIMARY KEY DEFAULT 'default',
    data        JSONB NOT NULL,
    version     INTEGER NOT NULL DEFAULT 1,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 三、向量存储 (pgvector)
-- ============================================================

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
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON knowledge_embeddings
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_embeddings_point ON knowledge_embeddings(point_id);

CREATE TABLE IF NOT EXISTS resource_embeddings (
    id              SERIAL PRIMARY KEY,
    resource_id     TEXT NOT NULL,
    chunk_index     INTEGER NOT NULL,
    chunk_text      TEXT NOT NULL,
    page_number     INTEGER,
    embedding       vector(1536) NOT NULL,
    model           TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (resource_id, chunk_index, model)
);
CREATE INDEX IF NOT EXISTS idx_resource_embeddings_vector ON resource_embeddings
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_resource_embeddings_resource ON resource_embeddings(resource_id);

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
CREATE INDEX IF NOT EXISTS idx_embedding_jobs_status ON embedding_jobs(status);

-- ============================================================
-- 四、教学资源（增强版）
-- ============================================================

CREATE TABLE IF NOT EXISTS teaching_resources (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    type             TEXT NOT NULL,
    mime             TEXT NOT NULL DEFAULT '',
    size             BIGINT NOT NULL DEFAULT 0,
    status           TEXT NOT NULL DEFAULT 'pending',
    parsed_text      TEXT,
    point_ids        JSONB NOT NULL DEFAULT '[]'::jsonb,
    error            TEXT,
    content          BYTEA,
    uploaded_by      TEXT,
    chapter_ids      JSONB NOT NULL DEFAULT '[]'::jsonb,
    embedding_status TEXT NOT NULL DEFAULT 'pending',
    chunk_count      INTEGER DEFAULT 0,
    metadata         JSONB DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 五、学习记录与分析
-- ============================================================

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
CREATE INDEX IF NOT EXISTS idx_progress_student ON learning_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_point ON learning_progress(point_id);
CREATE INDEX IF NOT EXISTS idx_progress_class ON learning_progress(class_id);

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
CREATE INDEX IF NOT EXISTS idx_events_student_time ON learning_events(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON learning_events(event_type);

-- ============================================================
-- 六、答疑系统
-- ============================================================

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
CREATE INDEX IF NOT EXISTS idx_qa_sessions_student ON qa_sessions(student_id);

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
CREATE INDEX IF NOT EXISTS idx_qa_messages_session ON qa_messages(session_id, created_at);

-- ============================================================
-- 七、练习与测试
-- ============================================================

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
    created_by      TEXT,
    is_ai_generated BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_chapter ON questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_points ON questions USING gin(point_ids);

CREATE TABLE IF NOT EXISTS exam_papers (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT,
    class_id        TEXT REFERENCES classes(id) ON DELETE SET NULL,
    created_by      TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_papers_class ON exam_papers(class_id);
CREATE INDEX IF NOT EXISTS idx_papers_status ON exam_papers(status);

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
CREATE INDEX IF NOT EXISTS idx_attempts_student ON practice_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_question ON practice_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_attempts_paper ON practice_attempts(paper_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student_time ON practice_attempts(student_id, created_at DESC);

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
CREATE INDEX IF NOT EXISTS idx_wrong_student ON wrong_questions(student_id);

-- ============================================================
-- 八、学习推荐与路径
-- ============================================================

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
CREATE INDEX IF NOT EXISTS idx_paths_student ON learning_paths(student_id);

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
CREATE INDEX IF NOT EXISTS idx_recommendations_student ON ai_recommendations(student_id, created_at DESC);

-- ============================================================
-- 九、教学分析
-- ============================================================

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
CREATE INDEX IF NOT EXISTS idx_analytics_class_date ON class_analytics(class_id, snapshot_date DESC);

-- ============================================================
-- 十、RAG 对话上下文
-- ============================================================

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
CREATE INDEX IF NOT EXISTS idx_rag_conv_student ON rag_conversations(student_id);
