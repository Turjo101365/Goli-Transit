import { z } from 'zod';

export const updateUserValidation = z.object({
  name: z.preprocess(v => (typeof v === 'string' && !v.trim() ? undefined : v), z.string().trim().min(2).max(120).optional()),
  email: z.string().trim().email().toLowerCase().optional(),
  role: z.enum(['user', 'moderator', 'admin']).optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
  phone: z.preprocess(v => (typeof v === 'string' && !v.trim() ? null : v), z.string().trim().max(32).nullable().optional())
});

export const inviteAdminValidation = z.object({
  email: z.string().trim().email().toLowerCase(),
  name: z.preprocess(v => (typeof v === 'string' && !v.trim() ? undefined : v), z.string().trim().min(2).max(120).optional()),
  role: z.enum(['admin', 'moderator']).default('admin'),
  tempPassword: z.preprocess(v => (typeof v === 'string' && !v.trim() ? undefined : v), z.string().min(6).optional())
});

export const createNodeValidation = z.object({
  id: z.string().trim().min(2).max(64),
  nameBn: z.string().trim().min(1).max(255),
  nameEn: z.string().trim().min(1).max(255),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  type: z.enum(['metro_station', 'bus_stop', 'landmark']).default('metro_station')
});

export const updateNodeValidation = z.object({
  nameBn: z.string().trim().min(1).max(255).optional(),
  nameEn: z.string().trim().min(1).max(255).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  type: z.enum(['metro_station', 'bus_stop', 'landmark']).optional()
});

export const createEdgeValidation = z.object({
  fromNode: z.string().trim().min(1).max(64),
  toNode: z.string().trim().min(1).max(64),
  mode: z.string().trim().min(1).max(20),
  baseMinutes: z.number().int().min(1).max(300),
  fareTaka: z.number().int().min(0).max(2000)
});

export const updateEdgeValidation = z.object({
  baseMinutes: z.number().int().min(1).max(300).optional(),
  fareTaka: z.number().int().min(0).max(2000).optional(),
  mode: z.string().trim().min(1).max(20).optional()
});

export const broadcastAnomalyValidation = z.object({
  type: z.string().trim().min(1).max(64),
  reason: z.string().trim().min(3).max(255),
  expiresAt: z.string().nullable().optional(),
  durationMinutes: z.number().int().min(5).max(1440).optional(),
  affectedEdges: z.array(
    z.object({
      from: z.string().min(1),
      to: z.string().min(1),
      mode: z.string().optional(),
      multiplier: z.number().min(1).max(10).default(1.5)
    })
  ).optional()
});

export const updateIncidentValidation = z.object({
  status: z.enum(['pending', 'verified', 'rejected', 'resolved'])
});

export const updateSettingValidation = z.object({
  value: z.record(z.any()),
  description: z.string().max(255).optional()
});
