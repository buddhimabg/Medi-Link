const http = require('http');

http.get('http://localhost:5000/api/patients?page=1&limit=10', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed.data.map(p => ({
        id: p._id,
        name: p.name || p.userId?.name,
        assignedDoctor: p.assignedDoctor
      })), null, 2));
    } catch (e) {
      console.log('Error parsing JSON:', data.substring(0, 200));
    }
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
