import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

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
    if (!isMongoEnabled) {
      return NextResponse.json({ error: 'MongoDB is not configured' }, { status: 500 });
    }

    const db = await getDb();
    
    // Get all documents in 'news' collection to find available dates
    const docs = await db.collection<NewsDoc>('news').find({}, { projection: { _id: 1 } }).toArray();
    const availableDates = docs.map(doc => String(doc._id)).sort((a, b) => b.localeCompare(a));

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
  } catch (error) {
    console.error('Error reading news from MongoDB:', error);
    return NextResponse.json({ error: 'Failed to read news' }, { status: 500 });
  }
}
