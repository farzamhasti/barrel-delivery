// Vercel entry point - this file is executed by Vercel's Node.js runtime
// It imports and runs the built Express server from dist/index.js

import('./dist/index.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
