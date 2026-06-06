import Parser from 'rss-parser';
import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

// Simple manual .env file loader for Node.js scripts
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    for (const line of envConfig.split('\n')) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      const parts = trimmedLine.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        if (key) {
          process.env[key] = value;
        }
      }
    }
  }
}

function isVietnamese(text) {
  const viRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  return viRegex.test(text);
}

async function run() {
  loadEnv();

  const dataDir = path.join(process.cwd(), 'public', 'data');
  const keywordsFile = path.join(dataDir, 'keywords.json');

  let client = null;
  let db = null;

  if (process.env.MONGODB_URI) {
    try {
      console.log('Connecting to MongoDB...');
      client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      db = client.db('daily-intel');
      console.log('Successfully connected to MongoDB.');
    } catch (err) {
      console.error('Failed to connect to MongoDB:', err.message);
      process.exit(1);
    }
  } else {
    console.error('Error: MONGODB_URI is not set in environment or .env file.');
    process.exit(1);
  }

  // Load keywords list from local keywords.json (source of truth)
  let keywords = [];
  if (fs.existsSync(keywordsFile)) {
    try {
      const rawKeywords = fs.readFileSync(keywordsFile, 'utf-8');
      keywords = JSON.parse(rawKeywords);
      console.log(`Loaded keywords from local file: ${keywords.join(', ')}`);
    } catch (err) {
      console.error('Error reading local keywords.json file:', err.message);
      if (client) await client.close();
      process.exit(1);
    }
  } else {
    console.error(`Error: keywords.json file not found at ${keywordsFile}`);
    if (client) await client.close();
    process.exit(1);
  }

  if (!Array.isArray(keywords) || keywords.length === 0) {
    console.log('No keywords to track.');
    if (client) await client.close();
    return;
  }

  // Sync keywords to MongoDB
  try {
    await db.collection('keywords').updateOne(
      { _id: 'list' },
      { $set: { keywords } },
      { upsert: true }
    );
    console.log('Successfully synced keywords list to MongoDB.');
  } catch (err) {
    console.error('Failed to sync keywords list to MongoDB:', err.message);
    if (client) await client.close();
    process.exit(1);
  }

  console.log(`Starting news fetch for keywords: ${keywords.join(', ')}`);
  const newsResults = {};
  const parser = new Parser();

  for (const keyword of keywords) {
    try {
      let url = '';
      if (isVietnamese(keyword)) {
        url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=vi&gl=VN&ceid=VN:vi`;
      } else {
        url = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=en-US&gl=US&ceid=US:en`;
      }

      console.log(`Fetching: "${keyword}"...`);
      const feed = await parser.parseURL(url);
      const results = (feed.items || []).map((item) => {
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

      newsResults[keyword] = results.slice(0, 10);
      console.log(`- Success: found ${newsResults[keyword].length} articles for "${keyword}"`);
    } catch (err) {
      console.error(`- Error fetching news for "${keyword}":`, err.message);
      newsResults[keyword] = [];
    }
  }

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

  // Save news to MongoDB
  try {
    await db.collection('news').updateOne(
      { _id: today },
      { $set: { news: newsResults, date: today, createdAt: new Date() } },
      { upsert: true }
    );
    console.log(`Successfully saved news for ${today} to MongoDB.`);
  } catch (err) {
    console.error(`Failed to save news to MongoDB:`, err.message);
    if (client) await client.close();
    process.exit(1);
  }

  if (client) {
    await client.close();
    console.log('Closed MongoDB connection.');
  }
  
  console.log('Fetch news operation completed successfully.');
}

run().catch(console.error);
