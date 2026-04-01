/** PM2: sunucuda `pm2 start ecosystem.config.cjs` — Nginx `proxy_pass` bu porta (3000) işaret etmeli. */
module.exports = {
  apps: [
    {
      name: "oar-ore",
      cwd: __dirname,
      script: "npm",
      args: "run start:prod",
      interpreter: "none",
      env: { NODE_ENV: "production" },
    },
  ],
};
