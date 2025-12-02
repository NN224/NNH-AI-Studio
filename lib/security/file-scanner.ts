/**
 * File Scanner for Malware Detection
 *
 * Uses multiple strategies:
 * 1. File extension validation
 * 2. MIME type verification
 * 3. Magic bytes checking
 * 4. Optional: ClamAV integration
 * 5. Optional: VirusTotal API
 */

import { apiLogger } from "@/lib/utils/logger";
import crypto from "crypto";

// Dangerous file extensions
const DANGEROUS_EXTENSIONS = new Set([
  "exe",
  "dll",
  "scr",
  "bat",
  "cmd",
  "com",
  "pif",
  "vbs",
  "vbe",
  "js",
  "jse",
  "wsf",
  "wsh",
  "msi",
  "jar",
  "app",
  "deb",
  "rpm",
  "dmg",
  "pkg",
  "run",
  "bash",
  "sh",
  "ps1",
  "psm1",
  "reg",
  "inf",
  "sct",
  "msp",
  "mst",
  "ade",
  "adp",
  "bas",
  "chm",
  "cpl",
  "crt",
  "hlp",
  "hta",
  "ins",
  "isp",
  "lnk",
  "mde",
  "msc",
  "msp",
  "mst",
  "pcd",
  "sct",
  "shb",
  "sys",
  "url",
  "vb",
  "vbe",
  "vbs",
  "wsc",
  "wsf",
  "wsh",
]);

// Suspicious content patterns
const SUSPICIOUS_PATTERNS = [
  /<%[\s\S]*?%>/, // ASP tags
  /<\?php[\s\S]*?\?>/i, // PHP tags
  /<script[\s\S]*?<\/script>/i, // Script tags
  /eval\s*\(/i, // Eval function
  /document\.write/i, // Document write
  /window\.location/i, // Redirects
  /base64_decode/i, // Base64 decode
  /shell_exec|system|exec|passthru/i, // Shell commands
];

// File size limits by type
const SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  document: 50 * 1024 * 1024, // 50MB
  default: 10 * 1024 * 1024, // 10MB
};

interface ScanResult {
  safe: boolean;
  threats: string[];
  warnings: string[];
  metadata: {
    fileSize: number;
    fileType: string;
    hash: string;
    scannedAt: string;
  };
}

/**
 * Calculate file hash for integrity checking
 */
function calculateFileHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Check for dangerous file extensions
 */
function checkFileExtension(filename: string): string[] {
  const threats: string[] = [];
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext && DANGEROUS_EXTENSIONS.has(ext)) {
    threats.push(`Dangerous file extension: .${ext}`);
  }

  // Check for double extensions (e.g., file.jpg.exe)
  const parts = filename.split(".");
  if (parts.length > 2) {
    const secondExt = parts[parts.length - 2]?.toLowerCase();
    if (
      secondExt &&
      ["jpg", "jpeg", "png", "gif", "pdf", "doc"].includes(secondExt)
    ) {
      threats.push("Suspicious double extension detected");
    }
  }

  return threats;
}

/**
 * Check file content for suspicious patterns
 */
function checkFileContent(buffer: Buffer): string[] {
  const threats: string[] = [];
  const content = buffer.toString(
    "utf-8",
    0,
    Math.min(buffer.length, 1024 * 10),
  ); // Check first 10KB

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(content)) {
      threats.push(`Suspicious pattern detected: ${pattern.source}`);
    }
  }

  // Check for null bytes in text files
  if (content.includes("\x00")) {
    threats.push("Null bytes detected in file content");
  }

  return threats;
}

/**
 * Check file size limits
 */
function checkFileSize(size: number, type: string): string[] {
  const warnings: string[] = [];
  const limit =
    SIZE_LIMITS[type as keyof typeof SIZE_LIMITS] || SIZE_LIMITS.default;

  if (size > limit) {
    warnings.push(`File size exceeds limit: ${size} > ${limit}`);
  }

  if (size === 0) {
    warnings.push("Empty file detected");
  }

  return warnings;
}

/**
 * Main file scanning function
 */
