import { pool } from '@/lib';

export async function GET() {
  try {
    // Total number of migration projects (export jobs)
    const projectsResult = await pool.query(`SELECT COUNT(*) AS projects FROM export_jobs`);
    const { projects } = projectsResult[0] || { projects: 0 };

    // Total number of transferred items (exported items)
    const transfersResult = await pool.query(`SELECT COUNT(*) AS transfers FROM exported_items`);
    const { transfers } = transfersResult[0] || { transfers: 0 };

    return Response.json({ projects: Number(projects), transfers: Number(transfers) });
  } catch (error) {
    console.error('Failed to fetch stats', error);
    return Response.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
