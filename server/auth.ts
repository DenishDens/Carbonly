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

//Removed sendVerificationEmail function

export function setupAuth(app: Express) {
  // Initialize session middleware with explicit typing
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
      tableName: 'session'
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

  // Configure Passport authentication
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

        if (!user.password || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log("Deserializing user with ID:", id);
      const user = await storage.getUserById(id);

      if (!user) {
        console.log("User not found for ID:", id);
        return done(new Error('User not found'), null);
      }

      console.log("User found:", user.email);
      done(null, user);
    } catch (err) {
      console.error("Error deserializing user:", err);
      done(err);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration request body:", req.body);

      // Create user with basic fields
      const hashedPassword = await hashPassword(req.body.password);
      const userData = {
        ...req.body,
        password: hashedPassword,
        role: "user",
        createdAt: new Date(),
      };

      console.log("Creating user with data:", userData);
      const user = await storage.createUser(userData);

      // Log in the user immediately after registration
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
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