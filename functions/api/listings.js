export async function onRequestGet(context) {
  try {
    // env.DB is the binding you just created!
    const { results } = await context.env.DB.prepare(`
      SELECT l.*, u.full_name as seller_name, c.name as category_name
      FROM listings l
      JOIN users u ON l.seller_id = u.user_id
      LEFT JOIN categories c ON l.category_id = c.category_id
      WHERE l.status = 'active'
      ORDER BY l.created_at DESC
    `).all();

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}