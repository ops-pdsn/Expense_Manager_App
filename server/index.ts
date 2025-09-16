import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import { createServer as createHttpServer } from 'http';
import { registerRoutes } from './routes.js';
import { setupVite, serveStatic, log } from './vite.js';

const app = express();

// minimal CORS without external dep
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple request logging without touching res.json
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Register REST routes
registerRoutes(app);

// Only create and listen to HTTP server for local/dev (not on Vercel)
const isProd = (process.env.NODE_ENV ?? app.get('env')) === 'production';
const isVercel = !!process.env.VERCEL;

if (!isVercel) {
  const server = createHttpServer(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ message });
    if (isProd) throw err;
  });

  (async () => {
    if (!isProd) {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({ port, host: '0.0.0.0' }, () => {
      log(`serving on port ${port}`);
    });
  })().catch((e) => {
    console.error('Server bootstrap error', e);
    process.exit(1);
  });
} else {
  // Vercel serverless runtime: no explicit listen; prepare static in prod
  if (isProd) {
    serveStatic(app);
  }
}

// For Vercel serverless functions
export default app;
