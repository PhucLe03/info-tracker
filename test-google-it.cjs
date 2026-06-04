const googleIt = require('google-it');

async function test() {
  try {
    const results = await googleIt({ query: 'quantum computing' });
    console.log(JSON.stringify(results.slice(0, 2), null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
