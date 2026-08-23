import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === "production";

app.disable("x-powered-by");

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", environment: IS_PRODUCTION ? "production" : "development" });
});

app.use("/api", (_req, res) => res.status(404).json({ error: "API-route niet gevonden." }));

async function setupServer() {
  if (!IS_PRODUCTION) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { maxAge: "1h" }));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Wereldreis Dashboard draait op http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch((error) => {
  console.error("Server kon niet starten:", error);
  process.exitCode = 1;
});
