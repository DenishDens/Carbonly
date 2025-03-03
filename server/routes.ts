import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { extractEmissionData } from "./openai";
import { insertBusinessUnitSchema, insertEmissionSchema } from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Business Units
  app.get("/api/business-units", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const units = await storage.getBusinessUnits(req.user.id);
    res.json(units);
  });

  app.post("/api/business-units", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const data = insertBusinessUnitSchema.parse(req.body);
    const unit = await storage.createBusinessUnit({
      ...data,
      userId: req.user.id,
      description: data.description ?? null,
    });
    res.json(unit);
  });

  // Emissions
  app.get("/api/business-units/:id/emissions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const emissions = await storage.getEmissions(parseInt(req.params.id));
    res.json(emissions);
  });

  app.post("/api/emissions/upload", upload.single("file"), async (req: Express.Request & { file?: Express.Multer.File }, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      const fileContent = req.file.buffer.toString();
      const extractedData = await extractEmissionData(fileContent);
      const emission = await storage.createEmission({
        ...extractedData,
        businessUnitId: parseInt(req.body.businessUnitId),
        source: req.file.originalname,
      });
      res.json(emission);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(400).json({ message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}