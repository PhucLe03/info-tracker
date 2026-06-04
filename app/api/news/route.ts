import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const newsDir = path.join(dataDir, 'news');

export async function GET() {
  try {
    if (!fs.existsSync(newsDir)) {
      return NextResponse.json({ date: null, news: {} });
    }

    const files = fs.readdirSync(newsDir).filter(file => file.endsWith('.json'));
    
    if (files.length === 0) {
      return NextResponse.json({ date: null, news: {} });
    }

    // Sort files to get the latest (since format is YYYY-MM-DD.json, sort works well)
    files.sort((a, b) => b.localeCompare(a));
    const latestFile = files[0];
    
    const data = fs.readFileSync(path.join(newsDir, latestFile), 'utf-8');
    const news = JSON.parse(data);

    return NextResponse.json({ 
      date: latestFile.replace('.json', ''), 
      news 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read news' }, { status: 500 });
  }
}
