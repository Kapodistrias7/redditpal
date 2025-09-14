document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('searchBtn');
    const keywordInput = document.getElementById('keyword');
    const sortSelect = document.getElementById('sort');
    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    const searchForm = document.getElementById('searchForm');

    // Subreddits to search
    const subreddits = [
        'reactjs',
        'django',
        'vuejs',
        'ProgrammingIdeas',
        'learnprogramming',
        'programming',
        'opensource'
    ];

    // Helper: format date
    function timeAgo(date) {
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        let interval = Math.floor(seconds / 31536000);
        if (interval >= 1) return interval + " year" + (interval > 1 ? "s" : "") + " ago";
        interval = Math.floor(seconds / 2592000);
        if (interval >= 1) return interval + " month" + (interval > 1 ? "s" : "") + " ago";
        interval = Math.floor(seconds / 86400);
        if (interval >= 1) return interval + " day" + (interval > 1 ? "s" : "") + " ago";
        interval = Math.floor(seconds / 3600);
        if (interval >= 1) return interval + " hour" + (interval > 1 ? "s" : "") + " ago";
        interval = Math.floor(seconds / 60);
        if (interval >= 1) return interval + " minute" + (interval > 1 ? "s" : "") + " ago";
        return "just now";
    }

    // Fetch posts from Reddit
    async function fetchPosts(keyword) {
        let allPosts = [];
        for (const subreddit of subreddits) {
            const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(keyword)}&restrict_sr=1&sort=relevance&limit=10`;
            try {
                const response = await fetch(url);
                const data = await response.json();
                const posts = data.data.children.map(child => child.data);
                allPosts = allPosts.concat(posts);
            } catch (e) {
                // Ignore errors
            }
        }
        return allPosts;
    }

    // Sort posts
    function sortPosts(posts, sortBy) {
        if (sortBy === 'upvotes') {
            return posts.sort((a, b) => b.ups - a.ups);
        } else if (sortBy === 'date') {
            return posts.sort((a, b) => b.created_utc - a.created_utc);
        } else {
            return posts;
        }
    }

    // Render posts
    function renderPosts(posts, keyword) {
        resultsDiv.innerHTML = '';
        if (posts.length === 0) {
            resultsDiv.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    No results found for <strong>${keyword}</strong>.
                </div>
            `;
            return;
        }
        posts.forEach(post => {
            // Build Reddit thread link
            const threadUrl = `https://reddit.com${post.permalink}`;
            // Subreddit link
            const subredditUrl = `https://www.reddit.com/r/${post.subreddit}/search?q=${encodeURIComponent(keyword)}&restrict_sr=1`;
            resultsDiv.innerHTML += `
                <div class="result-card">
                    <div class="result-header">
                        <div class="result-upvotes"><i class="fas fa-arrow-up"></i> ${post.ups}</div>
                        <div class="result-date">${timeAgo(new Date(post.created_utc * 1000))}</div>
                    </div>
                    <h3 class="result-title">${post.title}</h3>
                    <p class="result-content">${post.selftext ? post.selftext.substring(0, 200) + '...' : ''}</p>
                    <div class="result-footer">
                        <a href="${subredditUrl}" class="result-subreddit" target="_blank">r/${post.subreddit}</a>
                        <a href="${threadUrl}" class="result-link" target="_blank">View thread <i class="fas fa-external-link-alt"></i></a>
                    </div>
                </div>
            `;
        });
    }

    // MAIN SEARCH HANDLER
    async function handleSearch(e) {
        e?.preventDefault();

        const keyword = keywordInput.value.trim();
        const sortBy = sortSelect.value;
        if (!keyword) {
            alert('Please enter a framework or technology to search for');
            return;
        }

        // Button UX improvements
        searchBtn.disabled = true;
        addButtonRipple(searchBtn, e);

        loadingDiv.style.display = 'block';
        resultsDiv.innerHTML = '';

        const posts = await fetchPosts(keyword);
        const sortedPosts = sortPosts(posts, sortBy);
        renderPosts(sortedPosts, keyword);

        loadingDiv.style.display = 'none';
        searchBtn.disabled = false;
    }

    // Ripple effect
    function addButtonRipple(button, e) {
        if (!e) return;
        // Remove any leftover ripples
        const oldRipple = button.querySelector('.btn-ripple');
        if (oldRipple) oldRipple.remove();

        const circle = document.createElement('span');
        circle.className = 'btn-ripple';
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        circle.style.width = circle.style.height = `${size}px`;

        // Get click coordinates relative to button
        let x = e.type.startsWith('touch') 
            ? e.touches[0].clientX - rect.left
            : e.clientX - rect.left;
        let y = e.type.startsWith('touch')
            ? e.touches[0].clientY - rect.top
            : e.clientY - rect.top;

        circle.style.left = `${x - size / 2}px`;
        circle.style.top = `${y - size / 2}px`;

        button.appendChild(circle);
        circle.addEventListener('animationend', () => circle.remove());
    }

    // Events
    searchForm.addEventListener('submit', handleSearch);
    searchBtn.addEventListener('click', handleSearch);
    searchBtn.addEventListener('touchstart', function(e){ addButtonRipple(searchBtn, e); });
    keywordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch(e);
        }
    });
});
