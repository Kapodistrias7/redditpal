const API_URL = "falling-rice-6899.httpsredditpalfstr640workersdev.workers.dev";

const container = document.getElementById("posts-container");

document.addEventListener("DOMContentLoaded", fetchPosts);

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
        container.innerHTML = `
            <div class="col-span-full text-center py-24">
                <h2 class="text-3xl font-bold mb-3">
                    Feed unavailable
                </h2>
                <p class="text-gray-500">
                    ${error.message}
                </p>
            </div>
        `;
    }
}

function renderPosts(posts) {
    if (!posts.length) {
        container.innerHTML = `
            <div class="col-span-full text-center py-20">
                No posts found.
            </div>
        `;
        return;
    }

    container.innerHTML = posts.map(post => `
        <a href="${post.permalink}" target="_blank" rel="noopener noreferrer"
            class="bg-cardbg border border-gray-800 rounded-xl p-5 flex flex-col transition-all duration-300 card-hover">
            <div class="flex justify-between mb-3">
                <span class="px-2 py-1 text-xs rounded bg-gray-800 text-reddit">
                    r/${post.subreddit}
                </span>
                <span class="text-xs text-gray-500">
                    ${timeAgo(post.created_utc)}
                </span>
            </div>
            <h3 class="text-lg font-semibold leading-snug mb-4">
                ${post.title}
            </h3>
            <div class="mt-auto border-t border-gray-800 pt-4">
                <div class="flex justify-between items-center text-sm">
                    <div class="flex gap-4">
                        <span>▲ ${formatNumber(post.score)}</span>
                        <span>💬 ${formatNumber(post.num_comments)}</span>
                    </div>
                    <span class="text-xs text-gray-500 truncate max-w-[100px]">
                        u/${post.author}
                    </span>
                </div>
            </div>
        </a>
    `).join("");
}

function generateSkeletons(count) {
    return Array(count).fill(0).map(() => `
        <div class="bg-cardbg border border-gray-800 rounded-xl p-5 h-56">
            <div class="skeleton h-5 rounded mb-4"></div>
            <div class="skeleton h-6 rounded mb-3"></div>
            <div class="skeleton h-6 rounded w-3/4 mb-8"></div>
            <div class="skeleton h-4 rounded"></div>
        </div>
    `).join("");
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + "k";
    }
    return num;
}

function timeAgo(timestamp) {
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
            return `${value} ${unit}${value > 1 ? "s" : ""} ago`;
        }
    }
    return "just now";
}
