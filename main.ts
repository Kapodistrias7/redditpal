// main.ts
import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const sort = url.searchParams.get('sort') || 'hot';
  
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      }
    });
  }
  
  // Your Reddit fetching logic
  const data = await fetchRedditPosts(sort);
  
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
});
