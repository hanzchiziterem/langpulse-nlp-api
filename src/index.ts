import app from "./app";
import { gracefulShutdown } from "./utils/shutdown";

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
shutdownSignals.forEach(signal => {
  process.on(signal, () => {
    console.log(`Received ${signal}, shutting down...`);
    gracefulShutdown()
      .catch(err => {
        console.error("Error during shutdown:", err);
        process.exit(1);
      });
  });
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown()
    .then(() => process.exit(1))
    .catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown()
    .then(() => process.exit(1))
    .catch(() => process.exit(1));
});