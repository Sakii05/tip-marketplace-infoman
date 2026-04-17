export async function onRequestPost(context) {
    try {
        const body = await context.request.json();

        // Insert into Cloudflare D1
        const stmt = context.env.DB.prepare(`
      INSERT INTO users (full_name, email, password_hash, course) 
      VALUES (?, ?, ?, ?) RETURNING *
    `).bind(body.name, body.email, btoa(body.password), body.course);

        const result = await stmt.first();

        return new Response(JSON.stringify({ user: result }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        // If email already exists or D1 fails, it sends the error back to app.js
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }
}

export async function onRequestGet(context) {
    try {
        const { results } = await context.env.DB.prepare(`SELECT * FROM users`).all();
        return new Response(JSON.stringify(results), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}