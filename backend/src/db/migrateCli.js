// npm run migrate — apply pending migrations and exit
require('dotenv').config();
require('./migrate')()
  .then(() => process.exit(0))
  .catch(err => { console.error(err.message); process.exit(1); });
