/** pm2 start deploy/pm2/ecosystem.config.cjs — edit cwd if your clone path differs */
module.exports = {
  apps: [
    {
      name: "order4u",
      cwd: "/root/app/order4u",
      script: "npm",
      args: "start -- -H 127.0.0.1 -p 3000",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
