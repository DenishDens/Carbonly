import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

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
    proxy: true, // Enable proxy support
    cookie: {
      secure: false, // Set to false for development
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: "/"
    },
  };

  // Trust first proxy if we're behind one
  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password",
      },
      async (email, password, done) => {
        try {
          console.log("Attempting login for email:", email);
          const user = await storage.getUserByEmail(email);
          if (!user) {
            console.log("User not found:", email);
            return done(null, false, { message: "User not found" });
          }

          if (!(await comparePasswords(password, user.password))) {
            console.log("Invalid password for user:", email);
            return done(null, false, { message: "Invalid password" });
          }

          console.log("Login successful for user:", email);
          return done(null, user);
        } catch (err) {
          console.error("Login error:", err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log("Deserializing user:", id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log("User not found during deserialization:", id);
        return done(new Error("User not found"));
      }
      done(null, user);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration attempt:", req.body.email);
      const { email, password, firstName, lastName } = req.body;

      // Check if email is available
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        console.log("Email already registered:", email);
        return res.status(400).json({ message: "Email is already registered" });
      }

      // Create organization first (single user = single org for now)
      const organization = await storage.createOrganization({
        name: email.split('@')[0], // Use email username as org name
      });

      // Create user with the new organization
      const user = await storage.createUser({
        organizationId: organization.id,
        firstName,
        lastName,
        email,
        password: await hashPassword(password),
        role: "admin", // First user is admin
      });

      console.log("Registration successful:", email);

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    console.log("Logging out user");
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log("Checking auth status:", req.isAuthenticated(), req.user);
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}