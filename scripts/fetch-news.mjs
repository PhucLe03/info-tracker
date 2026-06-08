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

function normalizeUrl(urlStr) {
  if (!urlStr) return '';
  try {
    const url = new URL(urlStr);
    url.search = '';
    url.hash = '';
    return url.toString().trim();
  } catch (err) {
    return urlStr.trim();
  }
}

async function run() {
  loadEnv();

  const dataDir = path.join(process.cwd(), 'public', 'data');
  const keywordsFile = path.join(dataDir, 'keywords.json');
  const newsDir = path.join(dataDir, 'news');

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
      console.error('Failed to connect to MongoDB, proceeding with local files only:', err.message);
      client = null;
      db = null;
    }
  } else {
    console.log('MONGODB_URI is not set. Running in local file-system mode only.');
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
  if (db) {
    try {
      await db.collection('keywords').updateOne(
        { _id: 'list' },
        { $set: { keywords } },
        { upsert: true }
      );
      console.log('Successfully synced keywords list to MongoDB.');
    } catch (err) {
      console.error('Failed to sync keywords list to MongoDB:', err.message);
    }
  }

  // Load previously fetched news URLs to avoid duplicates
  const seenUrls = new Set();
  if (db) {
    try {
      console.log('Loading previously fetched article URLs from MongoDB...');
      const docs = await db.collection('news').find({}, { projection: { news: 1 } }).toArray();
      for (const doc of docs) {
        if (doc.news) {
          for (const kw of Object.keys(doc.news)) {
            const articles = doc.news[kw] || [];
            for (const item of articles) {
              if (item.link) {
                seenUrls.add(normalizeUrl(item.link));
              }
            }
          }
        }
      }
      console.log(`Loaded ${seenUrls.size} unique previously fetched article URLs.`);
    } catch (err) {
      console.error('Failed to load previously fetched URLs from MongoDB:', err.message);
    }
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
      const results = [];
      const items = feed.items || [];
      for (const item of items) {
        const link = (item.link || '').trim();
        if (!link) continue;

        const normalized = normalizeUrl(link);
        if (seenUrls.has(normalized)) {
          continue;
        }

        const parts = (item.title || '').split(' - ');
        const source = parts.length > 1 ? parts.pop()?.trim() || 'Google News' : 'Google News';
        const title = parts.join(' - ').trim() || item.title || '';

        results.push({
          title,
          link,
          pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          snippet: item.contentSnippet || item.content || '',
          thumbnail: null,
          source
        });

        seenUrls.add(normalized);

        if (results.length >= 10) {
          break;
        }
      }

      newsResults[keyword] = results;
      console.log(`- Success: found ${results.length} articles for "${keyword}" (skipped duplicates)`);
    } catch (err) {
      console.error(`- Error fetching news for "${keyword}":`, err.message);
      newsResults[keyword] = [];
    }
  }

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

  // Save news to MongoDB
  if (db) {
    try {
      await db.collection('news').updateOne(
        { _id: today },
        { $set: { news: newsResults, date: today, createdAt: new Date() } },
        { upsert: true }
      );
      console.log(`Successfully saved news for ${today} to MongoDB.`);
    } catch (err) {
      console.error(`Failed to save news to MongoDB:`, err.message);
    }
  }

  // Always write to local files so that the static export works correctly
  if (!fs.existsSync(newsDir)) {
    fs.mkdirSync(newsDir, { recursive: true });
  }

  const outputFile = path.join(newsDir, `${today}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(newsResults, null, 2));
  console.log(`Successfully saved today's intel to: ${outputFile}`);

  // Fetch all historical news from MongoDB and write them locally
  let availableDates = [];
  if (db) {
    try {
      console.log('Fetching all historical news documents from MongoDB...');
      const docs = await db.collection('news').find({}).toArray();
      for (const doc of docs) {
        const dateStr = doc._id;
        const filePath = path.join(newsDir, `${dateStr}.json`);
        fs.writeFileSync(filePath, JSON.stringify(doc.news || {}, null, 2));
        availableDates.push(dateStr);
      }
      console.log(`Restored ${docs.length} historical news JSON files from MongoDB.`);
    } catch (err) {
      console.error('Failed to restore historical news from MongoDB:', err.message);
    }
  }

  // Sync keywords list back to keywordsFile
  if (keywords.length > 0) {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(keywordsFile, JSON.stringify(keywords, null, 2));
    console.log(`Synced keywords list to local file: ${keywordsFile}`);
  }

  // Merge with local dates to keep summary complete
  const localFiles = fs.readdirSync(newsDir).filter(file => file.endsWith('.json') && file !== 'summary.json');
  const localDates = localFiles.map(file => file.replace('.json', ''));

  const combinedDates = Array.from(new Set([...availableDates, ...localDates]))
    .sort((a, b) => b.localeCompare(a));

  const summaryFile = path.join(newsDir, 'summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify({ availableDates: combinedDates }, null, 2));
  console.log(`Successfully updated news summary at: ${summaryFile}`);

  if (client) {
    await client.close();
    console.log('Closed MongoDB connection.');
  }
}

run().catch(console.error);
