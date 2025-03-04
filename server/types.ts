
// Storage interfaces
export interface StorageFile {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  lastModified: string;
  mimeType?: string;
  size?: number;
  content?: Buffer | string;
  processingStatus?: "pending" | "processing" | "completed" | "error";
}

// Processed data interfaces
export interface ProcessedData {
  date: string;
  businessUnit: string;
  emissionSource: string;
  emissionScope: "scope1" | "scope2" | "scope3" | "unknown";
  activityType: "fuel" | "electricity" | "distance" | "material" | "other";
  activityData: number;
  activityUnit: string;
  conversionFactor: number;
  co2eEmissions: number;
  costImpact?: number;
  sourceFile: string;
  confidence: number;
  status: "processing" | "completed" | "error" | "review_required";
  notes?: string;
  materialId?: string;
}

// Material library interfaces
export interface Material {
  id: string;
  name: string;
  code: string;
  description: string;
  emissionFactor: number;
  unitType: string;
  supplier?: string;
  category: string;
  dateAdded: string;
  lastUpdated: string;
  synonyms?: string[];
  isUserAdded: boolean;
}

export interface MaterialMatch {
  sourceText: string;
  matchedMaterial: Material | null;
  confidence: number;
  suggestedMatches?: Material[];
  requiresReview: boolean;
}

export interface AIProcessingResult {
  processedData: ProcessedData[];
  materialMatches: MaterialMatch[];
  unrecognizedMaterials: string[];
  requiresReview: boolean;
}

// AI interfaces
export interface AIDataProcessor {
  extractText(file: StorageFile): Promise<string>;
  classifyEmissions(text: string): Promise<ProcessedData[]>;
  matchMaterials(items: string[]): Promise<MaterialMatch[]>;
  processFile(file: StorageFile): Promise<AIProcessingResult>;
}

// StorageClient interface
export interface StorageClient {
  listFiles(path: string): Promise<StorageFile[]>;
  syncFiles(path: string): Promise<{ synced: number; errors: number }>;
  downloadFile?(fileId: string): Promise<StorageFile>;
  processFile?(file: StorageFile): Promise<AIProcessingResult>;
}
