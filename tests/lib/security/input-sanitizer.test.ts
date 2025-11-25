import { describe, it, expect } from "@jest/globals";
import {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeEmail,
  sanitizePhone,
  sanitizeSql,
  sanitizeFileName,
  sanitizeInput,
  validateLength,
  validatePattern,
  VALIDATION_PATTERNS,
} from "@/lib/security/input-sanitizer";

describe("Input Sanitizer - HTML Sanitization", () => {
  it("should allow basic formatting tags", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    const output = sanitizeHtml(input);
    expect(output).toContain("<p>");
    expect(output).toContain("<strong>");
  });

  it("should remove script tags", () => {
    const input = '<script>alert("XSS")</script><p>Safe content</p>';
    const output = sanitizeHtml(input);
    expect(output).not.toContain("<script>");
    expect(output).not.toContain("alert");
    expect(output).toContain("<p>Safe content</p>");
  });

  it("should remove event handlers", () => {
    const input = "<div onclick=\"alert('XSS')\">Click me</div>";
    const output = sanitizeHtml(input);
    expect(output).not.toContain("onclick");
    expect(output).not.toContain("alert");
  });

  it("should remove javascript: URLs", () => {
    const input = "<a href=\"javascript:alert('XSS')\">Link</a>";
    const output = sanitizeHtml(input);
    expect(output).not.toContain("javascript:");
  });

  it("should remove disallowed tags", () => {
    const input = '<iframe src="evil.com"></iframe><p>Safe</p>';
    const output = sanitizeHtml(input);
    expect(output).not.toContain("<iframe>");
    expect(output).toContain("<p>Safe</p>");
  });

  it("should handle empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("should handle null/undefined-like values", () => {
    expect(sanitizeHtml(null as any)).toBe("");
    expect(sanitizeHtml(undefined as any)).toBe("");
  });
});

describe("Input Sanitizer - Text Sanitization", () => {
  it("should remove all HTML tags", () => {
    const input = "<p>Hello <strong>world</strong></p>";
    const output = sanitizeText(input);
    expect(output).toBe("Hello world");
  });

  it("should decode HTML entities", () => {
    const input = "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;";
    const output = sanitizeText(input);
    expect(output).toBe('<script>alert("XSS")</script>');
  });

  it("should handle empty input", () => {
    expect(sanitizeText("")).toBe("");
  });

  it("should trim whitespace", () => {
    const input = "  Hello World  ";
    const output = sanitizeText(input);
    expect(output).toBe("Hello World");
  });
});

describe("Input Sanitizer - URL Sanitization", () => {
  it("should allow http URLs", () => {
    const url = "http://example.com";
    expect(sanitizeUrl(url)).toBe(url);
  });

  it("should allow https URLs", () => {
    const url = "https://example.com";
    expect(sanitizeUrl(url)).toBe(url);
  });

  it("should allow mailto URLs", () => {
    const url = "mailto:test@example.com";
    expect(sanitizeUrl(url)).toBe(url);
  });

  it("should allow tel URLs", () => {
    const url = "tel:+1234567890";
    expect(sanitizeUrl(url)).toBe(url);
  });

  it("should allow relative URLs", () => {
    const url = "/path/to/page";
    expect(sanitizeUrl(url)).toBe(url);
  });

  it("should block javascript: URLs", () => {
    const url = 'javascript:alert("XSS")';
    expect(sanitizeUrl(url)).toBe("");
  });

  it("should block data: URLs", () => {
    const url = 'data:text/html,<script>alert("XSS")</script>';
    expect(sanitizeUrl(url)).toBe("");
  });

  it("should block vbscript: URLs", () => {
    const url = 'vbscript:msgbox("XSS")';
    expect(sanitizeUrl(url)).toBe("");
  });

  it("should block file: URLs", () => {
    const url = "file:///etc/passwd";
    expect(sanitizeUrl(url)).toBe("");
  });

  it("should handle case-insensitive protocol detection", () => {
    expect(sanitizeUrl('JAVASCRIPT:alert("XSS")')).toBe("");
    expect(sanitizeUrl('JaVaScRiPt:alert("XSS")')).toBe("");
  });

  it("should trim whitespace", () => {
    const url = "  https://example.com  ";
    expect(sanitizeUrl(url)).toBe("https://example.com");
  });
});

