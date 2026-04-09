const https = require('https');

const req = https.request('https://api.cerebras.ai/v1/models', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${process.env.CEREBRAS_API_KEY}`
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      console.log(JSON.parse(data).data.map(m => m.id));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', e => console.error(e));
req.end();
