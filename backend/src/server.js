const { createApp } = require('./createApp');

const PORT = process.env.PORT || 3001;

async function main() {
  const { app, shutdown } = await createApp();
  const server = app.listen(PORT, () => {
    console.log(`API running on http://0.0.0.0:${PORT}`);
  });

  process.on('SIGINT', () => {
    server.close(async () => {
      await shutdown();
      process.exit(0);
    });
  });
}

main().catch((error) => {
  console.error('Error initializing API:', error);
  process.exit(1);
});

