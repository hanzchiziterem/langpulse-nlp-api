import prisma from "../../client/prisma";

const shutdownHandlers: Array<() => Promise<void>> = [];

export const registerShutdownHandler = (handler: () => Promise<void>) =>  shutdownHandlers.push(handler);

export const  gracefulShutdown = async () => {
  console.log("Starting graceful shutdown...");
  await Promise.all(
    shutdownHandlers.map(handler => 
      handler().catch(err => 
        console.error("Shutdown handler failed:", err)
      ))
  );
  
  console.log("Shutdown complete.");
  process.exit(0);
}

registerShutdownHandler(async () => {
  console.log("Disconnecting Prisma...");
  await prisma.$disconnect();
});

