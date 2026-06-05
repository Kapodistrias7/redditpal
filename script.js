const API_BASE_URL = window.location.origin;
const API_URL = `${API_BASE_URL}/api/posts`;

const container = document.getElementById("posts-container");
let retryCount = 0;
const MAX_RETRIES = 3;

// Fetch posts when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchPosts);
} else {
    fetchPosts();
}

// Refresh posts every 5 minutes
setInterval(fetchPosts, 5 * 60 * 1000);

async function fetchPosts() {
    container.innerHTML = generateSkeletons(6);

    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const posts = await response.json();

        if (!posts || (Array.isArray(posts) && posts.length === 0)) {
            showError('No posts available at the moment');
            return;
        }

        if (posts.error) {
            throw new Error(posts.error);
        }

        retryCount = 0;
        renderPosts(posts);
    } catch (error) {
        console.error("Error fetching posts:", error);
        
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            const delay = 10000 * retryCount;
            container.innerHTML = `
                <div class="col-span-full text-center py-16 md:py-24">
                    <h2 class="text-2xl md:text-3xl font-bold mb-3">
                        📡 Feed temporarily unavailable
                    </h2>
                    <p class="text-gray-500 text-sm md:text-base mb-2">
                        ${sanitizeError(error.message)}
                    </p>
                    <p class="text-gray-600 text-xs">
                        Retrying in ${delay / 1000} seconds... (Attempt ${retryCount}/${MAX_RETRIES})
                    </p>
                </div>
            `;
            setTimeout(fetchPosts, delay);
        } else {
            showError('Unable to load posts. Please refresh the page.');
        }
    }
}

function showError(message) {
    container.innerHTML = `
        <div class="col-span-full text-center py-16 md:py-24">
            <h2 class="text-2xl md:text-3xl font-bold mb-3">
                ⚠️ Feed Error
            </h2>
            <p class="text-gray-500 text-sm md:text-base mb-4">
                ${sanitizeError(message)}
            </p>
            <button onclick="location.reload()" class="px-4 py-2 bg-reddit text-white rounded-lg hover:bg-orange-600 transition-colors">
                Refresh Page
            </button>
        </div>
    `;
}

function renderPosts(posts) {
    if (!posts || posts.length === 0) {
        showError('No posts available at the moment');
        return;
    }

    container.innerHTML = posts.map(post => {
        const permalink = `https://reddit.com${post.permalink || ''}`;
        const timeAgoText = timeAgo(post.created_utc);
        const scoreFormatted = formatNumber(post.score || 0);
        const commentsFormatted = formatNumber(post.num_comments || 0);
        const author = post.author || "deleted";
        const title = post.title || "Untitled";
        const subreddit = post.subreddit || "programming";

        return `
            <a href="${sanitizeUrl(permalink)}" target="_blank" rel="noopener noreferrer"
                class="bg-cardbg border border-gray-800 rounded-xl p-4 md:p-5 flex flex-col transition-all duration-300 card-hover hover:border-reddit/30 block h-full">
                
                <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <span class="px-2 py-1 text-xs rounded bg-reddit/20 text-reddit font-medium">
                        r/${sanitizeText(subreddit)}
                    </span>
                    <span class="text-xs text-gray-500 whitespace-nowrap">
                        ${timeAgoText}
                    </span>
                </div>

                <h3 class="text-base md:text-lg font-semibold leading-snug mb-4 text-gray-100 line-clamp-3">
                    ${escapeHtml(title)}
                </h3>

                <div class="mt-auto border-t border-gray-800 pt-4">
                    <div class="flex justify-between items-center text-sm mb-3">
                        <div class="flex gap-4 text-gray-400">
                            <span class="flex items-center gap-1">
                                <span>▲</span>
                                <span>${scoreFormatted}</span>
                            </span>
                            <span class="flex items-center gap-1">
                                <span>💬</span>
                                <span>${commentsFormatted}</span>
                            </span>
                        </div>
                    </div>
                    <div class="text-xs text-gray-500 truncate">
                        by u/${sanitizeText(author)}
                    </div>
                </div>
            </a>
        `;
    }).join("");
}

function generateSkeletons(count) {
    return Array(count).fill(0).map(() => `
        <div class="bg-cardbg border border-gray-800 rounded-xl p-4 md:p-5 h-56 flex flex-col animate-pulse">
            <div class="skeleton h-5 rounded mb-4 w-20"></div>
            <div class="skeleton h-6 rounded mb-3 w-full"></div>
            <div class="skeleton h-6 rounded w-3/4 mb-8"></div>
            <div class="mt-auto">
                <div class="skeleton h-4 rounded w-1/3"></div>
            </div>
        </div>
    `).join("");
}

function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) num = 0;
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + "k";
    }
    return Math.floor(num).toString();
}

function timeAgo(timestamp) {
    if (!timestamp || typeof timestamp !== 'number') return "unknown";
    
    const seconds = Math.floor(Date.now() / 1000) - timestamp;
    if (seconds < 0) return "now";
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, size] of Object.entries(intervals)) {
        const value = Math.floor(seconds / size);
        if (value >= 1) {
            return `${value}${unit.charAt(0)} ago`;
        }
    }
    return "now";
}

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 30);
}

function sanitizeUrl(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.protocol === 'https:' || urlObj.protocol === 'http:') {
            return url;
        }
    } catch (e) {
        console.error('Invalid URL:', url);
    }
    return '#';
}

function sanitizeError(message) {
    if (typeof message !== 'string') return 'An unknown error occurred';
    return escapeHtml(message.substring(0, 100));
}
