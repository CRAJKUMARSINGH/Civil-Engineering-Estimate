import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import compression from "compression";
import { LruTtlCache } from "./cache";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3001;

app.use(cors());
app.use(compression());
app.use(express.json({ limit: '20mb' }));
app.use("/uploads", express.static(uploadsDir, { maxAge: '1d', immutable: true }));

// Ensure uploads dir exists
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Types and in-memory store

type Estimate = {
  id: string;
  projectName: string;
  location?: string;
  engineerName?: string;
  referenceNumber?: string;
  fileName?: string;
  status: string;
  excelData?: {
    sheetNames: string[];
    parts: Array<{ partNumber: number; costSheet: string; measurementSheet: string }>;
  };
};

const estimates: Record<string, Estimate> = {};

// Mock SSR items (flat + hierarchical)
const ssrItems = [
  { id: "1", code: "SSR-001", description: "Excavation in all types of soil", unit: "cum", rate: "150.00", category: "Earthwork" },
  { id: "2", code: "SSR-002", description: "Plain Cement Concrete 1:4:8 (40mm nominal size)", unit: "cum", rate: "4500.00", category: "Concrete" },
  { id: "3", code: "SSR-003", description: "Reinforced Cement Concrete M20", unit: "cum", rate: "6800.00", category: "Concrete" },
  { id: "4", code: "SSR-004", description: "Brick work in cement mortar 1:6", unit: "sqm", rate: "580.00", category: "Masonry" },
  { id: "5", code: "SSR-005", description: "Plastering with cement mortar 1:4, 12mm thick", unit: "sqm", rate: "220.00", category: "Finishing" },
];

const hierarchicalSSRItems = [
  {
    id: "h1",
    code: "H-001",
    description: "Earthwork",
    fullDescription: "Earthwork - Excavation",
    unit: "cum",
    rate: "150.00",
    category: "Earthwork",
    level: 1,
    parentCode: undefined,
    hierarchy: ["Earthwork", "Excavation"],
    indentLevel: 1,
  },
];

// Simple caches
const ssrCache = new LruTtlCache<string, any>(8, 60_000);
const statsCache = new LruTtlCache<string, any>(2, 30_000);

// Routes used by the client
app.get("/api/ssr-items", (_req, res) => {
  const cached = ssrCache.get('ssr-items');
  if (cached) {
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json(cached);
  }
  ssrCache.set('ssr-items', ssrItems);
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json(ssrItems);
});

app.get("/api/hierarchical-ssr-items", (_req, res) => {
  res.json(hierarchicalSSRItems);
});

app.get("/api/estimates", (_req, res) => {
  res.json(Object.values(estimates));
});

app.get("/api/estimates/:id", (req, res) => {
  const est = estimates[req.params.id];
  if (!est) return res.status(404).json({ error: "Estimate not found" });
  res.json(est);
});

// Enhanced Dashboard & Projects (lightweight stubs for UI integration)
app.get("/api/dashboard/enhanced-stats", (_req, res) => {
  try {
    const cached = statsCache.get('enhanced-stats');
    if (cached) {
      res.setHeader('Cache-Control', 'public, max-age=30');
      return res.json(cached);
    }
    const legacyEstimates = Object.keys(estimates).length;
    const ssrTotalItems = ssrItems.length;

    const stats = {
      legacy: { estimates: legacyEstimates, ssrItems: ssrTotalItems },
      projects: { totalProjects: 0, totalValue: 0 },
      templates: { totalTemplates: 0, categoriesCount: 0, totalItems: 0, averageItemsPerTemplate: 0 },
      ssr: {
        totalItems: ssrTotalItems,
        categoriesCount: new Set(ssrItems.map(i => i.category)).size,
        yearsCount: 0,
        averageRate: ssrItems.length
          ? ssrItems.reduce((s, i) => s + Number(i.rate || 0), 0) / ssrItems.length
          : 0,
      },
      measurements: { templatesCount: 0 },
      dynamicTemplates: { templatesCount: 0 },
      lastUpdated: new Date().toISOString(),
    };

    statsCache.set('enhanced-stats', stats);
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: "Failed to compute dashboard stats" });
  }
});

app.get("/api/estimator/projects", (_req, res) => {
  res.json([]);
});

app.post("/api/estimates/:id/migrate", (req, res) => {
  const { id } = req.params as { id: string };
  if (!estimates[id]) return res.status(404).json({ error: "Estimate not found" });
  // Stub: pretend to create a new project id from estimate id
  res.json({ success: true, projectId: `P-${id}` });
});

app.post("/api/excel/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { projectName, location, engineerName, referenceNumber } = (req.body ?? {}) as Record<string, string | undefined>;

    const filePath = req.file.path;
    const workbook = XLSX.read(fs.readFileSync(filePath));
    const sheetNames = workbook.SheetNames || [];

    const parts: Array<{ partNumber: number; costSheet: string; measurementSheet: string }> = [];

    const id = String(Date.now());
    const estimate: Estimate = {
      id,
      projectName: projectName || req.file.originalname.replace(/\.(xlsx|xls)$/i, ""),
      location,
      engineerName,
      referenceNumber,
      fileName: req.file.originalname,
      status: "processed",
      excelData: { sheetNames, parts },
    };

    estimates[id] = estimate;

    return res.json({ estimate, sheetNames, parts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to process Excel file" });
  }
});

app.post("/api/excel/:estimateId/insert-ssr", (req, res) => {
  const { estimateId } = req.params as { estimateId: string };
  if (!estimates[estimateId]) return res.status(404).json({ error: "Estimate not found" });
  return res.json({ success: true });
});

// SSR files endpoints (stubs)
app.post("/api/ssr-files/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  return res.json({ id: String(Date.now()), fileName: req.file.originalname });
});

app.get("/api/ssr-files", (_req, res) => res.json([]));
app.get("/api/ssr-files/:id", (_req, res) => res.json({}));
app.get("/api/ssr-files/:id/analyze", (_req, res) => res.json({}));

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
