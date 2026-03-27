const { z } = require('zod');

// --- Auth Schemas ---
const loginSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(1, 'Password is required'),
  role: z.string().min(1, 'Role is required')
});

// --- User Schemas ---
const userSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address').max(100),
  mobile: z.string().min(10, 'Mobile must be at least 10 characters').max(15).optional().nullable(),
  role_id: z.coerce.number().positive('Role ID must be valid').optional(),
  college_id: z.coerce.number().positive('College ID must be valid').optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional()
}).passthrough();

// --- Role & College Schemas ---
const roleSchema = z.object({
  name: z.string().min(1, 'Role name is required').max(50),
  description: z.string().optional().nullable()
});

const collegeSchema = z.object({
  name: z.string().min(1, 'College name is required').max(100),
  description: z.string().optional().nullable()
});

// --- Bounty Schemas ---
const bountySchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  alloted_points: z.coerce.number().min(0, 'Points cannot be negative').optional().default(0),
  alloted_berries: z.coerce.number().min(0, 'Berries cannot be negative').optional().default(0),
  scheduled_date: z.coerce.date().refine(date => date >= new Date(), {
    message: 'Scheduled date cannot be in the past'
  }).optional().nullable(),
  venue: z.string().optional().nullable(),
  capacity: z.coerce.number().min(0, 'Capacity cannot be negative').optional().nullable(),
  is_active: z.coerce.boolean().optional().default(true),
  created_by: z.string().optional().nullable(),
  modified_by: z.string().optional().nullable(),
  img_url: z.string().optional().nullable(),
}).passthrough();

// --- Reward Schemas ---
const rewardSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional().nullable(),
  berries_required: z.coerce.number().min(1, 'Berries required must be greater than 0'),
  expiry_date: z.coerce.date().refine(date => date >= new Date(), {
    message: 'Expiry date cannot be in the past'
  }).optional().nullable(),
  img_url: z.string().optional().nullable(),
}).passthrough();

// --- Participation & Claims ---
const participationSchema = z.object({
  user_id: z.coerce.number().positive('User ID is required'),
  bounty_id: z.coerce.number().positive('Bounty ID is required').optional().nullable()
});

const pointRequestSchema = z.object({
  activity_title: z.string().min(1, 'Activity title is required').max(255),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  activity_date: z.coerce.date(),
  proof_description: z.string().min(1, 'Proof description is required'),
  points_requested: z.coerce.number().min(0).default(0),
  berries_requested: z.coerce.number().min(0).default(0),
}).passthrough();

// --- Common Schemas ---
const idParamSchema = z.object({
  id: z.coerce.number().positive('ID must be a positive integer')
});

const collegeUpdateSchema = collegeSchema.partial();
const userUpdateSchema = userSchema.partial();
const participationUpdateSchema = participationSchema.partial();
const pointRequestUpdateSchema = pointRequestSchema.partial();

module.exports = {
  loginSchema,
  userSchema,
  userUpdateSchema,
  roleSchema,
  collegeSchema,
  collegeUpdateSchema,
  bountySchema,
  rewardSchema,
  participationSchema,
  participationUpdateSchema,
  pointRequestSchema,
  pointRequestUpdateSchema,
  idParamSchema
};
