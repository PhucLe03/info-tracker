import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDb } from '@/lib/mongodb';

const dataDir = path.join(process.cwd(), 'public', 'data');
const keywordsFile = path.join(dataDir, 'keywords.json');

const isMongoEnabled = !!process.env.MONGODB_URI;

export const dynamic = 'force-dynamic';

interface KeywordListDoc {
  _id: string;
  keywords: string[];
}

export async function GET() {
  try {
    if (isMongoEnabled) {
      const db = await getDb();
      const doc = await db.collection<KeywordListDoc>('keywords').findOne({ _id: 'list' });
      
      let keywords: string[] = [];
      if (doc) {
        keywords = doc.keywords || [];
      } else {
        // Automatically seed from local file if exists
        if (fs.existsSync(keywordsFile)) {
          try {
            const data = fs.readFileSync(keywordsFile, 'utf-8');
            keywords = JSON.parse(data);
            await db.collection<KeywordListDoc>('keywords').updateOne(
              { _id: 'list' },
              { $set: { keywords } },
              { upsert: true }
            );
          } catch (seedErr) {
            console.error('Failed to seed keywords to MongoDB:', seedErr);
          }
        } else {
          // Initialize empty
          await db.collection<KeywordListDoc>('keywords').updateOne(
            { _id: 'list' },
            { $setOnInsert: { keywords: [] } },
            { upsert: true }
          );
        }
      }
      return NextResponse.json(keywords);
    } else {
      if (!fs.existsSync(keywordsFile)) {
        return NextResponse.json([]);
      }
      const data = fs.readFileSync(keywordsFile, 'utf-8');
      return NextResponse.json(JSON.parse(data));
    }
  } catch (error) {
    console.error('Error fetching keywords:', error);
    return NextResponse.json({ error: 'Failed to read keywords' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { keyword } = await request.json();
    if (!keyword || typeof keyword !== 'string') {
      return NextResponse.json({ error: 'Invalid keyword' }, { status: 400 });
    }

    const lowerKeyword = keyword.trim().toLowerCase();

    if (isMongoEnabled) {
      const db = await getDb();
      const doc = await db.collection<KeywordListDoc>('keywords').findOne({ _id: 'list' });
      let keywords: string[] = doc ? doc.keywords || [] : [];
      
      // Seed keywords from local file if doc is missing and file exists
      if (!doc && fs.existsSync(keywordsFile)) {
        try {
          const data = fs.readFileSync(keywordsFile, 'utf-8');
          keywords = JSON.parse(data);
        } catch {
          // Ignore error
        }
      }

      if (!keywords.includes(lowerKeyword)) {
        keywords.push(lowerKeyword);
        await db.collection<KeywordListDoc>('keywords').updateOne(
          { _id: 'list' },
          { $set: { keywords } },
          { upsert: true }
        );
      }
      return NextResponse.json(keywords);
    } else {
      let keywords: string[] = [];
      if (fs.existsSync(keywordsFile)) {
        const data = fs.readFileSync(keywordsFile, 'utf-8');
        keywords = JSON.parse(data);
      }

      if (!keywords.includes(lowerKeyword)) {
        keywords.push(lowerKeyword);
        fs.writeFileSync(keywordsFile, JSON.stringify(keywords, null, 2));
      }
      return NextResponse.json(keywords);
    }
  } catch (error) {
    console.error('Error adding keyword:', error);
    return NextResponse.json({ error: 'Failed to add keyword' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');

    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }

    if (isMongoEnabled) {
      const db = await getDb();
      const doc = await db.collection<KeywordListDoc>('keywords').findOne({ _id: 'list' });
      let keywords: string[] = doc ? doc.keywords || [] : [];

      keywords = keywords.filter((k) => k !== keyword.toLowerCase());
      await db.collection<KeywordListDoc>('keywords').updateOne(
        { _id: 'list' },
        { $set: { keywords } },
        { upsert: true }
      );
      return NextResponse.json(keywords);
    } else {
      if (!fs.existsSync(keywordsFile)) {
        return NextResponse.json([]);
      }

      const data = fs.readFileSync(keywordsFile, 'utf-8');
      let keywords: string[] = JSON.parse(data);

      keywords = keywords.filter((k) => k !== keyword.toLowerCase());
      fs.writeFileSync(keywordsFile, JSON.stringify(keywords, null, 2));
      return NextResponse.json(keywords);
    }
  } catch (error) {
    console.error('Error deleting keyword:', error);
    return NextResponse.json({ error: 'Failed to delete keyword' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { keywords } = await request.json();
    if (!Array.isArray(keywords)) {
      return NextResponse.json({ error: 'Keywords must be an array' }, { status: 400 });
    }

    if (isMongoEnabled) {
      const db = await getDb();
      await db.collection<KeywordListDoc>('keywords').updateOne(
        { _id: 'list' },
        { $set: { keywords } },
        { upsert: true }
      );
      return NextResponse.json(keywords);
    } else {
      fs.writeFileSync(keywordsFile, JSON.stringify(keywords, null, 2));
      return NextResponse.json(keywords);
    }
  } catch (error) {
    console.error('Error updating keywords:', error);
    return NextResponse.json({ error: 'Failed to update keyword order' }, { status: 500 });
  }
}
