import { Client } from "@microsoft/microsoft-graph-client";
import { google } from "googleapis";
import { storage } from "./storage";

// OAuth2 configuration helper
function getOAuthConfig(baseUrl: string) {
  return {
    onedrive: {
      clientId: process.env.ONEDRIVE_CLIENT_ID || "",
      clientSecret: process.env.ONEDRIVE_CLIENT_SECRET || "",
      redirectUri: `${baseUrl}/api/auth/onedrive/callback`,
      scopes: [
        'files.read',
        'files.read.all',
        'offline_access'
      ]
    },
    googledrive: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectUri: `${baseUrl}/api/auth/googledrive/callback`,
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.metadata.readonly'
      ]
    }
  };
}

// OneDrive OAuth2 client
export function getOneDriveAuthUrl(state: string, baseUrl: string) {
  const config = getOAuthConfig(baseUrl).onedrive;
  const baseAuthUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state
  });
  return `${baseAuthUrl}?${params.toString()}`;
}

export async function handleOneDriveCallback(code: string, businessUnitId: string, baseUrl: string) {
  const config = getOAuthConfig(baseUrl).onedrive;
  const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get access token');
  }

  const tokens = await response.json();

  // Store tokens securely
  await storage.updateBusinessUnitIntegration(businessUnitId, {
    type: 'onedrive',
    status: 'connected',
    tokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000)
    }
  });

  return tokens;
}

// Google Drive OAuth2 client
export function getGoogleDriveAuthUrl(state: string, baseUrl: string) {
  const config = getOAuthConfig(baseUrl).googledrive;
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: config.scopes,
    state
  });
}

export async function handleGoogleDriveCallback(code: string, businessUnitId: string, baseUrl: string) {
  const config = getOAuthConfig(baseUrl).googledrive;
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  const { tokens } = await oauth2Client.getToken(code);

  // Store tokens securely
  await storage.updateBusinessUnitIntegration(businessUnitId, {
    type: 'googledrive',
    status: 'connected',
    tokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + ((tokens.expiry_date || 3600) * 1000)
    }
  });

  return tokens;
}

// Token refresh functions
export async function refreshOneDriveToken(businessUnitId: string, refreshToken: string, baseUrl: string) {
  const config = getOAuthConfig(baseUrl).onedrive;
  const tokenUrl = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const tokens = await response.json();

  // Update stored tokens
  await storage.updateBusinessUnitIntegration(businessUnitId, {
    type: 'onedrive',
    status: 'connected',
    tokens: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000)
    }
  });

  return tokens.access_token;
}

export async function refreshGoogleDriveToken(businessUnitId: string, refreshToken: string, baseUrl: string) {
  const config = getOAuthConfig(baseUrl).googledrive;
  const oauth2Client = new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken
  });

  const { token } = await oauth2Client.getAccessToken();

  // Update stored tokens
  await storage.updateBusinessUnitIntegration(businessUnitId, {
    type: 'googledrive',
    status: 'connected',
    tokens: {
      accessToken: token,
      refreshToken: refreshToken,
      expiresAt: Date.now() + (3600 * 1000) // Default to 1 hour
    }
  });

  return token;
}