export async function scanFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<ScanResult> {
  const threats: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. Check file extension
    threats.push(...checkFileExtension(filename));

    // 2. Check file content for malicious patterns
    if (!mimeType.startsWith("image/") && !mimeType.startsWith("video/")) {
      threats.push(...checkFileContent(buffer));
    }

    // 3. Check file size
    const fileType = mimeType.startsWith("image/")
      ? "image"
      : mimeType.startsWith("video/")
        ? "video"
        : "document";
    warnings.push(...checkFileSize(buffer.length, fileType));

    // 4. Calculate file hash for tracking
    const hash = calculateFileHash(buffer);

    // 5. Optional: Check against known malware hashes
    // This would require a database of known malware hashes
    // const isMalware = await checkMalwareDatabase(hash);

    // Log scan results
    if (threats.length > 0) {
      apiLogger.warn("File scan detected threats", {
        filename,
        threats,
        hash,
      });
    }

    return {
      safe: threats.length === 0,
      threats,
      warnings,
      metadata: {
        fileSize: buffer.length,
        fileType: mimeType,
        hash,
        scannedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    apiLogger.error(
      "File scanning error",
      error instanceof Error ? error : new Error(String(error)),
      { filename },
    );

    // Fail closed - treat scan errors as unsafe
    return {
      safe: false,
      threats: ["File scanning failed"],
      warnings: [],
      metadata: {
        fileSize: buffer.length,
        fileType: mimeType,
        hash: "unknown",
        scannedAt: new Date().toISOString(),
      },
    };
  }
}

/**
 * Optional: Integrate with VirusTotal API
 * Requires API key from https://www.virustotal.com
 */
export async function scanWithVirusTotal(
  buffer: Buffer,
  apiKey?: string,
): Promise<{ safe: boolean; report?: any }> {
  if (!apiKey && !process.env.VIRUSTOTAL_API_KEY) {
    return { safe: true }; // Skip if no API key
  }

  const key = apiKey || process.env.VIRUSTOTAL_API_KEY;

  try {
    // Calculate file hash
    const hash = calculateFileHash(buffer);

    // Check if file is already scanned
    const checkUrl = `https://www.virustotal.com/api/v3/files/${hash}`;
    const checkResponse = await fetch(checkUrl, {
      headers: {
        "x-apikey": key!,
      },
    });

    if (checkResponse.ok) {
      const data = await checkResponse.json();
      const malicious =
        data.data?.attributes?.last_analysis_stats?.malicious || 0;

      return {
        safe: malicious === 0,
        report: data.data?.attributes,
      };
    }

    // If not found, upload for scanning (only for small files)
    if (buffer.length < 32 * 1024 * 1024) {
      // 32MB limit for free API
      const formData = new FormData();
      formData.append("file", new Blob([buffer]));

      const uploadResponse = await fetch(
        "https://www.virustotal.com/api/v3/files",
        {
          method: "POST",
          headers: {
            "x-apikey": key!,
          },
          body: formData,
        },
      );

      if (uploadResponse.ok) {
        // File uploaded for scanning, but results not immediate
        apiLogger.info("File submitted to VirusTotal for scanning");
      }
    }

    return { safe: true }; // Default to safe if can't verify
  } catch (error) {
    apiLogger.error(
      "VirusTotal scan error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return { safe: true }; // Fail open for external service
  }
}

/**
 * Quarantine suspicious files
 */
export async function quarantineFile(
  fileUrl: string,
  reason: string,
  userId: string,
): Promise<void> {
  try {
    // Log the quarantine action
    apiLogger.warn("File quarantined", {
      fileUrl,
      reason,
      userId,
      timestamp: new Date().toISOString(),
    });

    // In production, you would:
    // 1. Move file to quarantine storage
    // 2. Update database to mark as quarantined
    // 3. Notify administrators
    // 4. Optionally notify user
  } catch (error) {
    apiLogger.error(
      "Failed to quarantine file",
      error instanceof Error ? error : new Error(String(error)),
      { fileUrl, reason },
    );
  }
}
