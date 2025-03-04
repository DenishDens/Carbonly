import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import connectPgSimple from "connect-pg-simple";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";

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
  const PostgresSessionStore = connectPgSimple(session);

  // Configure session middleware
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
        ssl: false // Disable SSL for local development
      },
      createTableIfMissing: true,
      tableName: 'session'
    }),
    cookie: {
      secure: false, // Set to false for development
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport authentication
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      }, 
      async (email, password, done) => {
        try {
          console.log("Attempting login for email:", email);
          const user = await storage.getUserByEmail(email);

          if (!user) {
            console.log("Login failed: User not found");
            return done(null, false, { message: "Invalid credentials" });
          }

          if (!user.password || !(await comparePasswords(password, user.password))) {
            console.log("Login failed: Invalid password");
            return done(null, false, { message: "Invalid credentials" });
          }

          console.log("Login successful for user:", user.email);
          return done(null, user);
        } catch (err) {
          console.error("Login error:", err);
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log("Deserializing user with ID:", id);
      const user = await storage.getUserById(id);

      if (!user) {
        console.log("User not found for ID:", id);
        return done(null, false);
      }

      console.log("User deserialized successfully:", user.email);
      done(null, user);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  // Email verification function
  async function sendVerificationEmail(user, req) {
    try {
      // Generate verification token
      const verificationToken = uuidv4();
      
      // Save token to the user record
      await storage.updateUser(user.id, { 
        verificationToken,
        emailVerified: false
      });
      
      // Create verification link
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const verificationUrl = `${baseUrl}/api/verify-email?token=${verificationToken}`;
      
      // Email configuration
      // For development, log the verification URL instead of actually sending an email
      console.log("VERIFICATION LINK:", verificationUrl);
      
      // In production, you would use a real email service
      // const transporter = nodemailer.createTransport({
      //   host: process.env.SMTP_HOST,
      //   port: parseInt(process.env.SMTP_PORT || '587'),
      //   secure: process.env.SMTP_SECURE === 'true',
      //   auth: {
      //     user: process.env.SMTP_USER,
      //     pass: process.env.SMTP_PASSWORD,
      //   },
      // });
      
      // await transporter.sendMail({
      //   from: `"Your App" <${process.env.SMTP_FROM}>`,
      //   to: user.email,
      //   subject: "Verify your email address",
      //   text: `Please verify your email by clicking on the following link: ${verificationUrl}`,
      //   html: `<p>Please verify your email by clicking on the following link: <a href="${verificationUrl}">Verify Email</a></p>`,
      // });
      
      return verificationToken;
    } catch (error) {
      console.error("Error sending verification email:", error);
      throw error;
    }
  }

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration request received:", req.body);
      const hashedPassword = await hashPassword(req.body.password);

      // Default to user role unless specified as super_admin for initial setup
      const role = process.env.INITIAL_SETUP === 'true' && !await storage.getUserByEmail('admin@example.com') 
        ? 'super_admin' 
        : (req.body.role || 'user');

      const userData = {
        ...req.body,
        password: hashedPassword,
        role,
        emailVerified: false,
        createdAt: new Date(),
      };

      console.log("Creating user with data:", { ...userData, password: '[REDACTED]' });
      const user = await storage.createUser(userData);
      console.log("User created successfully:", user.id);
      
      // Send verification email
      await sendVerificationEmail(user, req);

      req.login(user, (err) => {
        if (err) {
          console.error("Login error after registration:", err);
          return next(err);
        }
        console.log("User logged in after registration:", user.id);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });
  
  // Email verification endpoint
  app.get("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).send("Verification token is required");
      }
      
      const user = await storage.verifyUserEmail(token as string);
      
      // Redirect to login page with a success message
      res.redirect('/#/login?verified=true');
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(400).send("Invalid or expired verification link");
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt received for:", req.body.email);
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      if (!user) {
        console.log("Login failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Login failed" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error("Session creation error:", err);
          return next(err);
        }
        console.log("Login successful for user:", user.id);
        res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    const userId = req.user?.id;
    console.log("Logout request received for user:", userId);
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }
      console.log("Logout successful for user:", userId);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("Unauthorized access attempt to /api/user");
      return res.sendStatus(401);
    }
    console.log("Current user data requested:", req.user?.id);
    res.json(req.user);
  });
}