import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Parser from 'rss-parser';
import { getDb } from '@/lib/mongodb';

const dataDir = path.join(process.cwd(), 'public', 'data');
const keywordsFile = path.join(dataDir, 'keywords.json');
const newsDir = path.join(dataDir, 'news');

const isMongoEnabled = !!process.env.MONGODB_URI;

interface KeywordListDoc {
  _id: string;
  keywords: string[];
}

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  snippet: string;
  thumbnail: string | null;
  source: string;
}

interface NewsDoc {
  _id: string;
  date: string;
  news: Record<string, NewsItem[]>;
  createdAt: Date;
}

export async function POST() {
  try {
    let keywords: string[] = [];

    if (isMongoEnabled) {
      const db = await getDb();
      const doc = await db.collection<KeywordListDoc>('keywords').findOne({ _id: 'list' });
      if (doc && Array.isArray(doc.keywords)) {
        keywords = doc.keywords;
      } else if (fs.existsSync(keywordsFile)) {
        // Fallback to local files during migration
        try {
          const data = fs.readFileSync(keywordsFile, 'utf-8');
          keywords = JSON.parse(data);
        } catch {
          // Ignore error
        }
      }
    } else {
      if (!fs.existsSync(keywordsFile)) {
        return NextResponse.json({ error: 'No keywords found' }, { status: 400 });
      }
      const data = fs.readFileSync(keywordsFile, 'utf-8');
      keywords = JSON.parse(data);
    }

    if (keywords.length === 0) {
      return NextResponse.json({ message: 'Keywords list is empty' });
    }

    const newsResults: Record<string, NewsItem[]> = {};
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
        const results = (feed.items || []).map((item: Parser.Item) => {
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

    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

    if (isMongoEnabled) {
      const db = await getDb();
      await db.collection<NewsDoc>('news').updateOne(
        { _id: today },
        { $set: { news: newsResults, date: today, createdAt: new Date() } },
        { upsert: true }
      );

      return NextResponse.json({ 
        message: 'News fetched and saved to MongoDB successfully', 
        date: today,
        stats: Object.keys(newsResults).map(k => ({ keyword: k, count: newsResults[k].length }))
      });
    } else {
      if (!fs.existsSync(newsDir)) {
        fs.mkdirSync(newsDir, { recursive: true });
      }

      const outputFile = path.join(newsDir, `${today}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(newsResults, null, 2));

      // Update news/summary.json with available dates
      const files = fs.readdirSync(newsDir).filter(file => file.endsWith('.json') && file !== 'summary.json');
      const availableDates = files
        .map(file => file.replace('.json', ''))
        .sort((a, b) => b.localeCompare(a));
      
      const summaryFile = path.join(newsDir, 'summary.json');
      fs.writeFileSync(summaryFile, JSON.stringify({ availableDates }, null, 2));

      return NextResponse.json({ 
        message: 'News fetched and saved to files successfully', 
        date: today,
        stats: Object.keys(newsResults).map(k => ({ keyword: k, count: newsResults[k].length }))
      });
    }
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
  }
}
