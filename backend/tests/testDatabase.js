// Call before importing config/db: dotenv must not redirect fixture writes
// through a configured DATABASE_PUBLIC_URL. Never include connection strings
// in errors, because they can contain credentials.
function configureTestDatabase(env) {
  const value = env.TEST_DATABASE_URL;
  if (!value) throw new Error('Set TEST_DATABASE_URL to an isolated test database');
  let url;
  try { url = new URL(value); } catch { throw new Error('TEST_DATABASE_URL must be a PostgreSQL URL'); }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname ||
      !/(?:^|[_-])test(?:[_-]|$)/i.test(database)) {
    throw new Error('TEST_DATABASE_URL must identify a PostgreSQL database with test in its name');
  }
  // Set, do not delete: dotenv would refill an absent variable from .env.
  env.DATABASE_URL = value;
  env.DATABASE_PUBLIC_URL = value;
  return value;
}

module.exports = configureTestDatabase;
