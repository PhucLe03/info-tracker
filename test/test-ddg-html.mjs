import * as cheerio from 'cheerio';

async function test() {
  const res = await fetch(`https://html.duckduckgo.com/html/?q=quantum`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const results = [];
  $('.result').each((i, el) => {
    const title = $(el).find('.result__title').text().trim();
    const link = $(el).find('.result__url').attr('href');
    const snippet = $(el).find('.result__snippet').text().trim();
    if (title) {
      results.push({ title, link, snippet });
    }
  });
  console.log(JSON.stringify(results.slice(0, 2), null, 2));
}

test().catch(console.error);
