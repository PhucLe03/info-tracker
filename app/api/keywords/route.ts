import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

const isMongoEnabled = !!process.env.MONGODB_URI;

export const dynamic = 'force-dynamic';

interface KeywordListDoc {
  _id: string;
  keywords: string[];
}

export async function GET() {
  try {
    if (!isMongoEnabled) {
      return NextResponse.json({ error: 'MongoDB is not configured' }, { status: 500 });
    }

    const db = await getDb();
    const doc = await db.collection<KeywordListDoc>('keywords').findOne({ _id: 'list' });
    const keywords = doc ? doc.keywords || [] : [];
    
    return NextResponse.json(keywords);
  } catch (error) {
    console.error('Error fetching keywords from MongoDB:', error);
    return NextResponse.json({ error: 'Failed to read keywords' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method Not Allowed (Database is Read-Only from UI)' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method Not Allowed (Database is Read-Only from UI)' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method Not Allowed (Database is Read-Only from UI)' }, { status: 405 });
}
