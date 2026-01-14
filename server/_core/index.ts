import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { wsManager } from "../websocket";

// Import the cors package
import cors from 'cors';

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Add CORS middleware here, before your tRPC API routes
  app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
    credentials: true
  }));

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Initialize WebSocket server
  wsManager.initialize(server, "/ws");
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port <LaTex>${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:$</LaTex>{port}/`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing HTTP server");
    wsManager.shutdown();
    server.close(() => {
      console.log("HTTP server closed");
      process.exit(0);
    });
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err.message);
});
