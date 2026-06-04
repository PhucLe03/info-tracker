import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const keywordsFile = path.join(dataDir, 'keywords.json');

export async function GET() {
  try {
    if (!fs.existsSync(keywordsFile)) {
      return NextResponse.json([]);
    }
    const data = fs.readFileSync(keywordsFile, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read keywords' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { keyword } = await request.json();
    if (!keyword || typeof keyword !== 'string') {
      return NextResponse.json({ error: 'Invalid keyword' }, { status: 400 });
    }

    let keywords: string[] = [];
    if (fs.existsSync(keywordsFile)) {
      const data = fs.readFileSync(keywordsFile, 'utf-8');
      keywords = JSON.parse(data);
    }

    const lowerKeyword = keyword.trim().toLowerCase();
    if (!keywords.includes(lowerKeyword)) {
      keywords.push(lowerKeyword);
      fs.writeFileSync(keywordsFile, JSON.stringify(keywords, null, 2));
    }

    return NextResponse.json(keywords);
  } catch (error) {
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

    if (!fs.existsSync(keywordsFile)) {
      return NextResponse.json([]);
    }

    const data = fs.readFileSync(keywordsFile, 'utf-8');
    let keywords: string[] = JSON.parse(data);

    keywords = keywords.filter((k) => k !== keyword.toLowerCase());
    fs.writeFileSync(keywordsFile, JSON.stringify(keywords, null, 2));

    return NextResponse.json(keywords);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete keyword' }, { status: 500 });
  }
}