describe("Input Sanitizer - Email Sanitization", () => {
  it("should accept valid emails", () => {
    expect(sanitizeEmail("test@example.com")).toBe("test@example.com");
    expect(sanitizeEmail("user.name+tag@example.co.uk")).toBe(
      "user.name+tag@example.co.uk",
    );
  });

  it("should lowercase emails", () => {
    expect(sanitizeEmail("TEST@EXAMPLE.COM")).toBe("test@example.com");
  });

  it("should trim whitespace", () => {
    expect(sanitizeEmail("  test@example.com  ")).toBe("test@example.com");
  });

  it("should reject invalid emails", () => {
    expect(sanitizeEmail("invalid")).toBe("");
    expect(sanitizeEmail("no-at-sign.com")).toBe("");
    expect(sanitizeEmail("@example.com")).toBe("");
    expect(sanitizeEmail("test@")).toBe("");
  });

  it("should reject emails with spaces", () => {
    expect(sanitizeEmail("test @example.com")).toBe("");
    expect(sanitizeEmail("test@ example.com")).toBe("");
  });
});

describe("Input Sanitizer - Phone Sanitization", () => {
  it("should preserve digits and leading plus", () => {
    expect(sanitizePhone("+1234567890")).toBe("+1234567890");
  });

  it("should remove formatting characters", () => {
    expect(sanitizePhone("(123) 456-7890")).toBe("1234567890");
    expect(sanitizePhone("+1 (123) 456-7890")).toBe("+11234567890");
  });

  it("should remove spaces", () => {
    expect(sanitizePhone("123 456 7890")).toBe("1234567890");
  });

  it("should handle international format", () => {
    expect(sanitizePhone("+971501234567")).toBe("+971501234567");
  });

  it("should remove letters", () => {
    expect(sanitizePhone("1-800-FLOWERS")).toBe("1800");
  });
});

describe("Input Sanitizer - SQL Sanitization", () => {
  it("should remove SQL injection attempts", () => {
    expect(sanitizeSql("'; DROP TABLE users; --")).not.toContain("'");
    expect(sanitizeSql("'; DROP TABLE users; --")).not.toContain(";");
    expect(sanitizeSql("'; DROP TABLE users; --")).not.toContain("--");
  });

  it("should remove SQL comment markers", () => {
    expect(sanitizeSql("/* comment */ SELECT")).not.toContain("/*");
    expect(sanitizeSql("/* comment */ SELECT")).not.toContain("*/");
  });

  it("should remove dangerous stored procedures", () => {
    expect(sanitizeSql("xp_cmdshell")).not.toContain("xp_");
    expect(sanitizeSql("sp_executesql")).not.toContain("sp_");
  });

  it("should handle mixed case", () => {
    expect(sanitizeSql("XP_CMDSHELL")).not.toContain("XP_");
    expect(sanitizeSql("SP_EXECUTESQL")).not.toContain("SP_");
  });
});

describe("Input Sanitizer - Filename Sanitization", () => {
  it("should allow valid filenames", () => {
    expect(sanitizeFileName("document.pdf")).toBe("document.pdf");
    expect(sanitizeFileName("my-file_2024.txt")).toBe("my-file_2024.txt");
  });

  it("should remove path traversal attempts", () => {
    expect(sanitizeFileName("../../../etc/passwd")).not.toContain("..");
  });

  it("should replace special characters with underscores", () => {
    const output = sanitizeFileName("my file @#$.txt");
    expect(output).not.toContain(" ");
    expect(output).not.toContain("@");
    expect(output).not.toContain("#");
    expect(output).not.toContain("$");
  });

  it("should limit filename length to 255 characters", () => {
    const longName = "a".repeat(300) + ".txt";
    const output = sanitizeFileName(longName);
    expect(output.length).toBeLessThanOrEqual(255);
    expect(output).toContain(".txt"); // Extension preserved
  });

  it("should preserve file extension when truncating", () => {
    const longName = "a".repeat(300) + ".pdf";
    const output = sanitizeFileName(longName);
    expect(output).toMatch(/\.pdf$/);
  });
});

describe("Input Sanitizer - Generic sanitizeInput", () => {
  it("should route to correct sanitizer based on type", () => {
    expect(sanitizeInput("<p>Test</p>", "html")).toContain("<p>");
    expect(sanitizeInput("<p>Test</p>", "text")).toBe("Test");
    expect(sanitizeInput("javascript:alert(1)", "url")).toBe("");
    expect(sanitizeInput("TEST@EXAMPLE.COM", "email")).toBe("test@example.com");
    expect(sanitizeInput("+1 (123) 456-7890", "phone")).toBe("+11234567890");
    expect(sanitizeInput("'; DROP TABLE users;", "sql")).not.toContain("'");
    expect(sanitizeInput("../etc/passwd", "filename")).not.toContain("..");
  });

  it("should default to text sanitization", () => {
    expect(sanitizeInput("<p>Test</p>", "unknown" as any)).toBe("Test");
  });
});

