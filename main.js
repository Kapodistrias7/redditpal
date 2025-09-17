document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('searchForm');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const subredditInput = document.getElementById('subreddit');
    const suggestionsBox = document.getElementById('subreddit-suggestions');

    // Curated fallback list
    const curatedSubreddits = [
        'programming', 'learnprogramming', 'webdev', 'coding', 'cscareerquestions',
        'javascript', 'python', 'reactjs', 'cpp', 'java', 'compsci', 'gamedev',
        'opensource', 'devops', 'dotnet', 'django', 'node', 'flutterdev',
        'androiddev', 'iosprogramming'
    ];

    let keyword = '';
    let sort = 'hot';
    let page = 0;
    const limit = 5;
    let isLoading = false;
    let allResults = [];
    let afters = {};
    let lastSearchSubreddits = [];

    // --- Subreddit Autocomplete ---
    let suggestionItems = [];
    let selectedSuggestion = -1;

    subredditInput.addEventListener('input', async function () {
        const query = subredditInput.value.trim();
        suggestionsBox.innerHTML = '';
        selectedSuggestion = -1;

        if (!query) {
            suggestionsBox.style.display = 'none';
            return;
        }

        try {
            const res = await fetch(`https://www.reddit.com/subreddits/search.json?q=${encodeURIComponent(query)}&limit=8`);
            const data = await res.json();
            const subs = data.data.children.map(child => child.data.display_name);

            if (subs.length === 0) {
                suggestionsBox.style.display = 'none';
                return;
            }

            suggestionsBox.innerHTML = subs.map(sub =>
                `<div class="suggestion-item">${sub}</div>`
            ).join('');
            suggestionsBox.style.display = 'block';

            suggestionItems = Array.from(suggestionsBox.querySelectorAll('.suggestion-item'));

            suggestionItems.forEach((item, idx) => {
                item.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    subredditInput.value = item.textContent;
                    suggestionsBox.style.display = 'none';
                });
            });
        } catch {
            suggestionsBox.style.display = 'none';
        }
    });

    subredditInput.addEventListener('keydown', function (e) {
        if (!suggestionItems.length) return;

        if (e.key === 'ArrowDown') {
            selectedSuggestion = (selectedSuggestion + 1) % suggestionItems.length;
            updateActiveSuggestion();
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            selectedSuggestion = (selectedSuggestion - 1 + suggestionItems.length) % suggestionItems.length;
            updateActiveSuggestion();
            e.preventDefault();
        } else if (e.key === 'Enter') {
            if (selectedSuggestion >= 0) {
                subredditInput.value = suggestionItems[selectedSuggestion].textContent;
                suggestionsBox.style.display = 'none';
                e.preventDefault();
            }
        }
    });

    document.addEventListener('click', function (e) {
        if (!suggestionsBox.contains(e.target) && e.target !== subredditInput) {
            suggestionsBox.style.display = 'none';
        }
    });

    function updateActiveSuggestion() {
        suggestionItems.forEach((item, idx) => {
            item.classList.toggle('active', idx === selectedSuggestion);
        });
    }

    // --- Search Logic ---
    function getSubreddits() {
        const sub = subredditInput.value.trim();
        if (sub) return [sub];
        return curatedSubreddits;
    }

    function getEndpoint(sub, sort, after, keyword) {
        let url = '';
        if (sort === 'relevance') {
            url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(keyword)}&sort=relevance&restrict_sr=1&limit=${limit}`;
            if (after) url += `&after=${after}`;
        } else if (sort === 'hot' || sort === 'new' || sort === 'top' || sort === 'rising') {
            url = `https://www.reddit.com/r/${sub}/${sort}.json?limit=${limit}`;
            if (after) url += `&after=${after}`;
        }
        return url;
    }

    async function fetchPosts(pageNum) {
        isLoading = true;
        loading.style.display = 'block';

        const subreddits = lastSearchSubreddits;
        const fetchPromises = subreddits.map(async sub => {
            let after = afters[sub] || '';
            let url = getEndpoint(sub, sort, after, keyword);

            try {
                const res = await fetch(url);
                const data = await res.json();
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
        if (sort === 'top') {
            sortedResults = allResults.slice().sort((a, b) => b.upvotes - a.upvotes);
        } else if (sort === 'new') {
            sortedResults = allResults.slice().sort((a, b) => b.date - a.date);
        } // hot/rising/relevance: keep Reddit's order

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

    async function startSearch() {
        results.innerHTML = '';
        allResults = [];
        afters = {};
        page = 0;
        lastSearchSubreddits = getSubreddits();
        await fetchPosts(page);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        keyword = document.getElementById('keyword').value.trim();
        sort = document.getElementById('sort').value;

        if (sort === 'relevance' && !keyword) {
            results.innerHTML = `<div class="result-item"><span class="result-title">Please enter a keyword to search.</span></div>`;
            return;
        }
        await startSearch();
    });

    // Infinite scroll
    window.addEventListener('scroll', async () => {
        if (isLoading) return;
        if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 200)) {
            page++;
            await fetchPosts(page);
        }
    });
});
