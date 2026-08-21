// scripts/migrate-knowledge-data.ts
import { Pool } from 'pg';
import { modules, chapters, commonMistakes } from '../lib/teaching/knowledge-system';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://openmaic:openmaic-dev@localhost:5433/openmaic';

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    console.log('开始迁移知识体系数据...');

    // 1. 迁移知识模块
    console.log(`  迁移 ${modules.length} 个知识模块...`);
    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i];
      await client.query(
        `INSERT INTO knowledge_modules (id, name, color, description, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET name=$2, color=$3, description=$4, sort_order=$5, updated_at=now()`,
        [mod.id, mod.name, mod.color, mod.description, i],
      );
    }

    // 2. 迁移章节、节、知识点
    let totalSections = 0,
      totalPoints = 0;
    const allRelations: Array<{ source: string; target: string; type: string }> = [];

    for (let ci = 0; ci < chapters.length; ci++) {
      const ch = chapters[ci];
      await client.query(
        `INSERT INTO knowledge_chapters (id, module_id, number, title, part, summary, is_case_study, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO UPDATE SET module_id=$2, number=$3, title=$4, part=$5, summary=$6, is_case_study=$7, sort_order=$8, updated_at=now()`,
        [ch.id, ch.moduleId, ch.number, ch.title, ch.part, ch.summary, ch.isCaseStudy ?? false, ci],
      );

      for (let si = 0; si < ch.sections.length; si++) {
        const section = ch.sections[si];
        totalSections++;
        await client.query(
          `INSERT INTO knowledge_sections (id, chapter_id, title, sort_order) VALUES ($1,$2,$3,$4)
           ON CONFLICT (id) DO UPDATE SET chapter_id=$2, title=$3, sort_order=$4`,
          [section.id, ch.id, section.title, si],
        );

        for (let pi = 0; pi < section.points.length; pi++) {
          const point = section.points[pi];
          totalPoints++;
          await client.query(
            `INSERT INTO knowledge_points (id, section_id, title, summary, sort_order)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (id) DO UPDATE SET section_id=$2, title=$3, summary=$4, sort_order=$5, updated_at=now()`,
            [point.id, section.id, point.title, point.summary ?? null, pi],
          );
          for (const p of point.prerequisites ?? [])
            allRelations.push({ source: p, target: point.id, type: 'prerequisite' });
          for (const r of point.related ?? [])
            allRelations.push({ source: point.id, target: r, type: 'related' });
          for (const c of point.cases ?? [])
            allRelations.push({ source: point.id, target: c, type: 'case' });
          for (const e of point.experiments ?? [])
            allRelations.push({ source: point.id, target: e, type: 'experiment' });
        }
      }
    }

    // 3. 插入关系（使用 SAVEPOINT 跳过无效引用）
    console.log(`  插入 ${allRelations.length} 条知识关系...`);
    let ok = 0,
      skip = 0;
    for (const rel of allRelations) {
      await client.query('SAVEPOINT sp_rel');
      try {
        await client.query(
          `INSERT INTO knowledge_relations (source_id, target_id, relation_type) VALUES ($1,$2,$3)
           ON CONFLICT (source_id, target_id, relation_type) DO NOTHING`,
          [rel.source, rel.target, rel.type],
        );
        ok++;
      } catch {
        await client.query('ROLLBACK TO SAVEPOINT sp_rel');
        skip++;
      }
    }

    // 4. 迁移常见错误
    console.log(`  迁移 ${commonMistakes.length} 个常见错误...`);
    for (const m of commonMistakes) {
      await client.query(
        `INSERT INTO common_mistakes (id, point_id, title, wrong, right_answer) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET point_id=$2, title=$3, wrong=$4, right_answer=$5`,
        [m.id, m.pointId, m.title, m.wrong, m.right],
      );
    }

    // 5. JSONB 缓存
    console.log('  更新 JSONB 缓存...');
    await client.query(
      `INSERT INTO teaching_knowledge (id, data, version, updated_at)
       VALUES ('default', $1, 1, now())
       ON CONFLICT (id) DO UPDATE SET data=$1, version=teaching_knowledge.version+1, updated_at=now()`,
      [JSON.stringify({ modules, chapters, commonMistakes })],
    );

    await client.query('COMMIT');

    console.log('\n=== 迁移完成 ===');
    console.log(
      `模块:${modules.length} 章节:${chapters.length} 节:${totalSections} 知识点:${totalPoints} 关系:${ok}(跳过${skip}) 错误:${commonMistakes.length}`,
    );

    const c = await pool.query(`
      SELECT (SELECT count(*) FROM knowledge_modules) as modules,
             (SELECT count(*) FROM knowledge_chapters) as chapters,
             (SELECT count(*) FROM knowledge_sections) as sections,
             (SELECT count(*) FROM knowledge_points) as points,
             (SELECT count(*) FROM knowledge_relations) as relations,
             (SELECT count(*) FROM common_mistakes) as mistakes,
             (SELECT count(*) FROM teaching_knowledge) as cache`);
    console.log('数据库验证:', JSON.stringify(c.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('迁移失败:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}
migrate().catch(console.error);
