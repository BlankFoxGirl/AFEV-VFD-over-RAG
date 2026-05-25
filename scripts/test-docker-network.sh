#!/bin/bash
# Integration test: verify Docker network connectivity between services
set -euo pipefail

echo "Verifying app container can reach mongo on the internal Docker network..."
docker compose exec app node -e "
  const net = require('net');
  const socket = net.createConnection({ port: 27017, host: 'mongo' }, () => {
    console.log('PASS: app -> mongo TCP connection on port 27017 succeeded');
    socket.destroy();
  });
  socket.on('error', (err) => {
    console.error('FAIL: app cannot reach mongo:', err.message);
    process.exit(1);
  });
"
echo "Network integration test passed"
