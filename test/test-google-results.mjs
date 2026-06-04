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
  console.log(JSON.stringify(response.results));
}

test().catch(console.error);
