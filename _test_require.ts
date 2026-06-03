const jwt = require('jsonwebtoken');
console.log('keys:', Object.keys(jwt).join(','));
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkbWluQHphd2FkaS5hcHAiLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3ODAwNTQ1NjksImV4cCI6MTc4MDY1OTM2OX0.TzHUV-vlITAumJzD01T7riGzxYeGb85EvcSML6sBPho';
try {
  const d = jwt.verify(token, 'zawadi-dev-secret-change-in-production');
  console.log('verified:', d.email);
} catch(e) {
  console.log('error:', (e as Error).message);
}
