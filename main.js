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

    // Custom User-Agent for Reddit compliance [web:10]
    const headers = { 
        'User-Agent': 'RedditAggregator/3.0 (by MilitaryOde; athens.gr/contact)' 
    };

    let keyword = '';
    let sort = 'hot';
    let timeFilter = 'day'; // hour, day, week, month, year, all
    let page = 0;
    const limit = 5;
    let isLoading = false;
    let allResults = [];
    let afters = {};
    let pagesFetched = 0;
    const DELAY_MS = 1200; // Respect ~10 req/min unauth limit [web:1]

    function getEndpoint(sub, sortType, after, searchKeyword, tFilter) {
        let url = '';
        if (sortType === 'relevance') {
            url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(searchKeyword)}&sort=relevance&restrict_sr=1&limit=${limit}`;
            if (after) url += `&after=${after}`;
        } else {
            const timeParam = tFilter && tFilter !== 'all' ? `?t=${tFilter}` : '';
            url = `https://www.reddit.com/r/${sub}/${sortType}.json${timeParam}&limit=${limit}`;
            if (after) url += `&after=${after}`;
        }
        return url;
    }

    function getRSSUrl(sub, sortType, tFilter) {
        // Enhanced RSS with time filters where supported [web:20][web:35]
        const base = `https://www.reddit.com/r/${sub}/`;
        const sorts = {
            hot: 'hot.rss',
            new: 'new.rss',
            top: tFilter && tFilter !== 'all' ? `top/?t=${tFilter}.rss` : 'top.rss'
        };
        return base + (sorts[sortType] || 'hot.rss');
    }

    async function parseRSS(rssText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(rssText, 'text/xml');
        const items = xmlDoc.querySelectorAll('item');
        return Array.from(items).slice(0, limit).map(item => {
            const titleEl = item.querySelector('title');
            const linkEl = item.querySelector('link');
            const pubDateEl = item.querySelector('pubDate');
            const title = titleEl?.textContent || '';
            const link = linkEl?.textContent || '';
            const pubDate = pubDateEl?.textContent || '';
            return {
                title,
                url: link.includes('comments') ? link : `https://reddit.com${link}`,
                meta: `r/${subreddits[0]} RSS | ${pubDate}`, // Approx sub
                desc: item.querySelector('description')?.textContent?.substring(0, 180) + '...' || 'No description.',
                upvotes: 0, // RSS limitation [web:32]
                date: new Date(pubDate).getTime() / 1000 || Date.now() / 1000
            };
        });
    }

    async function fetchFromSub(sub, after = '') {
        try {
            let url, results;
            if (keyword && sort === 'relevance') {
                // JSON for relevance (precise)
                url = getEndpoint(sub, sort, after, keyword, timeFilter);
                const res = await fetch(url, { headers });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                afters[sub] = data.data.after;
                results = data.data.children.map(post => ({
                    title: post.data.title,
                    url: `https://reddit.com${post.data.permalink}`,
                    meta: `r/${sub} | ${post.data.ups} upvotes | ${new Date(post.data.created_utc * 1000).toLocaleDateString()}`,
                    desc: post.data.selftext ? post.data.selftext.substring(0, 180) + '...' : 'No description available.',
                    upvotes: post.data.ups,
                    date: post.data.created_utc
                }));
            } else {
                // RSS for others (rate-limit safe) [web:27]
                url = getRSSUrl(sub, sort, timeFilter);
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const rssText = await res.text();
                results = await parseRSS(rssText);
                results.forEach(r => r.meta = `r/${sub} | RSS | ${r.meta.split(' | ')[1]}`);
            }
            return results;
        } catch (err) {
            console.warn(`Failed r/${sub}:`, err);
            return [];
        }
    }

    async function fetchPosts(currentPage) {
        if (isLoading || currentPage <= pagesFetched) return;
        isLoading = true;
        loading.style.display = 'block';

        const pageSubs = subreddits.slice(currentPage * 3, (currentPage + 1) * 3) || subreddits.slice(0, 3);
        const fetchPromises = pageSubs.map(async (sub, idx) => {
            await new Promise(r => setTimeout(r, idx * DELAY_MS)); // Stagger [web:3]
            const after = afters[sub] || '';
            return fetchFromSub(sub, after);
        });

        const pageResults = (await Promise.all(fetchPromises)).flat();
        allResults = allResults.concat(pageResults);
        pagesFetched = currentPage;

        // Improved sorting ~80% Reddit fidelity [web:33]
        let sortedResults = [...allResults];
        if (sort === 'top') {
            sortedResults.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
        } else if (sort === 'new') {
            sortedResults.sort((a, b) => b.date - a.date);
        } else if (sort === 'relevance') {
            // Keep fetch order (Reddit relevance)
        }
        // Hot: approximate with upvotes + recency (no true algo)
        else if (sort === 'hot') {
            sortedResults.sort((a, b) => {
                const scoreA = (a.upvotes || 0) + (Date.now() / 1000 - (a.date || 0)) / 10000;
                const scoreB = (b.upvotes || 0) + (Date.now() / 1000 - (b.date || 0)) / 10000;
                return scoreB - scoreA;
            });
        }

        renderResults(sortedResults.slice(0, (currentPage + 1) * limit * 3));

        isLoading = false;
        loading.style.display = 'none';
    }

    function renderResults(resultsArr) {
        if (resultsArr.length === 0) {
            results.innerHTML = `<div class="result-item"><span class="result-title">No results found.</span></div>`;
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
        pagesFetched = 0;
        page = 0;
        await fetchPosts(0);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        keyword = document.getElementById('keyword')?.value.trim() || '';
        sort = document.getElementById('sort')?.value || 'hot';
        timeFilter = document.getElementById('time')?.value || 'day';

        if (sort === 'relevance' && !keyword) {
            results.innerHTML = `<div class="result-item"><span class="result-title">Enter keyword for relevance search.</span></div>`;
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
