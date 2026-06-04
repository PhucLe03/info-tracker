import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'public', 'data');
const newsDir = path.join(dataDir, 'news');

export async function GET(request: Request) {
  try {
    if (!fs.existsSync(newsDir)) {
      return NextResponse.json({ date: null, availableDates: [], news: {} });
    }

    const files = fs.readdirSync(newsDir).filter(file => file.endsWith('.json') && file !== 'summary.json');
    
    if (files.length === 0) {
      return NextResponse.json({ date: null, availableDates: [], news: {} });
    }

    // Sort files to get the latest (since format is YYYY-MM-DD.json, sort works well)
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
  } catch (error) {
    console.error('Error reading news:', error);
    return NextResponse.json({ error: 'Failed to read news' }, { status: 500 });
  }
}

