module.exports = {
  apps: [
    {
      name: "ticket-system",
      script: "src/index.ts",
      cwd: "./src/server",
      interpreter: "bun",
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: "4000",
        // DATABASE_PATH: "database/data.db",  // override if needed
        // DIST_PATH: "src/client/dist",        // override if needed
      },
      error_file: "logs/error.log",
      out_file: "logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};
