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
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const server = new McpServer({
  name: "supabase-v2",
  version: "0.2.0",
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

const ExecuteSQLInputSchema = z.object({
  sql: z.string().min(1, "SQL query is required"),
});

server.registerTool(
  "execute_sql",
  {
    title: "Execute SQL",
    description: "ينفذ استعلام SQL مباشرة. يدعم DDL (CREATE, ALTER, DROP) و DML (INSERT, UPDATE, DELETE) و SELECT.",
    inputSchema: ExecuteSQLInputSchema,
  },
  async (args) => {
    try {
      const { sql } = ExecuteSQLInputSchema.parse(args ?? {});
      
      console.log(`[Supabase MCP] Executing SQL: ${sql.substring(0, 200)}...`);
      
      // استخدم Postgres REST API مباشرة
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ query: sql })
      });

      if (!response.ok) {
        // إذا لم تكن الدالة موجودة، نحتاج لإنشائها أولاً
        if (response.status === 404) {
          // أنشئ دالة تنفيذ SQL إذا لم تكن موجودة
          const createFunction = `
            CREATE OR REPLACE FUNCTION exec_sql(query text)
            RETURNS json AS $$
            DECLARE
              result json;
            BEGIN
              -- تنفيذ الاستعلام وإرجاع النتيجة كـ JSON
              EXECUTE format('SELECT json_agg(row_to_json(t)) FROM (%s) t', query) INTO result;
              
              -- إذا لم تكن هناك نتائج، جرب التنفيذ فقط (للأوامر DDL/DML)
              IF result IS NULL THEN
                EXECUTE query;
                RETURN json_build_object('success', true, 'message', 'Query executed successfully');
              END IF;
              
              RETURN result;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
            
            -- منح الصلاحيات
            GRANT EXECUTE ON FUNCTION exec_sql TO service_role;
          `;

          return toToolSuccess(
            { 
              message: "الدالة exec_sql غير موجودة. يرجى تنفيذ SQL التالي أولاً:",
              sql: createFunction
            },
            "يجب إنشاء دالة exec_sql أولاً"
          );
        }

        const errorText = await response.text();
        throw new Error(`SQL execution failed: ${errorText}`);
      }

      const data = await response.json();
      
      return toToolSuccess(
        data ?? { message: "Query executed successfully" },
        "تم تنفيذ SQL بنجاح"
      );
    } catch (error) {
      // محاولة أخيرة - استخدم pg-api إذا كان متاحاً
      try {
        console.log(`[Supabase MCP] Trying alternative method...`);
        
        // جرب استعلام بسيط للتأكد
        const { data: testData, error: testError } = await supabase
          .from('gmb_locations')
          .select('count')
          .limit(1);
          
        if (!testError) {
          return toToolSuccess(
            { 
              message: "لا يمكن تنفيذ SQL خام مباشرة. استخدم الطرق البديلة:",
              alternatives: [
                "1. انسخ SQL والصقه في Supabase SQL Editor",
                "2. استخدم Supabase CLI: supabase db push",
                "3. أنشئ دالة exec_sql في قاعدة البيانات"
              ],
              test: testData
            },
            "يتطلب تنفيذ SQL إعدادات إضافية"
          );
        }
      } catch (innerError) {
        // تجاهل
      }
      
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
