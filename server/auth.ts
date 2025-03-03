import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertOrganizationSchema } from "@shared/schema";
import multer from "multer";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "carbonly-dev-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const email = username;
        const user = await storage.getUserByEmail(email);

        if (!user) {
          return done(null, false, { message: "User not found" });
        }

        if (user.password && !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const orgData = insertOrganizationSchema.parse(req.body);

      // Check if admin email is available
      const existingUser = await storage.getUserByEmail(orgData.adminEmail);
      if (existingUser) {
        return res.status(400).json({ message: "Email is already registered" });
      }

      // Generate a temporary unique slug
      const tempSlug = `org-${Date.now()}`;

      // Create organization
      const organization = await storage.createOrganization({
        name: orgData.name,
        slug: tempSlug,
        logo: null,
        ssoEnabled: false,
        ssoSettings: null,
        createdAt: new Date().toISOString(),
      });

      // Create admin user
      const user = await storage.createUser({
        organizationId: organization.id,
        username: orgData.adminEmail,
        email: orgData.adminEmail,
        password: await hashPassword(orgData.adminPassword),
        role: "super_admin",
        createdAt: new Date().toISOString(),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  // Handle user invitation acceptance
  app.post("/api/join", async (req, res, next) => {
    try {
      const { token, password } = req.body;

      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invalid invitation" });
      }

      if (new Date(invitation.expiresAt) < new Date()) {
        await storage.deleteInvitation(invitation.id);
        return res.status(400).json({ message: "Invitation has expired" });
      }

      const user = await storage.createUser({
        organizationId: invitation.organizationId,
        username: invitation.email.split("@")[0],
        email: invitation.email,
        password: await hashPassword(password),
        role: invitation.role,
        createdAt: new Date().toISOString(),
      });

      await storage.deleteInvitation(invitation.id);

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}