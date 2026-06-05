const API_URL = "https://falling-rice-6899.httpsredditpalfstr640workersdev.workers.dev";

const container = document.getElementById("posts-container");

// Fetch posts when page loads
document.addEventListener("DOMContentLoaded", fetchPosts);

// Refresh posts every 5 minutes
setInterval(fetchPosts, 5 * 60 * 1000);

async function fetchPosts() {
    container.innerHTML = generateSkeletons(6);

    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const posts = await response.json();

        if (posts.maintenance) {
            container.innerHTML = `
                <div class="col-span-full text-center py-24">
                    <h2 class="text-4xl font-bold text-yellow-400 mb-4">
                        Under Maintenance
                    </h2>
                    <p class="text-gray-400">
                        ${posts.message}
                    </p>
                </div>
            `;
            return;
        }

        renderPosts(posts);
    } catch (error) {
        console.error("Error fetching posts:", error);
        container.innerHTML = `
            <div class="col-span-full text-center py-16 md:py-24">
                <h2 class="text-2xl md:text-3xl font-bold mb-3">
                    Feed unavailable
                </h2>
                <p class="text-gray-500 text-sm md:text-base">
                    ${error.message}
                </p>
                <p class="text-gray-600 text-xs mt-2">
                    Retrying automatically...
                </p>
            </div>
        `;
        // Retry after 10 seconds
        setTimeout(fetchPosts, 10000);
    }
}

function renderPosts(posts) {
    if (!posts || posts.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-16 md:py-20">
                <p class="text-gray-400">No posts available at the moment.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = posts.map(post => {
        const permalink = post.permalink || `https://reddit.com/r/${post.subreddit}/comments/${post.id}`;
        const timeAgoText = timeAgo(post.created_utc);
        const scoreFormatted = formatNumber(post.score);
        const commentsFormatted = formatNumber(post.num_comments);
        const author = post.author || "deleted";
        const title = post.title || "Untitled";
        const subreddit = post.subreddit || "programming";

        return `
            <a href="${permalink}" target="_blank" rel="noopener noreferrer"
                class="bg-cardbg border border-gray-800 rounded-xl p-4 md:p-5 flex flex-col transition-all duration-300 card-hover hover:border-reddit/30 block h-full">
                
                <div class="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <span class="px-2 py-1 text-xs rounded bg-reddit/20 text-reddit font-medium">
                        r/${subreddit}
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
                        by u/${author}
                    </div>
                </div>
            </a>
        `;
    }).join("");
}

function generateSkeletons(count) {
    return Array(count).fill(0).map(() => `
        <div class="bg-cardbg border border-gray-800 rounded-xl p-4 md:p-5 h-56 flex flex-col">
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
    if (typeof num !== 'number') num = 0;
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
}

function timeAgo(timestamp) {
    if (!timestamp) return "unknown";
    
    const seconds = Math.floor(Date.now() / 1000) - timestamp;
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
