import { Storage } from "@google-cloud/storage";
import { Client as OneDriveClient } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import { spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs/index.js";
import "@pnp/sp/files/index.js";
import "@pnp/sp/folders/index.js";

// Enhanced interfaces for AI data processing
interface StorageFile {
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

interface ProcessedData {
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

interface Material {
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

interface MaterialMatch {
  sourceText: string;
  matchedMaterial: Material | null;
  confidence: number;
  suggestedMatches?: Material[];
  requiresReview: boolean;
}

interface StorageClient {
  listFiles(path: string): Promise<StorageFile[]>;
  syncFiles(path: string): Promise<{ synced: number; errors: number }>;
}

class OneDriveStorageClient implements StorageClient {
  private client: OneDriveClient;

  constructor(credentials: any) {
    // Initialize OneDrive client with credentials
    this.client = OneDriveClient.init({
      authProvider: (done) => {
        done(null, credentials.accessToken);
      },
    });
  }

  async listFiles(path: string): Promise<StorageFile[]> {
    try {
      const response = await this.client
        .api(`/me/drive/root:${path}:/children`)
        .get();

      return response.value.map((item: any) => ({
        id: item.id,
        name: item.name,
        path: `${path}/${item.name}`,
        type: item.folder ? "folder" : "file",
        lastModified: item.lastModifiedDateTime,
      }));
    } catch (error) {
      console.error("OneDrive list files error:", error);
      return [];
    }
  }

  async syncFiles(path: string): Promise<{ synced: number; errors: number }> {
    try {
      const files = await this.listFiles(path);
      // Here you would implement the actual sync logic
      // For now, we just return the count of files found
      return { synced: files.length, errors: 0 };
    } catch (error) {
      console.error("OneDrive sync error:", error);
      return { synced: 0, errors: 1 };
    }
  }
}

class GoogleDriveStorageClient implements StorageClient {
  private client: Storage;

  constructor(credentials: any) {
    this.client = new Storage({
      credentials: credentials,
    });
  }

  async listFiles(path: string): Promise<StorageFile[]> {
    try {
      const [files] = await this.client.bucket(path).getFiles();
      return files.map((file) => ({
        id: file.id || file.name,
        name: file.name,
        path: `${path}/${file.name}`,
        type: file.name.endsWith('/') ? "folder" : "file",
        lastModified: file.metadata.updated || new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Google Drive list files error:", error);
      return [];
    }
  }

  async syncFiles(path: string): Promise<{ synced: number; errors: number }> {
    try {
      const files = await this.listFiles(path);
      // Here you would implement the actual sync logic
      return { synced: files.length, errors: 0 };
    } catch (error) {
      console.error("Google Drive sync error:", error);
      return { synced: 0, errors: 1 };
    }
  }
}

class SharePointStorageClient implements StorageClient {
  private client: any;

  constructor(credentials: any) {
    const sp = spfi().using(SPFx(credentials));
    this.client = sp;
  }

  async listFiles(path: string): Promise<StorageFile[]> {
    try {
      const items = await this.client.web
        .getFolderByServerRelativePath(path)
        .files();

      return items.map((item: any) => ({
        id: item.UniqueId,
        name: item.Name,
        path: `${path}/${item.Name}`,
        type: "file",
        lastModified: item.TimeLastModified,
      }));
    } catch (error) {
      console.error("SharePoint list files error:", error);
      return [];
    }
  }

  async syncFiles(path: string): Promise<{ synced: number; errors: number }> {
    try {
      const files = await this.listFiles(path);
      // Here you would implement the actual sync logic
      return { synced: files.length, errors: 0 };
    } catch (error) {
      console.error("SharePoint sync error:", error);
      return { synced: 0, errors: 1 };
    }
  }
}

interface AIProcessingResult {
  processedData: ProcessedData[];
  materialMatches: MaterialMatch[];
  unrecognizedMaterials: string[];
  requiresReview: boolean;
}

// Base AI data processing capabilities
interface AIDataProcessor {
  extractText(file: StorageFile): Promise<string>;
  classifyEmissions(text: string): Promise<ProcessedData[]>;
  matchMaterials(items: string[]): Promise<MaterialMatch[]>;
  processFile(file: StorageFile): Promise<AIProcessingResult>;
}

// Extend StorageClient interface to include AI processing
interface StorageClient {
  listFiles(path: string): Promise<StorageFile[]>;
  syncFiles(path: string): Promise<{ synced: number; errors: number }>;
  downloadFile?(fileId: string): Promise<StorageFile>;
  processFile?(file: StorageFile): Promise<AIProcessingResult>;
}

// AI Data Processing implementation
class AIDataProcessingService implements AIDataProcessor {
  private materialLibrary: Material[] = [];

  constructor(materials: Material[]) {
    this.materialLibrary = materials;
  }

  async extractText(file: StorageFile): Promise<string> {
    // Implement OCR and text extraction based on file type
    if (!file.content) {
      throw new Error("File content is not available for extraction");
    }

    if (file.mimeType?.includes("pdf")) {
      // Mock PDF OCR extraction
      console.log(`Extracting text from PDF: ${file.name}`);
      return `Sample invoice for diesel fuel
      Date: 2023-06-15
      Quantity: 500 liters
      Product: Diesel B5
      Cost: $750.00`;
    } else if (file.mimeType?.includes("spreadsheet") || file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
      // Mock CSV/Excel parsing
      console.log(`Parsing structured data from: ${file.name}`);
      return `Date,Business Unit,Material,Quantity,Unit,Cost
      2023-06-15,Operations,Diesel,500,liters,750.00
      2023-06-15,Operations,Electricity,2000,kWh,400.00`;
    }
    
    // Default to returning content as string
    return file.content.toString();
  }

  async classifyEmissions(text: string): Promise<ProcessedData[]> {
    // Mock AI classification logic
    console.log("Classifying emissions data from text");
    
    const results: ProcessedData[] = [];
    
    // Simple keyword-based classification for demonstration
    if (text.toLowerCase().includes("diesel") || text.toLowerCase().includes("fuel")) {
      results.push({
        date: new Date().toISOString().split('T')[0],
        businessUnit: "Operations",
        emissionSource: "Diesel",
        emissionScope: "scope1",
        activityType: "fuel",
        activityData: 500,
        activityUnit: "liters",
        conversionFactor: 2.68,
        co2eEmissions: 500 * 2.68 / 1000, // tons of CO2e
        costImpact: 750,
        sourceFile: "invoice_123.pdf",
        confidence: 0.95,
        status: "completed",
        notes: "AI classified as Scope 1 diesel fuel consumption"
      });
    }
    
    if (text.toLowerCase().includes("electricity") || text.toLowerCase().includes("kwh")) {
      results.push({
        date: new Date().toISOString().split('T')[0],
        businessUnit: "Operations",
        emissionSource: "Electricity",
        emissionScope: "scope2",
        activityType: "electricity",
        activityData: 2000,
        activityUnit: "kWh",
        conversionFactor: 0.85,
        co2eEmissions: 2000 * 0.85 / 1000, // tons of CO2e
        costImpact: 400,
        sourceFile: "electricity_bill.pdf",
        confidence: 0.92,
        status: "completed",
        notes: "AI classified as Scope 2 electricity consumption"
      });
    }
    
    return results;
  }

  async matchMaterials(items: string[]): Promise<MaterialMatch[]> {
    // Mock material matching logic
    console.log("Matching materials from text");
    
    return items.map(item => {
      // Simple string matching for demonstration
      const matchedMaterial = this.materialLibrary.find(
        material => 
          material.name.toLowerCase() === item.toLowerCase() || 
          material.code.toLowerCase() === item.toLowerCase() ||
          (material.description && material.description.toLowerCase().includes(item.toLowerCase()))
      );
      
      const confidence = matchedMaterial ? 0.9 : 0.3;
      
      return {
        sourceText: item,
        matchedMaterial,
        confidence,
        requiresReview: !matchedMaterial || confidence < 0.85,
        suggestedMatches: !matchedMaterial ? 
          this.materialLibrary
            .filter(m => m.category.toLowerCase().includes(item.toLowerCase()) || 
                          m.description.toLowerCase().includes(item.toLowerCase()))
            .slice(0, 3) : 
          undefined
      };
    });
  }

  async processFile(file: StorageFile): Promise<AIProcessingResult> {
    try {
      // Extract text from the file
      const extractedText = await this.extractText(file);
      
      // Classify emissions from the text
      const processedData = await this.classifyEmissions(extractedText);
      
      // Extract potential material names (simplified approach)
      const potentialMaterials = extractedText
        .split(/[\n,]/)
        .map(line => line.trim())
        .filter(line => line.length > 3 && !line.match(/^[0-9.]+$/));
      
      // Match materials
      const materialMatches = await this.matchMaterials(potentialMaterials);
      
      // Identify unrecognized materials
      const unrecognizedMaterials = materialMatches
        .filter(match => match.requiresReview)
        .map(match => match.sourceText);
      
      return {
        processedData,
        materialMatches,
        unrecognizedMaterials,
        requiresReview: unrecognizedMaterials.length > 0 || processedData.some(data => data.confidence < 0.85)
      };
    } catch (error) {
      console.error("Error processing file:", error);
      return {
        processedData: [],
        materialMatches: [],
        unrecognizedMaterials: [],
        requiresReview: true
      };
    }
  }
}

// Add AI processing capabilities to storage clients
class OneDriveStorageClient implements StorageClient {
  private client: OneDriveClient;
  private aiProcessor: AIDataProcessor;

  constructor(credentials: any, materials: Material[] = []) {
    // Initialize OneDrive client with credentials
    this.client = OneDriveClient.init({
      authProvider: (done) => {
        done(null, credentials.accessToken);
      },
    });
    this.aiProcessor = new AIDataProcessingService(materials);
  }

  async listFiles(path: string): Promise<StorageFile[]> {
    try {
      const response = await this.client
        .api(`/me/drive/root:${path}:/children`)
        .get();

      return response.value.map((item: any) => ({
        id: item.id,
        name: item.name,
        path: `${path}/${item.name}`,
        type: item.folder ? "folder" : "file",
        lastModified: item.lastModifiedDateTime,
        mimeType: item.file?.mimeType,
        size: item.size
      }));
    } catch (error) {
      console.error("OneDrive list files error:", error);
      return [];
    }
  }

  async syncFiles(path: string): Promise<{ synced: number; errors: number }> {
    try {
      const files = await this.listFiles(path);
      // Here you would implement the actual sync logic
      // For now, we just return the count of files found
      return { synced: files.length, errors: 0 };
    } catch (error) {
      console.error("OneDrive sync error:", error);
      return { synced: 0, errors: 1 };
    }
  }

  async downloadFile(fileId: string): Promise<StorageFile> {
    try {
      const response = await this.client
        .api(`/me/drive/items/${fileId}/content`)
        .get();
      
      const fileInfo = await this.client
        .api(`/me/drive/items/${fileId}`)
        .get();
      
      return {
        id: fileInfo.id,
        name: fileInfo.name,
        path: fileInfo.parentReference.path + '/' + fileInfo.name,
        type: "file",
        lastModified: fileInfo.lastModifiedDateTime,
        mimeType: fileInfo.file.mimeType,
        size: fileInfo.size,
        content: Buffer.from(response)
      };
    } catch (error) {
      console.error("OneDrive download file error:", error);
      throw error;
    }
  }

  async processFile(file: StorageFile): Promise<AIProcessingResult> {
    if (!file.content) {
      const downloadedFile = await this.downloadFile(file.id);
      return this.aiProcessor.processFile(downloadedFile);
    }
    return this.aiProcessor.processFile(file);
  }
}

class GoogleDriveStorageClient implements StorageClient {
  private client: Storage;
  private aiProcessor: AIDataProcessor;

  constructor(credentials: any, materials: Material[] = []) {
    this.client = new Storage({
      credentials: credentials,
    });
    this.aiProcessor = new AIDataProcessingService(materials);
  }

  async listFiles(path: string): Promise<StorageFile[]> {
    try {
      const [files] = await this.client.bucket(path).getFiles();
      return files.map((file) => ({
        id: file.id || file.name,
        name: file.name,
        path: `${path}/${file.name}`,
        type: file.name.endsWith('/') ? "folder" : "file",
        lastModified: file.metadata.updated || new Date().toISOString(),
        mimeType: file.metadata.contentType,
        size: parseInt(file.metadata.size, 10)
      }));
    } catch (error) {
      console.error("Google Drive list files error:", error);
      return [];
    }
  }

  async syncFiles(path: string): Promise<{ synced: number; errors: number }> {
    try {
      const files = await this.listFiles(path);
      // Here you would implement the actual sync logic
      return { synced: files.length, errors: 0 };
    } catch (error) {
      console.error("Google Drive sync error:", error);
      return { synced: 0, errors: 1 };
    }
  }

  async downloadFile(fileId: string): Promise<StorageFile> {
    try {
      const file = this.client.bucket(fileId.split('/')[0]).file(fileId.split('/').slice(1).join('/'));
      const [fileContent] = await file.download();
      const [metadata] = await file.getMetadata();
      
      return {
        id: fileId,
        name: file.name,
        path: `${fileId.split('/')[0]}/${file.name}`,
        type: "file",
        lastModified: metadata.updated,
        mimeType: metadata.contentType,
        size: parseInt(metadata.size, 10),
        content: fileContent
      };
    } catch (error) {
      console.error("Google Drive download file error:", error);
      throw error;
    }
  }

  async processFile(file: StorageFile): Promise<AIProcessingResult> {
    if (!file.content) {
      const downloadedFile = await this.downloadFile(file.id);
      return this.aiProcessor.processFile(downloadedFile);
    }
    return this.aiProcessor.processFile(file);
  }
}

class SharePointStorageClient implements StorageClient {
  private client: any;
  private aiProcessor: AIDataProcessor;

  constructor(credentials: any, materials: Material[] = []) {
    const sp = spfi().using(SPFx(credentials));
    this.client = sp;
    this.aiProcessor = new AIDataProcessingService(materials);
  }

  async listFiles(path: string): Promise<StorageFile[]> {
    try {
      const items = await this.client.web
        .getFolderByServerRelativePath(path)
        .files();

      return items.map((item: any) => ({
        id: item.UniqueId,
        name: item.Name,
        path: `${path}/${item.Name}`,
        type: "file",
        lastModified: item.TimeLastModified,
        mimeType: item.TimeCreated ? "application/octet-stream" : undefined,
        size: item.Length
      }));
    } catch (error) {
      console.error("SharePoint list files error:", error);
      return [];
    }
  }

  async syncFiles(path: string): Promise<{ synced: number; errors: number }> {
    try {
      const files = await this.listFiles(path);
      // Here you would implement the actual sync logic
      return { synced: files.length, errors: 0 };
    } catch (error) {
      console.error("SharePoint sync error:", error);
      return { synced: 0, errors: 1 };
    }
  }

  async downloadFile(fileId: string): Promise<StorageFile> {
    try {
      const file = await this.client.web
        .getFileById(fileId)
        .getBuffer();
      
      const fileInfo = await this.client.web
        .getFileById(fileId)
        .select("Name,ServerRelativeUrl,Length,TimeLastModified,UniqueId")
        .get();
      
      return {
        id: fileInfo.UniqueId,
        name: fileInfo.Name,
        path: fileInfo.ServerRelativeUrl,
        type: "file",
        lastModified: fileInfo.TimeLastModified,
        size: fileInfo.Length,
        content: file
      };
    } catch (error) {
      console.error("SharePoint download file error:", error);
      throw error;
    }
  }

  async processFile(file: StorageFile): Promise<AIProcessingResult> {
    if (!file.content) {
      const downloadedFile = await this.downloadFile(file.id);
      return this.aiProcessor.processFile(downloadedFile);
    }
    return this.aiProcessor.processFile(file);
  }
}

export async function getStorageClient(provider: string, integrations: any, materials: Material[] = []): Promise<StorageClient | null> {
  try {
    const storageIntegrations = integrations?.storage || {};

    switch (provider) {
      case "onedrive":
        if (storageIntegrations.onedrive?.status === "connected") {
          return new OneDriveStorageClient(storageIntegrations.onedrive, materials);
        }
        break;
      case "googledrive":
        if (storageIntegrations.googledrive?.status === "connected") {
          return new GoogleDriveStorageClient(storageIntegrations.googledrive, materials);
        }
        break;
      case "sharepoint":
        if (storageIntegrations.sharepoint?.status === "connected") {
          return new SharePointStorageClient(storageIntegrations.sharepoint, materials);
        }
        break;
    }
    return null;
  } catch (error) {
    console.error("Error creating storage client:", error);
    return null;
  }
}