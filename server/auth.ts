import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import connectPgSimple from "connect-pg-simple";
import { randomUUID } from "crypto";

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

async function sendVerificationEmail(email: string, token: string) {
  // TODO: Implement actual email sending
  // For now, just log the verification link
  const verificationLink = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  console.log('Verification link:', verificationLink);
  console.log('Would send email to:', email);
}

export function setupAuth(app: Express) {
  // Initialize session middleware
  const PostgresSessionStore = connectPgSimple(session);

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);

        if (!user) {
          return done(null, false, { message: "User not found" });
        }

        if (!user.emailVerified) {
          return done(null, false, { message: "Please verify your email first" });
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
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration request body:", req.body);

      // Create user without organization
      const hashedPassword = await hashPassword(req.body.password);
      const verificationToken = randomUUID();

      const userData = {
        ...req.body,
        password: hashedPassword,
        role: "user", // Default role for self-registration
        verificationToken,
        emailVerified: false,
        createdAt: new Date(),
      };

      console.log("Creating user with data:", userData);
      const user = await storage.createUser(userData);

      // Send verification email
      await sendVerificationEmail(user.email, verificationToken);

      // Don't log in unverified users
      res.status(201).json({ 
        message: "Registration successful. Please check your email to verify your account.",
        requiresVerification: true
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });

  app.get("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      const user = await storage.getUserByVerificationToken(token);

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      // Update user verification status
      await storage.updateUser(user.id, {
        emailVerified: true,
        verificationToken: null
      });

      // Auto-login after verification
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Verification successful but failed to log in" });
        }
        res.json({ message: "Email verified successfully" });
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Failed to verify email" });
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

  app.post("/api/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      const verificationToken = randomUUID();
      await storage.updateUser(user.id, { verificationToken });
      await sendVerificationEmail(email, verificationToken);

      res.json({ message: "Verification email sent" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });
}