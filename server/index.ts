// New Relic tracking is active only on the front-end
// The client-side browser agent handles all analytics tracking

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import config, { validateConfig } from "./config";

// Log the current environment for debugging
console.log(`🚀 Starting server in ${config.NODE_ENV} mode`);

// Validate configuration on startup
validateConfig();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session middleware
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: true, // Changed to true to ensure session is always saved
  cookie: { 
    secure: false, // Always false to work in the webview regardless of environment
    httpOnly: true,
    sameSite: 'lax', // Less restrictive SameSite setting
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  store: storage.sessionStore
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (config.IS_DEVELOPMENT) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Get port from config, defaulting to 5000
  // this serves both the API and the client.
  const port = config.PORT;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
