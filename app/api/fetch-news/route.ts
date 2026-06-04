import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';

const dataDir = path.join(process.cwd(), 'data');
const keywordsFile = path.join(dataDir, 'keywords.json');
const newsDir = path.join(dataDir, 'news');

export async function POST() {
  try {
    if (!fs.existsSync(keywordsFile)) {
      return NextResponse.json({ error: 'No keywords found' }, { status: 400 });
    }

    if (!fs.existsSync(newsDir)) {
      fs.mkdirSync(newsDir, { recursive: true });
    }

    const data = fs.readFileSync(keywordsFile, 'utf-8');
    const keywords: string[] = JSON.parse(data);

    if (keywords.length === 0) {
      return NextResponse.json({ message: 'Keywords list is empty' });
    }

    const newsResults: Record<string, any[]> = {};
    const parser = new Parser();
    const viRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

    for (const keyword of keywords) {
      try {
        let url = '';
        if (viRegex.test(keyword)) {
          url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=vi&gl=VN&ceid=VN:vi`;
        } else {
          url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`;
        }

        const feed = await parser.parseURL(url);
        const results = (feed.items || []).map((item: any) => {
          // Parse clean title and source from item.title
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

        // Take top 10 results
        newsResults[keyword] = results.slice(0, 10);
      } catch (err) {
        console.error(`Error fetching search results for ${keyword}:`, err);
        newsResults[keyword] = [];
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const outputFile = path.join(newsDir, `${today}.json`);
    
    fs.writeFileSync(outputFile, JSON.stringify(newsResults, null, 2));

    return NextResponse.json({ 
      message: 'News fetched successfully', 
      date: today,
      stats: Object.keys(newsResults).map(k => ({ keyword: k, count: newsResults[k].length }))
    });
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}


