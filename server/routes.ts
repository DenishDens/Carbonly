import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { extractEmissionData } from "./openai";
import { 
  insertBusinessUnitSchema, 
  insertEmissionSchema,
  insertInvitationSchema 
} from "@shared/schema";
import crypto from "crypto";

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

  // Organization Logo
  app.post("/api/organization/logo", upload.single("logo"), async (req: Express.Request & { file?: Express.Multer.File }, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No logo uploaded" });

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

  // User Invitations
  app.post("/api/invitations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: "Only admins can invite users" });
    }

    try {
      const data = insertInvitationSchema.parse(req.body);

      // Generate a unique token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const invitation = await storage.createInvitation({
        ...data,
        organizationId: req.user.organizationId,
        token,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      });

      // In production, send an email with the invitation link
      // For now, just return the token
      res.json({ 
        ...invitation,
        invitationLink: `/auth/join?token=${token}` 
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(400).json({ message });
    }
  });

  app.get("/api/invitations/:token", async (req, res) => {
    const invitation = await storage.getInvitationByToken(req.params.token);
    if (!invitation) {
      return res.status(404).json({ message: "Invalid or expired invitation" });
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      await storage.deleteInvitation(invitation.id);
      return res.status(400).json({ message: "Invitation has expired" });
    }

    res.json(invitation);
  });

  const httpServer = createServer(app);
  return httpServer;
}