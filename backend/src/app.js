require('dotenv').config();
const createApp = require('./createApp');

const app = createApp();

const PORT = process.env.PORT || 8000;
// Apply pending database migrations, then start serving. If a migration fails
// the server does not start, so the previous deployment keeps running.
require('./db/migrate')()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error(err.message);
    process.exit(1);
  });
