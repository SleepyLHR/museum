var http = require('http');
var path = require('path');

var config = require('./config');

var port = config.server.port || 3002;

var postData = JSON.stringify({});

var options = {
  hostname: '127.0.0.1',
  port: port,
  path: '/api/admin/clear-data',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

var req = http.request(options, function(res) {
  var body = '';
  res.on('data', function(chunk) { body += chunk; });
  res.on('end', function() {
    if (res.statusCode === 200) {
      var result = JSON.parse(body);
      console.log('OK:', result.message);
      console.log('All data cleared: users, dailyScores, totalRanks, dailyRankSnapshots');
    } else {
      console.error('Failed:', res.statusCode, body);
      process.exit(1);
    }
  });
});

req.on('error', function(err) {
  console.error('Request failed. Is the server running on port', port, '?');
  console.error(err.message);
  process.exit(1);
});

req.write(postData);
req.end();
