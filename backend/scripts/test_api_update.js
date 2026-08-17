const http = require('http');

const data = JSON.stringify({ status: 'active' });

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/api/doctors/69f8d1bbb2d06c81a95d42c1',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const parsed = JSON.parse(body);
    console.log('Doctor:', parsed.data?.name, '-> status:', parsed.data?.status);
  });
});

req.on('error', (err) => { console.error('Error:', err.message); });
req.write(data);
req.end();
