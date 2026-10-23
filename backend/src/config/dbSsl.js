/** TLS options for node-postgres. Railway presents a private CA that Node
 *  does not trust; the private network is already encrypted. Do not log URLs. */
function sslConfig(cs) {
  if (!cs) return false;
  let host = '';
  try {
    host = new URL(cs).hostname || '';
  } catch {
    return { rejectUnauthorized: true };
  }
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
  if (host.endsWith('.railway.internal') || host.endsWith('.rlwy.net') || host.endsWith('.railway.app')) {
    return { rejectUnauthorized: false };
  }
  return { rejectUnauthorized: true };
}

module.exports = { sslConfig };
