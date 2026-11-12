const path = require("node:path");

/** Resolve repo root: deploy/pm2 -> ../.. */
const appRoot = path.resolve(__dirname, "../..");

module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || "order4u",
      cwd: appRoot,
      script: path.join(appRoot, "scripts/start-production.sh"),
      interpreter: "bash",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
