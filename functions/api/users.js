export async function onRequestPost(context) {
    const { env, request } = context;

    try {
        // 1. Get the data sent from the registration form in app.js
        const body = await request.json();

        // 2. Map the frontend names to match your Supabase database columns
        const dbPayload = {
            full_name: body.name,
            email: body.email,
            password_hash: btoa(body.password), // Encrypting to match your login logic
            course: body.course
        };

        // 3. Send the formatted data to Supabase
        const response = await fetch(`${env.SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: {
                'apikey': env.SUPABASE_KEY,
                'Authorization': `Bearer ${env.SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation' // Tells Supabase to send back the created user
            },
            body: JSON.stringify(dbPayload)
        });

        // 4. Handle database rejections (e.g., email already exists)
        if (!response.ok) {
            const errorData = await response.json();
            return new Response(JSON.stringify({ error: errorData.message || 'Database error' }), { status: 400 });
        }

        // 5. Success! Return the new user data
        const newUsers = await response.json();
        return new Response(JSON.stringify({ user: newUsers[0] }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (err) {
        // Catch any server crashes
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}