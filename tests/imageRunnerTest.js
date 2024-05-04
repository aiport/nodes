const express = require('express');

const app = express();

const data = [
  { name: 'nodejs', image: 'quacky.io/skyportd/nodejs' },
  { name: 'python', image: 'quacky.io/skyportd/python' },
];

app.get('/api/runner/images', (req, res) => {
  res.json(data);
});

app.listen(3001, () => {
  console.log('Server listening on port 3000');
});