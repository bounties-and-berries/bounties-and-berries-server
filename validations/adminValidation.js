const { z } = require('zod');

const purchaseBerriesSchema = z.object({
  adminId: z.coerce.number().positive(),
  quantity: z.coerce.number().positive(),
  paymentRef: z.string().trim().min(5),
});

const createBerryRuleSchema = z.object({
  name: z.string().trim().min(3),
  category: z.string().trim().min(2),
  points: z.coerce.number().positive(),
  maxPerSemester: z.coerce.number().positive().optional(),
  autoGrant: z.boolean().optional().default(false),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).optional(),
  email: z.string().email().optional(),
  logoUrl: z.string().url().optional(),
  theme: z.string().optional(),
});

module.exports = {
  purchaseBerriesSchema,
  createBerryRuleSchema,
  updateProfileSchema,
};
