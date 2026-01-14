import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { wsManager } from "../websocket";

// Import the cors package
import cors from 'cors';

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Add CORS middleware
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

  // Development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  /**
   * PORT LOGIC: 
   * On Render, process.env.PORT is automatically set (e.g., 10000).
   * We must listen on that exact port.
   */
  const port = parseInt(process.env.PORT || "3000");

  // IMPORTANT: Bind to '0.0.0.0' for deployment
  server.listen(port, "0.0.0.0", () => {
    const host = process.env.NODE_ENV === "production" 
      ? 'Render/Production' 
      : `http://localhost:${port}`;
    console.log(`Server running on ${host} (Port: ${port})`);
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