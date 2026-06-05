# RedditPal 🚀

A curated Reddit programming feed that intelligently ranks posts from multiple programming communities using an advanced ranking algorithm that considers upvotes, comments, and time decay.

## Features

✨ **Smart Ranking Algorithm**
- Formula: `Ranking = (WeightUpvote × U) + (WeightComment × C) × TimeDecay`
- Dynamic weighting between upvotes (60%) and comments (40%)
- Time decay factor to prioritize fresh content
- Transparent algorithm (hidden from frontend)

🎨 **Modern UI**
- Dark theme with Reddit orange accents
- Fully responsive mobile-first design
- Smooth animations and loading skeletons
- Ad spaces for monetization

🔄 **Auto-Refresh**
- Posts refresh automatically every 5 minutes
- Intelligent caching (5-minute TTL)
- Automatic retry on failure

📱 **Mobile Optimized**
- Perfect scaling on all devices
- Touch-friendly interface
- Adaptive layouts

## Tech Stack

**Frontend:**
- HTML5 + CSS3
- Tailwind CSS for styling
- Vanilla JavaScript

**Backend:**
- Node.js with Express
- Reddit API integration (no authentication required)
- Aggressive caching for performance

## Setup & Installation

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Local Development

1. **Clone the repository:**
```bash
git clone https://github.com/Kapodistrias7/redditpal.git
cd redditpal
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create environment file:**
```bash
cp .env.example .env
```

4. **Start the development server:**
```bash
npm run dev
# or for production
npm start
```

Server runs on `http://localhost:3000`

5. **Update API URL in script.js** (if needed):
```javascript
const API_URL = "http://localhost:3000/api/posts";
```

## Deployment

### Deploy on Heroku

1. **Install Heroku CLI and login:**
```bash
heroku login
```

2. **Create a new Heroku app:**
```bash
heroku create your-app-name
```

3. **Deploy:**
```bash
git push heroku main
```

4. **Update API_URL in script.js:**
```javascript
const API_URL = "https://your-app-name.herokuapp.com/api/posts";
```

### Deploy on Vercel (Frontend only, requires separate backend)

1. Connect your GitHub repository
2. Deploy with one click
3. Set environment variables in project settings

### Deploy on DigitalOcean

1. Create a droplet with Node.js
2. Clone repository
3. Install dependencies
4. Use PM2 for process management:
```bash
npm install -g pm2
pm2 start server.js
pm2 startup
pm2 save
```

## API Endpoints

### Get Ranked Posts
```
GET /api/posts
```

Returns an array of top 25 ranked Reddit posts from programming communities.

**Response:**
```json
[
  {
    "id": "abc123",
    "title": "How to optimize React performance",
    "subreddit": "reactjs",
    "author": "john_doe",
    "score": 5000,
    "num_comments": 150,
    "created_utc": 1686000000,
    "permalink": "/r/reactjs/comments/abc123/...",
    "url": "https://..."
  }
]
```

### Health Check
```
GET /api/health
```

Returns server status.

## Configuration

Edit `server.js` to customize:

```javascript
// Subreddits to monitor
const SUBREDDITS = ['programming', 'javascript', 'webdev', 'reactjs', ...];

// Ranking weights (sum should be 1.0)
const WEIGHT_UPVOTE = 0.6;    // 60% weight for upvotes
const WEIGHT_COMMENT = 0.4;   // 40% weight for comments

// Time decay (how old posts before they drop significantly)
const TIME_DECAY_HOURS = 24;  // 24-hour half-life

// Maximum posts to return
const POST_LIMIT = 25;

// Cache TTL in milliseconds
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

## Ranking Algorithm Explanation

The ranking formula combines three factors:

1. **Upvote Score** (60% weight)
   - Higher weight given to popular posts
   - Direct correlation with community approval

2. **Comment Count** (40% weight)
   - Measures engagement and discussion
   - Lower weight than upvotes to avoid noise

3. **Time Decay** (exponential)
   - Newer posts ranked higher
   - Half-life of 24 hours (configurable)
   - Formula: `0.5^(age_in_hours / 24)`

**Final Ranking:**
```
Rank = (0.6 × upvotes) + (0.4 × comments) × timeDecay
```

Example:
- Post A: 1000 upvotes, 100 comments, 1 hour old
  - Rank = (0.6 × 1000) + (0.4 × 100) × 0.97 ≈ 638.8

- Post B: 500 upvotes, 200 comments, 2 hours old
  - Rank = (0.6 × 500) + (0.4 × 200) × 0.95 ≈ 376

Post A ranked higher despite lower comment count due to recency.

## Performance Optimizations

- **Caching:** 5-minute cache prevents excessive API calls
- **Batch Processing:** Fetches from all subreddits simultaneously
- **Filtering:** Removes sticky/pinned posts
- **Rate Limiting:** Respects Reddit API rate limits
- **User-Agent:** Proper identification for Reddit API

## Troubleshooting

### Posts not loading?
1. Check browser console (F12) for errors
2. Verify server is running: `curl http://localhost:3000/api/health`
3. Ensure API_URL in script.js is correct
4. Check that port 3000 is not blocked by firewall

### Styling issues?
- Clear browser cache
- Ensure Tailwind CDN is loading
- Check browser developer tools for CSS errors

### Reddit API errors?
- Reddit API doesn't require authentication for public data
- Each request includes proper User-Agent header
- Rate limit: ~60 requests per minute per IP

## Contributing

Contributions welcome! Areas for improvement:
- Additional ranking factors (upvote velocity, sentiment analysis)
- User preferences and filtering
- Dark/light theme toggle
- Search functionality
- Comment threads preview
- Subreddit selection UI

## License

MIT License - feel free to use for personal or commercial projects

## Support

For issues or questions:
1. Check existing GitHub issues
2. Create a new issue with detailed information
3. Include error messages and browser console logs

## Roadmap

- [ ] User authentication and preferences
- [ ] Customizable subreddits
- [ ] Advanced filtering and search
- [ ] Comment threads integration
- [ ] Mobile app (React Native)
- [ ] Email digest feature
- [ ] Browser extension

---

Made with ❤️ for the programming community
