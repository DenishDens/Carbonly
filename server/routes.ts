import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { getChatResponse } from "./openai";
import { insertBusinessUnitSchema } from "@shared/schema";
import passport from "passport";
import { Strategy as SamlStrategy } from "passport-saml";
import {getStorageClient} from './storageClient'
import {insertIncidentSchema, updateIncidentSchema} from "@shared/schema";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

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
        //const extractedData = await extractEmissionData(fileContent);  Removed extractEmissionData call

        // Save emission data to database -  Modified to remove reliance on extractedData
        const emission = await storage.createEmission({
          businessUnitId: req.body.businessUnitId,
          scope: "unknown", // Placeholder -  Needs a better default or error handling
          emissionSource: "unknown", // Placeholder
          amount: "0", // Placeholder
          unit: "unknown", // Placeholder
          date: new Date(), // Placeholder
          details: {
            category: "unknown", // Placeholder
          },
        });

        // Create audit log
        await storage.createAuditLog({
          userId: req.user.id,
          organizationId: req.user.organizationId,
          actionType: "CREATE",
          entityType: "emission",
          entityId: emission.id,
          changes: { data: {scope: "unknown", emissionSource: "unknown", amount: "0", unit: "unknown", date: new Date(), details: {category: "unknown"}} }, // Placeholder data for audit log
        });

        // Update transaction status
        await storage.updateTransactionStatus(transaction.id, "processed");

        // Return the processed data - Modified to reflect missing data
        res.json({
          scope: "unknown", // Placeholder
          emissionSource: "unknown", // Placeholder
          amount: "0", // Placeholder
          unit: "unknown", // Placeholder
          date: new Date(), // Placeholder
          details: {
            category: "unknown", // Placeholder
          },
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

  // Update the emissions endpoint
  app.post("/api/emissions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      console.log("Creating emission with data:", req.body);
      const emission = await storage.createEmission({
        ...req.body,
        date: new Date(req.body.date),
      });

      // Create audit log
      await storage.createAuditLog({
        userId: req.user.id,
        organizationId: req.user.organizationId,
        actionType: "CREATE",
        entityType: "emission",
        entityId: emission.id,
        changes: { data: req.body },
      });

      console.log("Emission created successfully:", emission);
      res.json(emission);
    } catch (error) {
      console.error("Error creating emission:", error);
      res.status(500).json({ message: "Failed to save emission data" });
    }
  });

  app.patch("/api/emissions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { id } = req.params;

      // Get the existing emission to verify ownership
      const emission = await storage.getEmissionById(id);
      if (!emission) {
        return res.status(404).json({ message: "Emission record not found" });
      }

      // Verify business unit belongs to user's organization
      const units = await storage.getBusinessUnits(req.user.organizationId);
      const hasAccess = units.some(unit => unit.id === emission.businessUnitId);
      if (!hasAccess) {
        return res.sendStatus(403);
      }

      console.log("Updating emission with data:", req.body);
      const updatedEmission = await storage.updateEmission({
        ...emission,
        ...req.body,
        id,
        date: new Date(req.body.date),
      });

      // Create audit log
      await storage.createAuditLog({
        userId: req.user.id,
        organizationId: req.user.organizationId,
        actionType: "UPDATE",
        entityType: "emission",
        entityId: emission.id,
        changes: { before: emission, after: updatedEmission },
      });

      console.log("Emission updated successfully:", updatedEmission);
      res.json(updatedEmission);
    } catch (error) {
      console.error("Error updating emission:", error);
      res.status(500).json({ message: "Failed to update emission data" });
    }
  });

  // Update the GET endpoint
  app.get("/api/emissions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      console.log("Fetching emissions with category:", req.query.category);

      // Get all business units for the organization
      const units = await storage.getBusinessUnits(req.user.organizationId);

      // Get emissions for all business units
      const allEmissions = await Promise.all(
        units.map(unit => storage.getEmissions(unit.id))
      );

      // Flatten and filter by category if specified
      let emissions = allEmissions.flat();
      const category = req.query.category as string;

      if (category) {
        emissions = emissions.filter(e =>
          e.details &&
          typeof e.details === 'object' &&
          'category' in e.details &&
          e.details.category === category
        );
      }

      // Calculate total amounts from rawAmount if available
      emissions = emissions.map(e => ({
        ...e,
        amount: e.details?.rawAmount ? parseFloat(e.details.rawAmount) : parseFloat(e.amount),
        unit: e.details?.rawUnit || e.unit
      }));

      console.log(`Found ${emissions.length} emissions for category: ${category}`);
      res.json(emissions);
    } catch (error) {
      console.error("Error fetching emissions:", error);
      res.status(500).json({ message: "Failed to fetch emissions data" });
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

  // Add these new routes for material management
  app.get("/api/materials", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      console.log("Fetching materials for organization:", req.user.organizationId);
      const materials = await storage.getMaterials(req.user.organizationId);
      console.log("Retrieved materials:", materials);
      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ message: "Failed to fetch materials" });
    }
  });

  app.post("/api/materials", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      console.log("Creating material with data:", req.body);

      // Validate required fields
      const { materialCode, name, category, uom, emissionFactor, source } = req.body;
      if (!materialCode || !name || !category || !uom || !emissionFactor || !source) {
        return res.status(400).json({ 
          message: "Missing required fields", 
          required: ["materialCode", "name", "category", "uom", "emissionFactor", "source"] 
        });
      }

      // Validate material code format
      if (!/^[A-Z0-9-]{2,10}$/.test(materialCode)) {
        return res.status(400).json({ 
          message: "Invalid material code. Must be 2-10 characters, uppercase letters, numbers, and hyphens only." 
        });
      }

      // Check for duplicate material code
      const existingMaterials = await storage.getMaterials(req.user.organizationId);
      const duplicate = existingMaterials.find(
        (m) => m.materialCode.toLowerCase() === materialCode.toLowerCase()
      );
      
      if (duplicate) {
        return res.status(400).json({ 
          message: "Material code already exists. Please use a unique code." 
        });
      }

      // Convert emissionFactor to decimal
      const emissionFactorDecimal = parseFloat(emissionFactor);
      if (isNaN(emissionFactorDecimal)) {
        return res.status(400).json({ message: "Invalid emission factor value" });
      }

      const material = await storage.createMaterial({
        materialCode,
        name,
        category,
        uom,
        emissionFactor: emissionFactorDecimal.toString(),
        source,
        organizationId: req.user.organizationId,
        approvalStatus: "pending",
      });

      console.log("Created material:", material);

      // Create audit log
      await storage.createAuditLog({
        userId: req.user.id,
        organizationId: req.user.organizationId,
        actionType: "CREATE",
        entityType: "material",
        entityId: material.id,
        changes: { data: req.body },
      });

      res.json(material);
    } catch (error) {
      console.error("Error creating material:", error);
      res.status(500).json({ 
        message: "Failed to create material",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Add endpoint for emission factor suggestions
  app.get("/api/materials/suggest", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { name, uom } = req.query;
      if (!name || !uom) {
        return res.status(400).json({ message: "Material name and UOM are required" });
      }

      // Get suggestion from OpenAI
      const response = await getChatResponse(
        `Suggest an emission factor for a material with the following properties:
        Name: ${name}
        Unit of Measure: ${uom}

        Respond with a number only, representing CO₂e per unit. Use industry standard values.`,
        { organizationId: req.user.organizationId }
      );

      // Extract the numeric value from the response
      const suggestedFactor = parseFloat(response.message);
      if (isNaN(suggestedFactor)) {
        throw new Error("Failed to get valid emission factor suggestion");
      }

      res.json({ emissionFactor: suggestedFactor });
    } catch (error) {
      console.error("Error getting emission factor suggestion:", error);
      res.status(500).json({ message: "Failed to get emission factor suggestion" });
    }
  });

  // Add these new endpoints after the existing routes
  app.get("/api/incidents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Get all incidents
      const allIncidents = await storage.getIncidents(req.user.organizationId);
      console.log("Retrieved incidents:", allIncidents);

      // Get business units for filtering
      const units = await storage.getBusinessUnits(req.user.organizationId);
      console.log("Business units for org:", units);

      // Filter incidents to only show those from the user's organization's business units
      const filteredIncidents = allIncidents.filter(incident =>
        units.some(unit => unit.id === incident.businessUnitId)
      );
      console.log("Filtered incidents:", filteredIncidents);

      res.json(filteredIncidents);
    } catch (error) {
      console.error("Error fetching incidents:", error);
      res.status(500).json({ message: "Failed to fetch incidents" });
    }
  });

  app.post("/api/incidents", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const data = insertIncidentSchema.parse(req.body);

      // Verify business unit ownership
      const units = await storage.getBusinessUnits(req.user.organizationId);
      const hasAccess = units.some(unit => unit.id === data.businessUnitId);
      if (!hasAccess) {
        return res.sendStatus(403);
      }

      const incident = await storage.createIncident({
        ...data,
        reportedBy: req.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create audit log
      await storage.createAuditLog({
        userId: req.user.id,
        organizationId: req.user.organizationId,
        actionType: "CREATE",
        entityType: "incident",
        entityId: incident.id,
        changes: { data: req.body },
      });

      res.json(incident);
    } catch (error) {
      console.error("Error creating incident:", error);
      res.status(500).json({ message: "Failed to create incident" });
    }
  });

  app.patch("/api/incidents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { id } = req.params;
      const data = updateIncidentSchema.parse(req.body);

      // Verify incident ownership
      const incident = await storage.getIncidentById(id);
      if (!incident) {
        return res.status(404).json({ message: "Incident not found" });
      }

      const units = await storage.getBusinessUnits(req.user.organizationId);
      const hasAccess = units.some(unit => unit.id === incident.businessUnitId);
      if (!hasAccess) {
        return res.sendStatus(403);
      }

      const updatedIncident = await storage.updateIncident({
        ...incident,
        ...data,
        id,
        updatedAt: new Date(),
        resolvedAt: data.status === "resolved" ? new Date() : incident.resolvedAt,
        resolutionDetails: data.resolutionComments || incident.resolutionDetails,
      });

      // Create audit log
      await storage.createAuditLog({
        userId: req.user.id,
        organizationId: req.user.organizationId,
        actionType: "UPDATE",
        entityType: "incident",
        entityId: id,
        changes: { before: incident, after: updatedIncident },
      });

      res.json(updatedIncident);
    } catch (error) {
      console.error("Error updating incident:", error);
      res.status(500).json({ message: "Failed to update incident" });
    }
  });

  // Add these new endpoints to manage incident types
  app.get("/api/incident-types", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Get incident types for this organization
      const types = await storage.getIncidentTypes(req.user.organizationId);
      res.json(types);
    } catch (error) {
      console.error("Error fetching incident types:", error);
      res.status(500).json({ message: "Failed to fetch incident types" });
    }
  });

  app.post("/api/incident-types", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const type = await storage.createIncidentType({
        ...req.body,
        organizationId: req.user.organizationId,
      });
      res.json(type);
    } catch (error) {
      console.error("Error creating incident type:", error);
      res.status(500).json({ message: "Failed to create incident type" });
    }
  });

  // Add single incident GET endpoint after the existing /api/incidents endpoint
  app.get("/api/incidents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { id } = req.params;
      console.log("Fetching incident:", id); // Debug log

      const incident = await storage.getIncidentById(id);
      if (!incident) {
        console.log("Incident not found:", id); // Debug log
        return res.status(404).json({ message: "Incident not found" });
      }

      // Verify business unit belongs to user's organization
      const units = await storage.getBusinessUnits(req.user.organizationId);
      const hasAccess = units.some(unit => unit.id === incident.businessUnitId);
      if (!hasAccess) {
        console.log("User does not have access to incident:", id); // Debug log
        return res.sendStatus(403);
      }

      console.log("Successfully fetched incident:", incident); // Debug log
      res.json(incident);
    } catch (error) {
      console.error("Error fetching incident:", error);
      res.status(500).json({ message: "Failed to fetch incident" });
    }
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

      // Extract organization slug from domain
      const slug = domain.split('.')[0];
      console.log("Attempting SSO login for organization:", slug);

      // Find organization by domain
      const org = await storage.getOrganizationBySlug(slug);
      if (!org || !org.ssoEnabled) {
        console.log("SSO not configured for organization:", slug);
        return res.status(400).json({ message: "SSO not configured for this organization" });
      }

      const ssoConfig = org.ssoSettings;
      if (!ssoConfig) {
        console.log("SSO configuration not found for organization:", slug);
        return res.status(400).json({ message: "SSO configuration not found" });
      }

      console.log("Configuring SSO strategy for organization:", slug);
      const strategy = new SamlStrategy(
        {
          path: '/api/auth/sso/callback',
          entryPoint: ssoConfig.entryPoint,
          issuer: ssoConfig.issuer,
          cert: ssoConfig.cert,
        },
        async (profile: any, done: any) => {
          try {
            console.log("Processing SSO profile:", profile.email);
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
              console.log("Created new user for SSO:", user.email);
            }

            return done(null, user);
          } catch (error) {
            console.error("SSO user processing error:", error);
            return done(error);
          }
        }
      );

      passport.use('saml', strategy);
      passport.authenticate('saml')(req, res);
    } catch (error) {
      console.error("SSO authentication error:", error);
      const message = error instanceof Error ? error.message : "SSO authentication failed";
      res.status(400).json({ message });
    }
  });

  app.post('/api/auth/sso/callback', passport.authenticate('saml'), (req, res) => {
    console.log("SSO callback successful, redirecting to dashboard");
    res.redirect('/');
  });

  // Update the login route in registerRoutes function
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, (err) => {
        if (err) return next(err);

        // If remember me is selected, set session to expire in 30 days
        if (req.body.rememberMe) {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        }

        res.json(user);
      });
    })(req, res, next);
  });

  // Add these new endpoints to the existing routes file
  app.get("/api/auth/onedrive/authorize", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { businessUnitId } = req.query;
    if (!businessUnitId) return res.status(400).json({ message: "Business unit ID is required" });

    try {
      // Generate a state parameter to prevent CSRF
      const state = `${businessUnitId}:${Date.now()}`;
      // Store state in session
      req.session.oauthState = state;

      // Get authorization URL
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const authUrl = getOneDriveAuthUrl(state, baseUrl);
      res.json({ authUrl });
    } catch (error) {
      console.error("OneDrive auth error:", error);
      res.status(500).json({ message: "Failed to start authentication" });
    }
  });

  app.get("/api/auth/onedrive/callback", async (req, res) => {
    const { code, state } = req.query;
    const [businessUnitId] = (state as string).split(':');

    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const tokens = await handleOneDriveCallback(code as string, businessUnitId, baseUrl);

      // Redirect back to the application
      res.redirect('/#/integrations/success');
    } catch (error) {
      console.error("OneDrive callback error:", error);
      res.redirect('/#/integrations/error');
    }
  });

  app.get("/api/auth/googledrive/authorize", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { businessUnitId } = req.query;
    if (!businessUnitId) return res.status(400).json({ message: "Business unit ID is required" });

    try {
      // Generate a state parameter to prevent CSRF
      const state = `${businessUnitId}:${Date.now()}`;
      // Store state in session
      req.session.oauthState = state;

      // Get authorization URL
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const authUrl = getGoogleDriveAuthUrl(state, baseUrl);
      res.json({ authUrl });
    } catch (error) {
      console.error("Google Drive auth error:", error);
      res.status(500).json({ message: "Failed to start authentication" });
    }
  });

  app.get("/api/auth/googledrive/callback", async (req, res) => {
    const { code, state } = req.query;
    const [businessUnitId] = (state as string).split(':');

    try {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const tokens = await handleGoogleDriveCallback(code as string, businessUnitId, baseUrl);

      // Redirect back to the application
      res.redirect('/#/integrations/success');
    } catch (error) {
      console.error("Google Drive callback error:", error);
      res.redirect('/#/integrations/error');
    }
  });

  // Add this endpoint for fetching files from storage providers
  app.get("/api/business-units/:id/storage/:provider/files", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { id, provider } = req.params;
      const { path } = req.query;

      // Verify business unit ownership
      const units = await storage.getBusinessUnits(req.user.organizationId);
      const unit = units.find(u => u.id === id);
      if (!unit) return res.sendStatus(403);

      // Get provider-specific client
      const client = await getStorageClient(provider, unit.integrations);
      if (!client) {
        return res.status(400).json({ message: "Storage provider not configured" });
      }

      // List files in the specified path
      const files = await client.listFiles(path as string);
      res.json(files);
    } catch (error) {
      console.error("Error listing files:", error);
      res.status(500).json({ message: "Failed to list files" });
    }
  });

  // Add this endpoint for syncing files from storage providers
  app.post("/api/business-units/:id/storage/:provider/sync", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { id, provider } = req.params;
      const { path } = req.body;

      // Verify business unit ownership
      const units = await storage.getBusinessUnits(req.user.organizationId);
      const unit = units.find(u => u.id === id);
      if (!unit) return res.sendStatus(403);

      // Get provider-specific client
      const client = await getStorageClient(provider, unit.integrations);
      if (!client) {
        return res.status(400).json({ message: "Storage provider not configured" });
      }

      // Sync files from the specified path
      const syncResult = await client.syncFiles(path);

      // Create audit log for the sync operation
      await storage.createAuditLog({
        userId: req.user.id,
        organizationId: req.user.organizationId,
        actionType: "SYNC",
        entityType: "storage",
        entityId: id,
        changes: { provider, path, result: syncResult },
      });

      res.json(syncResult);
    } catch (error) {
      console.error("Error syncing files:", error);
      res.status(500).json({ message: "Failed to sync files" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}