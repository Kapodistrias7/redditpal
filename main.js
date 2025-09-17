document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('searchForm');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');

    // Curated list of programming/coding subreddits
    const subreddits = [
        'programming', 'learnprogramming', 'webdev', 'coding', 'cscareerquestions',
        'javascript', 'python', 'reactjs', 'cpp', 'java', 'compsci', 'gamedev',
        'opensource', 'devops', 'dotnet', 'django', 'node', 'flutterdev',
        'androiddev', 'iosprogramming'
    ];

    let keyword = '';
    let sort = 'relevance';
    let page = 0;
    const limit = 5; // posts per subreddit per page
    let isLoading = false;
    let allResults = [];
    let afters = {}; // Track 'after' for each subreddit

    // Helper to fetch posts for a page
    async function fetchPosts(pageNum) {
        isLoading = true;
        loading.style.display = 'block';

        // Map sort option to Reddit API sort
        let redditSort = 'relevance';
        if (sort === 'upvotes') redditSort = 'top';
        if (sort === 'date') redditSort = 'new';

        // For each subreddit, fetch the next page using 'after'
        const fetchPromises = subreddits.map(async sub => {
            let after = afters[sub] || '';
            let url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(keyword)}&sort=${redditSort}&restrict_sr=1&limit=${limit}`;
            if (after) url += `&after=${after}`;

            try {
                const res = await fetch(url);
                const data = await res.json();
                // Save the 'after' token for next page
                afters[sub] = data.data.after;

                return data.data.children.map(post => ({
                    title: post.data.title,
                    url: `https://reddit.com${post.data.permalink}`,
                    meta: `r/${sub} | ${post.data.ups} upvotes | ${new Date(post.data.created_utc * 1000).toLocaleDateString()}`,
                    desc: post.data.selftext ? post.data.selftext.substring(0, 180) + '...' : 'No description available.',
                    upvotes: post.data.ups,
                    date: post.data.created_utc
                }));
            } catch {
                return [];
            }
        });

        const pageResults = (await Promise.all(fetchPromises)).flat();
        allResults = allResults.concat(pageResults);

        // Sort combined results
        let sortedResults = allResults;
        if (sort === 'upvotes') {
            sortedResults = allResults.slice().sort((a, b) => b.upvotes - a.upvotes);
        } else if (sort === 'date') {
            sortedResults = allResults.slice().sort((a, b) => b.date - a.date);
        }

        // Render
        renderResults(sortedResults);

        isLoading = false;
        loading.style.display = 'none';
    }

    function renderResults(resultsArr) {
        if (resultsArr.length === 0) {
            results.innerHTML = `<div class="result-item"><span class="result-title">No results found for "${keyword}".</span></div>`;
            return;
        }
        results.innerHTML = resultsArr.map(item => `
            <div class="result-item">
                <a href="${item.url}" class="result-title" target="_blank" rel="noopener">${item.title}</a>
                <div class="result-meta">${item.meta}</div>
                <div class="result-desc">${item.desc}</div>
            </div>
        `).join('');
    }

    // Reset and search
    async function startSearch() {
        results.innerHTML = '';
        allResults = [];
        afters = {};
        page = 0;
        await fetchPosts(page);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        keyword = document.getElementById('keyword').value.trim();
        sort = document.getElementById('sort').value;

        if (!keyword) {
            results.innerHTML = `<div class="result-item"><span class="result-title">Please enter a keyword to search.</span></div>`;
            return;
        }
        await startSearch();
    });

    // Infinite scroll
    window.addEventListener('scroll', async () => {
        if (isLoading) return;
        if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 200)) {
            // Near bottom
            page++;
            await fetchPosts(page);
        }
    });
});
