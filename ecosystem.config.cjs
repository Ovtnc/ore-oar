/** PM2: `pm2 start ecosystem.config.cjs` — 3000 genelde dolu; Nginx `proxy_pass http://127.0.0.1:3001` */
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
