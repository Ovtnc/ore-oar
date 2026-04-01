const path = require("path");

/**
 * PM2: bash + exec node — tek PID, Next gerçekten dinler; `curl :3001` için gerekli.
 * Nginx: proxy_pass http://127.0.0.1:3001
 */
module.exports = {
  apps: [
    {
      name: "oar-ore",
      cwd: __dirname,
      script: path.join(__dirname, "scripts/pm2-next-start.sh"),
      interpreter: "bash",
      env: { NODE_ENV: "production" },
    },
  ],
};
