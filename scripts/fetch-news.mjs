import Parser from 'rss-parser';
import fs from 'fs';
import path from 'path';

function isVietnamese(text) {
  const viRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  return viRegex.test(text);
}

async function run() {
  const dataDir = path.join(process.cwd(), 'data');
  const keywordsFile = path.join(dataDir, 'keywords.json');
  const newsDir = path.join(dataDir, 'news');

  if (!fs.existsSync(keywordsFile)) {
    console.error('Error: keywords.json file not found at', keywordsFile);
    process.exit(1);
  }

  if (!fs.existsSync(newsDir)) {
    fs.mkdirSync(newsDir, { recursive: true });
  }

  const rawKeywords = fs.readFileSync(keywordsFile, 'utf-8');
  const keywords = JSON.parse(rawKeywords);

  if (!Array.isArray(keywords) || keywords.length === 0) {
    console.log('No keywords to track.');
    return;
  }

  console.log(`Starting scheduled fetch for keywords: ${keywords.join(', ')}`);
  const newsResults = {};
  const parser = new Parser();

  for (const keyword of keywords) {
    try {
      let url = '';
      if (isVietnamese(keyword)) {
        url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=vi&gl=VN&ceid=VN:vi`;
      } else {
        url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`;
      }

      console.log(`Fetching: "${keyword}"...`);
      const feed = await parser.parseURL(url);
      const results = (feed.items || []).map((item) => {
        const parts = (item.title || '').split(' - ');
        const source = parts.length > 1 ? parts.pop()?.trim() || 'Google News' : 'Google News';
        const title = parts.join(' - ').trim() || item.title || '';

        return {
          title,
          link: item.link || '',
          pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          snippet: item.contentSnippet || item.content || '',
          thumbnail: null,
          source
        };
      });

      newsResults[keyword] = results.slice(0, 10);
      console.log(`- Success: found ${newsResults[keyword].length} articles for "${keyword}"`);
    } catch (err) {
      console.error(`- Error fetching news for "${keyword}":`, err.message);
      newsResults[keyword] = [];
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const outputFile = path.join(newsDir, `${today}.json`);
  
  fs.writeFileSync(outputFile, JSON.stringify(newsResults, null, 2));
  console.log(`Successfully saved today's intel to: ${outputFile}`);
}

run().catch(console.error);
