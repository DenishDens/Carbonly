import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { extractEmissionData, getChatResponse } from "./openai"; // Fix import
import { insertBusinessUnitSchema } from "@shared/schema";
import passport from "passport";
import { Strategy as SamlStrategy } from "passport-saml";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Update the file upload request interface
interface FileUploadRequest extends Express.Request {
  body: {
    businessUnitId: string;
    [key: string]: any;
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Business Units endpoints
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
      createdAt: new Date(),
    });

    // Create audit log
    await storage.createAuditLog({
      userId: req.user.id,
      organizationId: req.user.organizationId,
      actionType: "CREATE",
      entityType: "business_unit",
      entityId: unit.id,
      changes: { after: unit },
    });

    res.json(unit);
  });

  app.patch("/api/business-units/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    const data = insertBusinessUnitSchema.parse(req.body);

    // First get the unit to verify ownership
    const existingUnit = await storage.getBusinessUnits(req.user.organizationId);
    const unit = existingUnit.find(u => u.id === id);
    if (!unit) {
      return res.sendStatus(403);
    }

    // Update the unit
    const updatedUnit = await storage.createBusinessUnit({
      ...unit,
      ...data,
      id, // Keep the same ID
      organizationId: req.user.organizationId,
    });

    res.json(updatedUnit);
  });

  app.delete("/api/business-units/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;

    // First get the unit to verify ownership
    const existingUnit = await storage.getBusinessUnits(req.user.organizationId);
    const unit = existingUnit.find(u => u.id === id);
    if (!unit) {
      return res.sendStatus(403);
    }

    // Instead of deleting, we could mark it as archived
    const archivedUnit = await storage.createBusinessUnit({
      ...unit,
      status: 'archived',
    });

    res.json(archivedUnit);
  });

  // Emissions
  app.get("/api/business-units/:id/emissions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const emissions = await storage.getEmissions(req.params.id);
    res.json(emissions);
  });

  // Update the emissions upload endpoint
  app.post("/api/emissions/upload", upload.single("file"), async (req: FileUploadRequest & { file?: Express.Multer.File }, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    if (!req.body.businessUnitId) return res.status(400).json({ message: "Business unit ID is required" });

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
        // Let AI detect the scope from the content
        const extractedData = await extractEmissionData(fileContent);

        // Save emission data to database
        const emission = await storage.createEmission({
          businessUnitId: req.body.businessUnitId,
          scope: extractedData.scope,
          emissionSource: extractedData.emissionSource,
          amount: extractedData.amount.toString(), // Ensure amount is string
          unit: extractedData.unit,
          date: new Date(extractedData.date),
          details: {
            ...extractedData.details,
            category: extractedData.category,
          },
        });

        // Create audit log
        await storage.createAuditLog({
          userId: req.user.id,
          organizationId: req.user.organizationId,
          actionType: "CREATE",
          entityType: "emission",
          entityId: emission.id,
          changes: { data: extractedData },
        });

        // Update transaction status
        await storage.updateTransactionStatus(transaction.id, "processed");

        // Return the processed data
        res.json({
          ...extractedData,
          id: emission.id,
          businessUnitId: req.body.businessUnitId,
        });
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

  // Audit Logs
  app.get("/api/audit-logs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const filters = {
      entityType: req.query.entityType as string,
      startDate: req.query.date ? new Date(req.query.date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to last 30 days
    };

    const logs = await storage.getAuditLogs(req.user.organizationId, filters);
    res.json(logs);
  });

  // Get users for audit log display
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const users = await storage.getUsersByOrganization(req.user.organizationId);
    res.json(users);
  });

  // Chat endpoint for AI insights
  app.post("/api/chat", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const response = await getChatResponse(req.body.message, {
        organizationId: req.user.organizationId,
      });

      // Create audit log for the chat interaction
      await storage.createAuditLog({
        userId: req.user.id,
        organizationId: req.user.organizationId,
        actionType: "CREATE",
        entityType: "chat",
        entityId: "ai-interaction",
        changes: { message: req.body.message, response },
      });

      res.json({
        role: "assistant",
        content: response.message,
        ...(response.chart && { chart: response.chart })
      });
    } catch (error) {
      console.error("Chat API Error:", error);
      res.status(500).json({ message: "Failed to process chat message" });
    }
  });

  // Team Management
  app.get("/api/teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const teams = await storage.getTeams(req.user.organizationId);
    res.json(teams);
  });

  app.post("/api/teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const team = await storage.createTeam({
      ...req.body,
      organizationId: req.user.organizationId,
      createdAt: new Date(),
    });
    res.json(team);
  });

  app.patch("/api/teams/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    const teams = await storage.getTeams(req.user.organizationId);
    const team = teams.find(t => t.id === id);
    if (!team) return res.sendStatus(403);

    const updatedTeam = await storage.updateTeam({
      ...team,
      ...req.body,
      id,
    });
    res.json(updatedTeam);
  });

  app.delete("/api/teams/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    const teams = await storage.getTeams(req.user.organizationId);
    const team = teams.find(t => t.id === id);
    if (!team) return res.sendStatus(403);

    await storage.deleteTeam(id);
    res.sendStatus(200);
  });

  // Update business unit endpoints to include team data
  app.get("/api/business-units/:id/team", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    const team = await storage.getBusinessUnitTeam(id);
    res.json(team);
  });

  app.patch("/api/business-units/:id/team", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { id } = req.params;
    const { teamId } = req.body;
    const updatedUnit = await storage.updateBusinessUnitTeam(id, teamId);
    res.json(updatedUnit);
  });

  // Add SSO routes here
  app.post("/api/organization/sso", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "super_admin") {
      return res.sendStatus(403);
    }

    try {
      const { enabled, settings } = req.body;

      const org = await storage.updateOrganization(req.user.organizationId, {
        ssoEnabled: enabled,
        ssoSettings: settings,
      });

      // Create audit log
      await storage.createAuditLog({
        userId: req.user.id,
        organizationId: req.user.organizationId,
        actionType: "UPDATE",
        entityType: "organization",
        entityId: org.id,
        changes: { ssoEnabled: enabled, ssoSettings: settings },
      });

      res.json(org);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(400).json({ message });
    }
  });

  // SSO login endpoint
  app.post("/api/auth/sso", async (req, res) => {
    try {
      const { domain } = req.body;

      // Find organization by domain
      const org = await storage.getOrganizationByDomain(domain);
      if (!org || !org.ssoEnabled) {
        return res.status(400).json({ message: "SSO not configured for this organization" });
      }

      const ssoConfig = org.ssoSettings;
      if (!ssoConfig) {
        return res.status(400).json({ message: "SSO configuration not found" });
      }

      // Configure SSO strategy dynamically based on organization settings
      const strategy = new SamlStrategy(
        {
          path: '/api/auth/sso/callback',
          entryPoint: ssoConfig.entryPoint,
          issuer: ssoConfig.issuer,
          cert: ssoConfig.cert,
        },
        async (profile: any, done: any) => {
          try {
            let user = await storage.getUserByEmail(profile.email);

            // If user exists and belongs to a different org, deny access
            if (user && user.organizationId !== org.id) {
              return done(null, false, { message: "Email belongs to a different organization" });
            }

            // Create new user if doesn't exist
            if (!user) {
              user = await storage.createUser({
                email: profile.email,
                firstName: profile.firstName,
                lastName: profile.lastName,
                organizationId: org.id,
                role: 'user',
                password: null, // SSO users don't need password
                createdAt: new Date(),
              });
            }

            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      );

      passport.use('saml', strategy);
      passport.authenticate('saml')(req, res);
    } catch (error) {
      const message = error instanceof Error ? error.message : "SSO authentication failed";
      res.status(400).json({ message });
    }
  });

  app.post('/api/auth/sso/callback', passport.authenticate('saml'), (req, res) => {
    res.redirect('/');
  });


  const httpServer = createServer(app);
  return httpServer;
}