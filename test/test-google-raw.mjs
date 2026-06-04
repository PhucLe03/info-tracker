import Parser from 'rss-parser';

function isVietnamese(text) {
  const viRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  return viRegex.test(text);
}

async function fetchNewsForKeyword(keyword) {
  const parser = new Parser();
  let url = '';
  
  if (isVietnamese(keyword)) {
    url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=vi&gl=VN&ceid=VN:vi`;
    console.log(`Keyword "${keyword}" is detected as Vietnamese. URL: ${url}`);
  } else {
    url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`;
    console.log(`Keyword "${keyword}" is detected as English/Default. URL: ${url}`);
  }
  
  try {
    const feed = await parser.parseURL(url);
    const results = feed.items.map(item => {
      // Parse source and title
      const parts = item.title.split(' - ');
      const source = parts.length > 1 ? parts.pop().trim() : 'Google News';
      const title = parts.join(' - ').trim();
      
      return {
        title,
        link: item.link,
        pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        snippet: item.contentSnippet || item.content || '',
        source
      };
    });
    return results.slice(0, 10); // return top 10
  } catch (e) {
    console.error(`Error fetching for "${keyword}":`, e);
    return [];
  }
}

async function test() {
  const keywords = ["quantum computing", "global economy", "tính toán lượng tử"];
  for (const keyword of keywords) {
    const results = await fetchNewsForKeyword(keyword);
    console.log(`--- Results for "${keyword}" (Count: ${results.length}) ---`);
    console.log(JSON.stringify(results.slice(0, 2), null, 2));
  }
}

test().catch(console.error);











