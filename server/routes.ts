import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { extractEmissionData } from "./openai";
import { insertBusinessUnitSchema } from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Business Units
  app.get("/api/business-units", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const units = await storage.getBusinessUnits(req.user.organizationId);
    res.json(units);
  });

  app.post("/api/business-units", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const data = insertBusinessUnitSchema.parse(req.body);
    const unit = await storage.createBusinessUnit({
      ...data,
      organizationId: req.user.organizationId,
      description: data.description ?? null,
    });
    res.json(unit);
  });

  // Emissions
  app.get("/api/business-units/:id/emissions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const emissions = await storage.getEmissions(req.params.id);
    res.json(emissions);
  });

  app.post("/api/emissions/upload", upload.single("file"), async (req: Express.Request & { file?: Express.Multer.File }, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      // Create initial transaction record
      const transaction = await storage.createTransaction({
        fileName: req.file.originalname,
        detectedCategory: "pending",
        status: "pending",
        errorType: null,
        createdAt: new Date(),
      });

      try {
        const fileContent = req.file.buffer.toString();
        const extractedData = await extractEmissionData(fileContent);

        const emission = await storage.createEmission({
          businessUnitId: req.body.businessUnitId,
          scope: extractedData.scope,
          emissionSource: extractedData.emissionSource,
          amount: extractedData.amount,
          unit: extractedData.unit,
          date: new Date(extractedData.date),
          details: extractedData.details,
        });

        // Update transaction status
        await storage.updateTransactionStatus(transaction.id, "processed");
        res.json(emission);
      } catch (error) {
        // Update transaction with error
        await storage.updateTransactionStatus(
          transaction.id,
          "failed",
          error instanceof Error ? error.message : "Unknown error"
        );
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(400).json({ message });
    }
  });

  // Organization Settings
  app.get("/api/organization", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const org = await storage.getOrganizationById(req.user.organizationId);
    res.json(org);
  });

  app.patch("/api/organization/slug", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "super_admin") {
      return res.sendStatus(403);
    }

    try {
      const { slug } = req.body;
      if (!slug) {
        return res.status(400).json({ message: "Slug is required" });
      }

      // Check if slug is available
      const existingOrg = await storage.getOrganizationBySlug(slug);
      if (existingOrg && existingOrg.id !== req.user.organizationId) {
        return res.status(400).json({ message: "This URL is already taken" });
      }

      const org = await storage.updateOrganization(req.user.organizationId, {
        slug,
      });
      res.json(org);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(400).json({ message });
    }
  });

  app.post("/api/organization/logo", upload.single("logo"), async (req: Express.Request & { file?: Express.Multer.File }, res) => {
    if (!req.isAuthenticated() || req.user.role !== "super_admin") {
      return res.sendStatus(403);
    }

    if (!req.file) {
      return res.status(400).json({ message: "No logo uploaded" });
    }

    try {
      // In a production environment, this would upload to S3/CloudStorage
      // For now, we'll store it as a base64 string
      const logoBase64 = req.file.buffer.toString('base64');
      const logoUrl = `data:${req.file.mimetype};base64,${logoBase64}`;

      const org = await storage.updateOrganizationLogo(
        req.user.organizationId,
        logoUrl
      );
      res.json(org);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(400).json({ message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}