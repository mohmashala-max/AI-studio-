import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { UserRole } from "./models";

const JWT_SECRET = process.env.MPAS_JWT_SECRET || "development-only-change-me-32-bytes";
const ACCESS_TOKEN_MINUTES = parseInt(process.env.MPAS_ACCESS_TOKEN_MINUTES || "60", 10);

export interface TokenClaims {
  sub: string;
  role: UserRole;
  tenant_id: string;
  facilities: string[];
  exp: number;
}

export function createAccessToken(
  subject: string,
  role: UserRole,
  tenant_id = "tenant-development",
  facilities: string[] = ["*"]
): string {
  const expiresInSeconds = ACCESS_TOKEN_MINUTES * 60;
  return jwt.sign(
    {
      sub: subject,
      role,
      tenant_id,
      facilities,
    },
    JWT_SECRET,
    { expiresIn: expiresInSeconds }
  );
}

export function verifyToken(token: string): TokenClaims {
  return jwt.verify(token, JWT_SECRET) as TokenClaims;
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
    return parts[1];
  }
  return null;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (!token) {
    return res.status(401).json({ detail: "Missing or invalid authorization token" });
  }
  try {
    const claims = verifyToken(token);
    (req as any).claims = claims;
    next();
  } catch (err) {
    return res.status(401).json({ detail: "Invalid token" });
  }
}

export function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req);
  if (token) {
    try {
      (req as any).claims = verifyToken(token);
    } catch {
      // ignore
    }
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const claims = (req as any).claims as TokenClaims | undefined;
    if (!claims) {
      return res.status(401).json({ detail: "Not authenticated" });
    }
    if (!allowedRoles.includes(claims.role)) {
      return res.status(403).json({ detail: "Insufficient role" });
    }
    next();
  };
}

export function checkFacilityAccess(claims: TokenClaims | undefined, facilityId: string): boolean {
  if (!claims) return true; // development fallback if auth not enforced
  const facilities = claims.facilities || ["*"];
  if (facilities.includes("*") || facilities.includes(facilityId)) {
    return true;
  }
  return false;
}
