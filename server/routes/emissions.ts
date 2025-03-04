import { Router } from "express";
import { db } from "../db";
import { emissions } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// Get emissions by scope
router.get("/scope-:scope", async (req, res) => {
  const scope = `Scope ${req.params.scope}`;
  try {
    const data = await db.select().from(emissions).where(eq(emissions.scope, scope));
    res.json(data.map(emission => ({
      ...emission,
      sourceType: emission.details?.sourceType || "manual"
    })));
  } catch (error) {
    console.error("Error fetching emissions:", error);
    res.status(500).json({ error: "Failed to fetch emissions data" });
  }
});

// Create new emission
router.post("/", async (req, res) => {
  try {
    const [emission] = await db.insert(emissions).values({
      ...req.body,
      details: {
        ...req.body.details,
        sourceType: req.body.sourceType
      }
    }).returning();
    res.status(201).json(emission);
  } catch (error) {
    console.error("Error creating emission:", error);
    res.status(500).json({ error: "Failed to create emission entry" });
  }
});

// Update emission
router.patch("/:id", async (req, res) => {
  try {
    const [emission] = await db
      .update(emissions)
      .set({
        ...req.body,
        details: {
          ...req.body.details,
          sourceType: req.body.sourceType
        }
      })
      .where(eq(emissions.id, req.params.id))
      .returning();
    res.json(emission);
  } catch (error) {
    console.error("Error updating emission:", error);
    res.status(500).json({ error: "Failed to update emission entry" });
  }
});

// Delete emission
router.delete("/:id", async (req, res) => {
  try {
    await db.delete(emissions).where(eq(emissions.id, req.params.id));
    res.sendStatus(200);
  } catch (error) {
    console.error("Error deleting emission:", error);
    res.status(500).json({ error: "Failed to delete emission entry" });
  }
});

export default router;
