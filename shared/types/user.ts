import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(["user", "admin", "super_admin"]),
  createdAt: z.date(),
});

export type User = z.infer<typeof userSchema>;