describe("Input Validator - Length Validation", () => {
  it("should accept valid lengths", () => {
    const result = validateLength("hello", 3, 10);
    expect(result.valid).toBe(true);
  });

  it("should reject too short input", () => {
    const result = validateLength("hi", 3, 10);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("at least 3");
  });

  it("should reject too long input", () => {
    const result = validateLength("very long string here", 3, 10);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("at most 10");
  });

  it("should accept exact minimum length", () => {
    const result = validateLength("abc", 3, 10);
    expect(result.valid).toBe(true);
  });

  it("should accept exact maximum length", () => {
    const result = validateLength("1234567890", 3, 10);
    expect(result.valid).toBe(true);
  });
});

describe("Input Validator - Pattern Validation", () => {
  it("should accept matching patterns", () => {
    const result = validatePattern(
      "test@example.com",
      VALIDATION_PATTERNS.EMAIL,
    );
    expect(result.valid).toBe(true);
  });

  it("should reject non-matching patterns", () => {
    const result = validatePattern("invalid-email", VALIDATION_PATTERNS.EMAIL);
    expect(result.valid).toBe(false);
  });

  it("should use custom error message", () => {
    const result = validatePattern(
      "123",
      /^[a-z]+$/,
      "Must contain only lowercase letters",
    );
    expect(result.valid).toBe(false);
    expect(result.message).toBe("Must contain only lowercase letters");
  });

  it("should validate email pattern", () => {
    expect(
      validatePattern("test@example.com", VALIDATION_PATTERNS.EMAIL).valid,
    ).toBe(true);
    expect(validatePattern("invalid", VALIDATION_PATTERNS.EMAIL).valid).toBe(
      false,
    );
  });

  it("should validate username pattern", () => {
    expect(validatePattern("user123", VALIDATION_PATTERNS.USERNAME).valid).toBe(
      true,
    );
    expect(validatePattern("ab", VALIDATION_PATTERNS.USERNAME).valid).toBe(
      false,
    ); // Too short
    expect(
      validatePattern("user@123", VALIDATION_PATTERNS.USERNAME).valid,
    ).toBe(false); // Invalid char
  });

  it("should validate password pattern", () => {
    // Pattern requires: lowercase, uppercase, digit, and special char from @$!%*?&
    expect(
      validatePattern("Test123!@", VALIDATION_PATTERNS.PASSWORD).valid,
    ).toBe(true);
    expect(validatePattern("weak", VALIDATION_PATTERNS.PASSWORD).valid).toBe(
      false,
    );
  });
});

describe("Input Sanitizer - XSS Prevention", () => {
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg/onload=alert("XSS")>',
    "<iframe src=\"javascript:alert('XSS')\"></iframe>",
    '<body onload=alert("XSS")>',
    '<input onfocus=alert("XSS") autofocus>',
    '<select onfocus=alert("XSS") autofocus>',
    '<textarea onfocus=alert("XSS") autofocus>',
    '<button onclick=alert("XSS")>Click</button>',
    "<a href=\"javascript:alert('XSS')\">Link</a>",
  ];

  it("should sanitize common XSS payloads in HTML", () => {
    xssPayloads.forEach((payload) => {
      const sanitized = sanitizeHtml(payload);
      expect(sanitized).not.toContain("alert");
      expect(sanitized).not.toContain("javascript:");
      expect(sanitized).not.toContain("onerror");
      expect(sanitized).not.toContain("onload");
      expect(sanitized).not.toContain("onfocus");
      expect(sanitized).not.toContain("onclick");
    });
  });

  it("should strip all HTML in text sanitization", () => {
    xssPayloads.forEach((payload) => {
      const sanitized = sanitizeText(payload);
      expect(sanitized).not.toContain("<");
      expect(sanitized).not.toContain(">");
    });
  });

  it("should block XSS in URLs", () => {
    expect(sanitizeUrl('javascript:alert("XSS")')).toBe("");
    expect(sanitizeUrl('data:text/html,<script>alert("XSS")</script>')).toBe(
      "",
    );
  });
});
