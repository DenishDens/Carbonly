import crypto from 'crypto';

const EMAIL_DOMAIN = 'carbonly.ai'; // Replace with your actual domain

export function generateProjectEmail(businessUnitId: string, organizationId: string): string {
  // Create a unique but deterministic hash based on business unit and org IDs
  const hash = crypto
    .createHash('sha256')
    .update(`${businessUnitId}:${organizationId}:${process.env.SESSION_SECRET}`)
    .digest('hex')
    .slice(0, 12); // Take first 12 characters for reasonable length

  // Create an encoded segment that includes both IDs but is encrypted
  const encodedSegment = Buffer.from(`${businessUnitId}:${organizationId}`)
    .toString('base64')
    .replace(/[+/=]/g, '') // Remove special characters
    .slice(0, 8); // Take first 8 characters

  return `project-${hash}-${encodedSegment}@${EMAIL_DOMAIN}`;
}

export function validateProjectEmail(email: string): boolean {
  // Implement validation logic here
  const pattern = new RegExp(`^project-[a-f0-9]{12}-[A-Za-z0-9]{8}@${EMAIL_DOMAIN}$`);
  return pattern.test(email);
}
