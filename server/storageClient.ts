import { Storage } from "@google-cloud/storage";
import { Client as OneDriveClient } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import { spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs/index.js";
import "@pnp/sp/files/index.js";
import "@pnp/sp/folders/index.js";

interface StorageFile {
  id: string;
  name: string;
  path: string;
  type: "file" | "folder";
  lastModified: string;
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

export async function getStorageClient(provider: string, integrations: any): Promise<StorageClient | null> {
  try {
    const storageIntegrations = integrations?.storage || {};

    switch (provider) {
      case "onedrive":
        if (storageIntegrations.onedrive?.status === "connected") {
          return new OneDriveStorageClient(storageIntegrations.onedrive);
        }
        break;
      case "googledrive":
        if (storageIntegrations.googledrive?.status === "connected") {
          return new GoogleDriveStorageClient(storageIntegrations.googledrive);
        }
        break;
      case "sharepoint":
        if (storageIntegrations.sharepoint?.status === "connected") {
          return new SharePointStorageClient(storageIntegrations.sharepoint);
        }
        break;
    }
    return null;
  } catch (error) {
    console.error("Error creating storage client:", error);
    return null;
  }
}