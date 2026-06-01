// worker.js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle CORS preflight requests
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
    
    // Programming-related subreddits to scan
    const subreddits = ['programming', 'javascript', 'python', 'webdev', 'rust', 'golang', 'typescript', 'cpp'];
    
    // Reddit requires a descriptive, unique User-Agent
    const headers = {
      'User-Agent': 'RedditPal/1.0 (Educational Project; contact@redditpal.com)'
    };

    try {
      const fetchPromises = subreddits.map(sub => 
        fetch(`https://www.reddit.com/r/${sub}/${finalSort}.json?limit=15`, { headers })
          .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status} for r/${sub}`);
            return res.json();
          })
          .then(data => data.data.children.map(child => ({
            id: child.data.id,
            title: child.data.title,
            permalink: `https://reddit.com${child.data.permalink}`,
            subreddit: child.data.subreddit_name_prefixed,
            score: child.data.score,
            num_comments: child.data.num_comments,
            author: child.data.author,
            created_utc: child.data.created_utc,
            domain: child.data.domain
          })))
          .catch(err => {
            console.error(`Error fetching r/${sub}:`, err);
            return []; // Return empty array on failure to keep Promise.all alive
          })
      );

      const results = await Promise.all(fetchPromises);
      let posts = results.flat();

      // Secondary sorting to ensure consistent cross-subreddit ordering
      if (finalSort === 'hot') {
        posts.sort((a, b) => b.score - a.score); // Sort by virality (score)
      } else {
        posts.sort((a, b) => b.created_utc - a.created_utc); // Sort by date posted
      }

      // Limit to top 60 overall to keep payload small, fast, and respectful of Reddit's rate limits
      posts = posts.slice(0, 60);

      return new Response(JSON.stringify(posts), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=45' // Cache for 45s to reduce Reddit API load
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
