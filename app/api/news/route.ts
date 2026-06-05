import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/mongodb';

const dataDir = path.join(process.cwd(), 'public', 'data');
const newsDir = path.join(dataDir, 'news');

const isMongoEnabled = !!process.env.MONGODB_URI;

export const dynamic = 'force-dynamic';

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

export async function GET(request: Request) {
  try {
    if (isMongoEnabled) {
      const db = await getDb();
      
      // Get all documents in 'news' collection to find available dates
      const docs = await db.collection<NewsDoc>('news').find({}, { projection: { _id: 1 } }).toArray();
      let availableDates = docs.map(doc => String(doc._id)).sort((a, b) => b.localeCompare(a));

      // Seeding: if MongoDB has no news, attempt to import from local JSON files
      if (availableDates.length === 0 && fs.existsSync(newsDir)) {
        try {
          const files = fs.readdirSync(newsDir).filter(file => file.endsWith('.json') && file !== 'summary.json');
          if (files.length > 0) {
            for (const file of files) {
              const fileDate = file.replace('.json', '');
              const content = fs.readFileSync(path.join(newsDir, file), 'utf-8');
              const parsedNews = JSON.parse(content);
              await db.collection<NewsDoc>('news').updateOne(
                { _id: fileDate },
                { $set: { news: parsedNews, date: fileDate, createdAt: new Date() } },
                { upsert: true }
              );
            }
            // Re-fetch dates after seeding
            const newDocs = await db.collection<NewsDoc>('news').find({}, { projection: { _id: 1 } }).toArray();
            availableDates = newDocs.map(doc => String(doc._id)).sort((a, b) => b.localeCompare(a));
          }
        } catch (seedErr) {
          console.error('Failed to seed news to MongoDB:', seedErr);
        }
      }

      if (availableDates.length === 0) {
        return NextResponse.json({ date: null, availableDates: [], news: {} });
      }

      const { searchParams } = new URL(request.url);
      const dateParam = searchParams.get('date');
      
      let targetDate = availableDates[0];
      if (dateParam && availableDates.includes(dateParam)) {
        targetDate = dateParam;
      }

      const newsDoc = await db.collection<NewsDoc>('news').findOne({ _id: targetDate });
      const news = newsDoc ? newsDoc.news || {} : {};

      return NextResponse.json({ 
        date: targetDate, 
        availableDates,
        news 
      });
    } else {
      if (!fs.existsSync(newsDir)) {
        return NextResponse.json({ date: null, availableDates: [], news: {} });
      }

      const files = fs.readdirSync(newsDir).filter(file => file.endsWith('.json') && file !== 'summary.json');
      
      if (files.length === 0) {
        return NextResponse.json({ date: null, availableDates: [], news: {} });
      }

      const availableDates = files
        .map(file => file.replace('.json', ''))
        .sort((a, b) => b.localeCompare(a));

      const { searchParams } = new URL(request.url);
      const dateParam = searchParams.get('date');
      
      let targetDate = availableDates[0];
      if (dateParam && availableDates.includes(dateParam)) {
        targetDate = dateParam;
      }
      
      const data = fs.readFileSync(path.join(newsDir, `${targetDate}.json`), 'utf-8');
      const news = JSON.parse(data);

      return NextResponse.json({ 
        date: targetDate, 
        availableDates,
        news 
      });
    }
  } catch (error) {
    console.error('Error reading news:', error);
    return NextResponse.json({ error: 'Failed to read news' }, { status: 500 });
  }
}
