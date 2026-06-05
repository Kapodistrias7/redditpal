// server.js - Backend for RedditPal
// Install dependencies: npm install express cors node-fetch dotenv

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend
app.use(cors());
app.use(express.static('public'));

// Configuration
const SUBREDDITS = ['programming', 'javascript', 'webdev', 'reactjs', 'node', 'typescript', 'learnprogramming'];
const WEIGHT_UPVOTE = 0.6;
const WEIGHT_COMMENT = 0.4;
const TIME_DECAY_HOURS = 24;
const POST_LIMIT = 25;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory cache
let cachedPosts = null;
let cacheTimestamp = 0;

// Calculate ranking score
function calculateRank(score, numComments, createdUtc) {
    const ageHours = (Date.now() / 1000 - createdUtc) / 3600;
    const timeDecay = Math.pow(0.5, ageHours / TIME_DECAY_HOURS);
    
    const rank = (WEIGHT_UPVOTE * score) + (WEIGHT_COMMENT * numComments) * timeDecay;
    return rank;
}

// Fetch posts from Reddit API
async function fetchRedditPosts() {
    try {
        const allPosts = [];

        for (const subreddit of SUBREDDITS) {
            const url = `https://www.reddit.com/r/${subreddit}/top.json?t=day&limit=100`;
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'RedditPal/1.0 (Programming Feed Aggregator)'
                }
            });

            if (!response.ok) {
                console.error(`Failed to fetch r/${subreddit}: ${response.status}`);
                continue;
            }

            const data = await response.json();
            const posts = data.data.children.map(post => post.data);

            // Filter and extract relevant fields
            const processedPosts = posts
                .filter(post => !post.stickied && !post.pinned)
                .map(post => ({
                    id: post.id,
                    title: post.title,
                    subreddit: post.subreddit,
                    author: post.author,
                    score: post.score,
                    num_comments: post.num_comments,
                    created_utc: post.created_utc,
                    permalink: post.permalink,
                    url: post.url,
                    selftext: post.selftext ? post.selftext.substring(0, 200) : '',
                }));

            allPosts.push(...processedPosts);
        }

        // Calculate ranking and sort
        const rankedPosts = allPosts
            .map(post => ({
                ...post,
                rank: calculateRank(post.score, post.num_comments, post.created_utc)
            }))
            .sort((a, b) => b.rank - a.rank)
            .slice(0, POST_LIMIT)
            .map(({ rank, ...post }) => post); // Remove rank field from response

        return rankedPosts;
    } catch (error) {
        console.error('Error fetching Reddit posts:', error);
        return [];
    }
}

// API endpoint
app.get('/api/posts', async (req, res) => {
    try {
        // Check cache
        if (cachedPosts && (Date.now() - cacheTimestamp) < CACHE_TTL) {
            return res.json(cachedPosts);
        }

        // Fetch fresh posts
        const posts = await fetchRedditPosts();
        
        if (!posts || posts.length === 0) {
            return res.status(503).json({
                error: 'Unable to fetch posts from Reddit at the moment',
                posts: cachedPosts || []
            });
        }

        // Update cache
        cachedPosts = posts;
        cacheTimestamp = Date.now();

        res.json(posts);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            error: 'Internal server error',
            posts: cachedPosts || []
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`RedditPal server running on port ${PORT}`);
});
