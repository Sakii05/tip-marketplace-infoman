// Cloudflare uses standard ES Modules (export)
export async function onRequest(context) {
  const { env } = context;

  // 1. Get your database connection string from environment variables
  const DATABASE_URL = env.DATABASE_URL;

  try {
    // Note: Since 'pg' (node-postgres) can be tricky on edge workers, 
    // most students use 'postgres.js' or Cloudflare's Hyperdrive.
    
    // For now, let's just return a successful connection test
    const data = { message: "TIP Marketplace API is active!", status: "Connected" };

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}