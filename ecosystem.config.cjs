/**
 * PM2: doğrudan Next binary — `npm` ile bazen alt süreç izlenmez / curl hemen fail olur.
 * Nginx: proxy_pass http://127.0.0.1:3001
 */
module.exports = {
  apps: [
    {
      name: "oar-ore",
      cwd: __dirname,
      script: "./node_modules/next/dist/bin/next",
      args: "start -p 3001",
      interpreter: "node",
      env: { NODE_ENV: "production" },
    },
  ],
};
