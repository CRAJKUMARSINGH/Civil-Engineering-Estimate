import { z } from "zod";

// Core data models for the estimator system

export const MeasurementItemSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['heading', 'custom', 'abstract']),
  itemNos: z.array(z.string()),
  records: z.array(z.array(z.number())),
  remark: z.string().default(''),
  itemRemarks: z.array(z.string()).default([]),
  total: z.number().optional()
});

export const MeasurementSchema = z.object({
  id: z.string().optional(),
  caption: z.string(),
  items: z.array(MeasurementItemSchema)
});

export const AnalysisItemSchema = z.object({
  id: z.string().optional(),
  code: z.string().optional(),
  description: z.string(),
  unit: z.string(),
  rate: z.number(),
  quantity: z.number().default(1),
  amount: z.number().optional(),
  type: z.enum(['group', 'resource', 'sum']).default('resource')
});

export const ScheduleItemSchema = z.object({
  id: z.string().optional(),
  code: z.string(),
  description: z.string(),
  unit: z.string(),
  rate: z.number(),
  quantity: z.number().default(0),
  amount: z.number().optional(),
  category: z.string().optional(),
  remarks: z.string().default(''),
  analysisItems: z.array(AnalysisItemSchema).default([]),
  measurements: z.array(MeasurementSchema).default([]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const ProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().default(''),
  location: z.string().default(''),
  client: z.string().default(''),
  contractor: z.string().default(''),
  engineer: z.string().default(''),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  totalAmount: z.number().default(0),
  scheduleItems: z.array(ScheduleItemSchema).default([]),
  settings: z.record(z.any()).default({}),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const SSRItemSchema = z.object({
  id: z.string().optional(),
  code: z.string(),
  description: z.string(),
  unit: z.string(),
  rate: z.number(),
  year: z.number(),
  category: z.string(),
  region: z.string().default(''),
  source: z.string().default('DSR')
});

export const TemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().default(''),
  category: z.string().default('general'),
  items: z.array(ScheduleItemSchema),
  metadata: z.record(z.any()).default({}),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional()
});

export const ImportPreviewItemSchema = z.object({
  rowNumber: z.number(),
  code: z.string(),
  description: z.string(),
  unit: z.string(),
  rate: z.number(),
  quantity: z.number().default(0),
  category: z.string().optional(),
  remarks: z.string().default(''),
  selected: z.boolean().default(true),
  validationErrors: z.array(z.string()).default([]),
  ssrMatch: z.object({
    code: z.string(),
    description: z.string(),
    confidence: z.number(),
    rate: z.number()
  }).optional()
});

export const ExcelAnalysisSchema = z.object({
  filename: z.string(),
  sheets: z.array(z.object({
    name: z.string(),
    maxRow: z.number(),
    maxColumn: z.number(),
    dataRows: z.number(),
    hasHeaders: z.boolean(),
    recommendedForImport: z.boolean()
  })),
  totalSheets: z.number(),
  recommendedSheet: z.string().optional(),
  fileSize: z.number(),
  success: z.boolean(),
  errors: z.array(z.string()).default([])
});

export const BatchProcessResultSchema = z.object({
  filename: z.string(),
  success: z.boolean(),
  itemsProcessed: z.number(),
  itemsImported: z.number(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  processingTime: z.number()
});

// Type exports
export type MeasurementItem = z.infer<typeof MeasurementItemSchema>;
export type Measurement = z.infer<typeof MeasurementSchema>;
export type AnalysisItem = z.infer<typeof AnalysisItemSchema>;
export type ScheduleItem = z.infer<typeof ScheduleItemSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type SSRItem = z.infer<typeof SSRItemSchema>;
export type Template = z.infer<typeof TemplateSchema>;
export type ImportPreviewItem = z.infer<typeof ImportPreviewItemSchema>;
export type ExcelAnalysis = z.infer<typeof ExcelAnalysisSchema>;
export type BatchProcessResult = z.infer<typeof BatchProcessResultSchema>;