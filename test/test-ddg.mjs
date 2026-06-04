import { search } from 'duck-duck-scrape';

async function test() {
  const searchResults = await search('quantum computing');
  console.log(JSON.stringify(searchResults.results.slice(0, 2), null, 2));
}

test().catch(console.error);
