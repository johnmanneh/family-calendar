const { sslConfig } = require('../src/config/dbSsl');

test('localhost skips SSL', () => {
  expect(sslConfig('postgresql://localhost:5432/db')).toBe(false);
  expect(sslConfig('postgresql://127.0.0.1:5432/db')).toBe(false);
});

test('Railway private host uses SSL without CA verification', () => {
  const ssl = sslConfig('postgresql://postgres.railway.internal:5432/railway');
  expect(ssl).toEqual({ rejectUnauthorized: false });
});

test('Railway public proxy uses SSL without CA verification', () => {
  const ssl = sslConfig('postgresql://host.proxy.rlwy.net:1234/railway');
  expect(ssl).toEqual({ rejectUnauthorized: false });
});

test('unknown remote host still requests verified TLS', () => {
  expect(sslConfig('postgresql://db.example.com:5432/app')).toEqual({ rejectUnauthorized: true });
});
