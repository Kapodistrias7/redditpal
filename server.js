// server.js - Production-ready RedditPal Backend
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Middleware
app.use(cors({
    origin: CORS_ORIGIN,
    methods: ['GET', 'HEAD'],
    credentials: true,
    maxAge: 86400
}));

app.use(express.static('public', {
    maxAge: '1d',
    etag: false
}));

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});

// Configuration
const SUBREDDITS = ['programming', 'javascript', 'webdev', 'reactjs', 'node', 'typescript', 'learnprogramming'];
const WEIGHT_UPVOTE = 0.6;
const WEIGHT_COMMENT = 0.4;
const TIME_DECAY_HOURS = 24;
const POST_LIMIT = 25;
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '300000');
const FETCH_TIMEOUT = 10000; // 10 seconds

// In-memory cache
let cachedPosts = null;
let cacheTimestamp = 0;
let fetchInProgress = false;

// Logger
const logger = {
    info: (msg) => console.log(`[${new Date().toISOString()}] INFO: ${msg}`),
    error: (msg) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`),
    warn: (msg) => console.warn(`[${new Date().toISOString()}] WARN: ${msg}`)
};

// Calculate ranking score
function calculateRank(score, numComments, createdUtc) {
    const ageHours = (Date.now() / 1000 - createdUtc) / 3600;
    const timeDecay = Math.pow(0.5, ageHours / TIME_DECAY_HOURS);
    const rank = (WEIGHT_UPVOTE * score) + (WEIGHT_COMMENT * numComments) * timeDecay;
    return rank;
}

// Fetch posts from Reddit API with timeout
async function fetchRedditPosts() {
    try {
        const allPosts = [];
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        const fetchPromises = SUBREDDITS.map(subreddit =>
            fetch(
                `https://www.reddit.com/r/${subreddit}/top.json?t=day&limit=100`,
                {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': process.env.USER_AGENT || 'RedditPal/1.0 (Programming Feed Aggregator)'
                    }
                }
            )
                .then(async (response) => {
                    if (!response.ok) {
                        logger.warn(`Failed to fetch r/${subreddit}: ${response.status}`);
                        return [];
                    }
                    const data = await response.json();
                    return data.data.children.map(post => post.data);
                })
                .catch((error) => {
                    logger.warn(`Error fetching r/${subreddit}: ${error.message}`);
                    return [];
                })
        );

        const results = await Promise.all(fetchPromises);
        clearTimeout(timeoutId);

        results.forEach(posts => {
            const processedPosts = posts
                .filter(post => post && !post.stickied && !post.pinned && !post.archived)
                .map(post => ({
                    id: post.id,
                    title: post.title,
                    subreddit: post.subreddit,
                    author: post.author,
                    score: post.score || 0,
                    num_comments: post.num_comments || 0,
                    created_utc: post.created_utc,
                    permalink: post.permalink,
                    url: post.url
                }));
            allPosts.push(...processedPosts);
        });

        // Calculate ranking and sort
        const rankedPosts = allPosts
            .map(post => ({
                ...post,
                rank: calculateRank(post.score, post.num_comments, post.created_utc)
            }))
            .sort((a, b) => b.rank - a.rank)
            .slice(0, POST_LIMIT)
            .map(({ rank, ...post }) => post); // Remove rank field from response

        logger.info(`Fetched and ranked ${rankedPosts.length} posts`);
        return rankedPosts;
    } catch (error) {
        logger.error(`Error fetching Reddit posts: ${error.message}`);
        return [];
    }
}

// Background cache refresh
async function refreshCache() {
    if (fetchInProgress) return;

    fetchInProgress = true;
    try {
        const posts = await fetchRedditPosts();
        if (posts && posts.length > 0) {
            cachedPosts = posts;
            cacheTimestamp = Date.now();
            logger.info('Cache updated successfully');
        }
    } finally {
        fetchInProgress = false;
    }
}

// Initial cache load
await refreshCache();

// Refresh cache on interval
setInterval(refreshCache, CACHE_TTL);

// API endpoints
app.get('/api/posts', async (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=60');

    try {
        // Return cached posts if available
        if (cachedPosts && cachedPosts.length > 0) {
            return res.json(cachedPosts);
        }

        // If no cache, fetch fresh data
        if (!fetchInProgress) {
            fetchInProgress = true;
            const posts = await fetchRedditPosts();
            if (posts && posts.length > 0) {
                cachedPosts = posts;
                cacheTimestamp = Date.now();
                fetchInProgress = false;
                return res.json(posts);
            }
            fetchInProgress = false;
        }

        // Return cached data if available, or empty array
        return res.status(200).json(cachedPosts || []);
    } catch (error) {
        logger.error(`API Error: ${error.message}`);
        res.status(500).json({
            error: 'Failed to fetch posts',
            posts: cachedPosts || []
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        cached: cachedPosts !== null,
        postCount: cachedPosts ? cachedPosts.length : 0
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error(`Unhandled error: ${err.message}`);
    res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

const server = app.listen(PORT, () => {
    logger.info(`RedditPal server running on port ${PORT} (${NODE_ENV})`);
});
