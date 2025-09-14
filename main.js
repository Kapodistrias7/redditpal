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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const keyword = document.getElementById('keyword').value.trim();
        const sort = document.getElementById('sort').value;

        results.innerHTML = '';
        loading.style.display = 'block';

        if (!keyword) {
            loading.style.display = 'none';
            results.innerHTML = `<div class="result-item"><span class="result-title">Please enter a keyword to search.</span></div>`;
            return;
        }

        // Map sort option to Reddit API sort
        let redditSort = 'relevance';
        if (sort === 'upvotes') redditSort = 'top';
        if (sort === 'date') redditSort = 'new';

        // Fetch from each subreddit (limit to 5 results per subreddit for performance)
        const fetchPromises = subreddits.map(sub =>
            fetch(`https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(keyword)}&sort=${redditSort}&restrict_sr=1&limit=5`)
                .then(res => res.json())
                .then(data => data.data.children.map(post => ({
                    title: post.data.title,
                    url: `https://reddit.com${post.data.permalink}`,
                    meta: `r/${sub} | ${post.data.ups} upvotes | ${new Date(post.data.created_utc * 1000).toLocaleDateString()}`,
                    desc: post.data.selftext ? post.data.selftext.substring(0, 180) + '...' : 'No description available.'
                })))
                .catch(() => [])
        );

        // Wait for all fetches
        const allResults = (await Promise.all(fetchPromises)).flat();

        // Optionally, sort combined results by upvotes or date
        let sortedResults = allResults;
        if (sort === 'upvotes') {
            sortedResults = allResults.sort((a, b) => parseInt(b.meta.split(' ')[2]) - parseInt(a.meta.split(' ')[2]));
        } else if (sort === 'date') {
            sortedResults = allResults.sort((a, b) => new Date(b.meta.split('|')[2]) - new Date(a.meta.split('|')[2]));
        }

        loading.style.display = 'none';

        if (sortedResults.length === 0) {
            results.innerHTML = `<div class="result-item"><span class="result-title">No results found for "${keyword}".</span></div>`;
            return;
        }

        results.innerHTML = sortedResults.map(item => `
            <div class="result-item">
                <a href="${item.url}" class="result-title" target="_blank" rel="noopener">${item.title}</a>
                <div class="result-meta">${item.meta}</div>
                <div class="result-desc">${item.desc}</div>
            </div>
        `).join('');
    });
});

