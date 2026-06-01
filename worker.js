// worker.js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 1. Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const sort = url.searchParams.get('sort') || 'hot';
    const validSorts = ['hot', 'new'];
    const finalSort = validSorts.includes(sort) ? sort : 'hot';
    
    const subreddits = ['programming', 'javascript', 'python', 'webdev', 'rust', 'golang', 'typescript', 'cpp'];
    
    // Reddit requires a highly descriptive User-Agent. 
    // Tip: If you have a Reddit account, change this to 'RedditPal/1.0 (by /u/YourActualUsername)'
    const headers = {
      'User-Agent': 'RedditPal/1.0 (Educational Project; contact: admin@redditpal.com)'
    };

    try {
      const fetchPromises = subreddits.map(async (sub) => {
        try {
          const res = await fetch(`https://www.reddit.com/r/${sub}/${finalSort}.json?limit=15`, { headers });
          
          if (res.status === 403) {
            console.warn(`Reddit blocked r/${sub} (403 Forbidden). User-Agent may be flagged.`);
            return [];
          }
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} for r/${sub}`);
          }
          
          const data = await res.json();
          return data.data.children.map(child => ({
            id: child.data.id,
            title: child.data.title,
            permalink: `https://reddit.com${child.data.permalink}`,
            subreddit: child.data.subreddit_name_prefixed,
            score: child.data.score,
            num_comments: child.data.num_comments,
            author: child.data.author,
            created_utc: child.data.created_utc,
            domain: child.data.domain
          }));
        } catch (err) {
          console.error(`Fetch error r/${sub}:`, err.message);
          return []; 
        }
      });

      const results = await Promise.all(fetchPromises);
      let posts = results.flat();

      // Sort globally
      if (finalSort === 'hot') {
        posts.sort((a, b) => b.score - a.score);
      } else {
        posts.sort((a, b) => b.created_utc - a.created_utc);
      }

      // Return top 60
      posts = posts.slice(0, 60);

      // If Reddit blocked everything, return an empty array (handled by frontend demo mode)
      if (posts.length === 0) {
         return new Response(JSON.stringify({ error: "Reddit API returned no data (likely rate-limited or blocked)." }), {
            status: 503,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
         });
      }

      return new Response(JSON.stringify(posts), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=60'
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: `Worker Crash: ${error.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
  }
};
