"use strict";

import { McpServer } from "../node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js";
import { StdioServerTransport } from "../node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const REQUIRED_ENV_VARS = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];

for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    console.error(`[Supabase MCP] Missing environment variable: ${envVar}`);
    process.exit(1);
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const server = new McpServer({
  name: "supabase",
  version: "0.1.0",
});

function toToolSuccess(payload, summary) {
  return {
    content: [
      {
        type: "text",
        text: summary ?? "Success",
      },
    ],
    structuredContent: payload,
  };
}

function toToolError(error) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
  return {
    content: [
      {
        type: "text",
        text: message,
      },
    ],
    isError: true,
  };
}

server.registerTool(
  "ping",
  {
    title: "Ping Supabase",
    description: "اختبر اتصال Supabase للتأكد من صحة المفاتيح والصلاحيات.",
  },
  async () => {
    try {
      const { error } = await supabase.from("pg_tables").select("tablename", {
        count: "exact",
        head: true,
      });

      if (error) {
        throw error;
      }

      return toToolSuccess(
        { message: "Supabase connection successful." },
        "تم اختبار الاتصال بنجاح."
      );
    } catch (error) {
      return toToolError(error);
    }
  }
);

server.registerTool(
  "list_tables",
  {
    title: "List Tables",
    description: "يعرض جميع الجداول المتاحة ضمن مخطط public.",
  },
  async () => {
    try {
      const { data, error } = await supabase
        .from("pg_tables")
        .select("schemaname, tablename")
        .eq("schemaname", "public")
        .order("tablename", { ascending: true });

      if (error) {
        throw error;
      }

      return toToolSuccess(data ?? [], "تم جلب قائمة الجداول.");
    } catch (error) {
      return toToolError(error);
    }
  }
);

const SelectRowsInputSchema = z.object({
  table: z.string().min(1, "table is required"),
  columns: z.string().default("*"),
  limit: z.number().int().positive().max(1000).default(100),
  filters: z
    .array(
      z.object({
        column: z.string(),
        operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "like", "ilike"]),
        value: z.any(),
      })
    )
    .default([]),
});

server.registerTool(
  "select_rows",
  {
    title: "Select Rows",
    description: "يجلب صفوفاً من جدول محدد مع دعم الفلاتر وحد أقصى للنتائج.",
    inputSchema: SelectRowsInputSchema,
  },
  async (args) => {
    try {
      const { table, columns, limit, filters } = SelectRowsInputSchema.parse(args ?? {});
      let query = supabase.from(table).select(columns).limit(limit);

      for (const filter of filters) {
        const operator = filter.operator;
        if (typeof query[operator] !== "function") {
          throw new Error(`Unsupported operator: ${operator}`);
        }
        query = query[operator](filter.column, filter.value);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return toToolSuccess(
        data ?? [],
        `تم جلب ${Array.isArray(data) ? data.length : 0} صف/صفوف من الجدول ${table}.`
      );
    } catch (error) {
      return toToolError(error);
    }
  }
);

const transport = new StdioServerTransport();

async function main() {
  await server.connect(transport);

  const shutdown = async (signal) => {
    try {
      await transport.close?.();
    } finally {
      process.exit(signal === "SIGINT" ? 130 : 0);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Keep the process alive
  await new Promise(() => {});
}

main().catch((error) => {
  console.error("[Supabase MCP] Failed to start server:", error);
  process.exit(1);
});

