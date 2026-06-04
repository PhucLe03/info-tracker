import google from 'googlethis';

async function test() {
  const options = {
    page: 0,
    safe: false,
    parse_ads: false,
    additional_params: {
      hl: 'en'
    }
  };
  
  const response = await google.search('quantum computing', options);
  console.log(JSON.stringify(response.results.slice(0, 2), null, 2));
  console.log('Top News:', JSON.stringify(response.news?.slice(0, 2), null, 2));
}

test().catch(console.error);
