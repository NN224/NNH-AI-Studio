// ==========================================
// NNH CODE AUDITOR - FIXED FOR i18n ROUTES
// ==========================================

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ERROR: ANTHROPIC_API_KEY not found!');
  process.exit(1);
}

import { collectFiles } from './fileHandler.js';
import { buildAuditPrompt } from './prompts.js';
import { analyzeCodeWithClaude } from './claudeClient.js';
import { generateFixPrompt } from './generateFixPrompt.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

console.log('✅ Services initialized\n');

// ==========================================
// HELPER: Get correct paths for components
// ==========================================

function getComponentPaths(component) {
  const projectRoot = process.env.PROJECT_PATH 
    ? path.resolve(process.env.PROJECT_PATH)
    : path.resolve(__dirname, '..', '..');

  // Map component names to actual paths in the project
  const componentMap = {
    dashboard: [
      `app/[locale]/(dashboard)/dashboard`,  // Main dashboard page
      `components/dashboard`,                // Dashboard components
      `app/api/dashboard`                    // Dashboard API routes
    ],
    locations: [
      `app/[locale]/(dashboard)/locations`,
      `components/locations`,
      `app/api/locations`
    ],
    reviews: [
      `app/[locale]/(dashboard)/reviews`,
      `components/reviews`,
      `app/api/reviews`
    ],
    questions: [
      `app/[locale]/(dashboard)/questions`,
      `components/questions`,
      `app/api/questions`
    ]
  };

  const paths = componentMap[component] || [`app/${component}`];

  return paths.map(p => path.join(projectRoot, p));
}

// ==========================================
// API ENDPOINTS
// ==========================================

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    projectPath: process.env.PROJECT_PATH || path.resolve(__dirname, '..', '..'),
    services: {
      claude: '✅ Connected',
      fileHandler: '✅ Ready',
      prompts: '✅ Loaded'
    }
  });
});

app.post('/api/audit/:component', async (req, res) => {
  try {
    const { component } = req.params;

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log(`🔍 Starting ${component} Audit`);
    console.log('═══════════════════════════════════════════');
    console.log('');

    // Step 1: Get all paths for this component
    console.log('📁 Step 1: Collecting files...');
    const componentPaths = getComponentPaths(component);
    console.log(`📂 Scanning ${componentPaths.length} directories:`);
    componentPaths.forEach(p => console.log(`   - ${p}`));
    console.log('');

    // Collect files from all paths
    let allFiles = [];
    for (const targetPath of componentPaths) {
      if (fs.existsSync(targetPath)) {
        try {
          const files = collectFiles(targetPath);
          allFiles = allFiles.concat(files);
          console.log(`   ✅ ${path.basename(targetPath)}: ${files.length} files`);
        } catch (error) {
          console.log(`   ⚠️ ${path.basename(targetPath)}: ${error.message}`);
        }
      } else {
        console.log(`   ⚠️ ${path.basename(targetPath)}: not found`);
      }
    }

    if (allFiles.length === 0) {
      throw new Error(
        `No files found for component "${component}".\n` +
        `Searched in:\n${componentPaths.map(p => `  - ${p}`).join('\n')}`
      );
    }

    const totalLines = allFiles.reduce((sum, f) => sum + f.lines, 0);
    const totalSize = allFiles.reduce((sum, f) => sum + f.size, 0);
    console.log(`\n📊 Total: ${allFiles.length} files, ${totalLines} lines, ${(totalSize / 1024).toFixed(2)} KB`);
    console.log('');

    // Step 2: Build prompt
    console.log('📝 Step 2: Building audit prompt...');
    const prompt = buildAuditPrompt(component, allFiles);
    console.log(`✅ Prompt built (${prompt.length} characters)`);
    console.log('');

    // Step 3: Send to Claude
    console.log('🤖 Step 3: Sending to Claude...');
    console.log('⏳ This may take 30-60 seconds...');
    const startTime = Date.now();

    const analysis = await analyzeCodeWithClaude(prompt);

    if (!analysis.success) {
      throw new Error(analysis.error || 'Claude API failed');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Analysis complete in ${duration}s`);
    console.log('');

    // Step 4: Generate Fix Prompt
    console.log('🔧 Step 4: Generating fix prompt...');
    const fixPrompt = generateFixPrompt(analysis.text, component);
    console.log(`✅ Fix prompt generated (${fixPrompt.length} characters)`);

    // Optional: Save to file
    if (process.env.SAVE_FIX_PROMPTS === 'true') {
      const outputDir = path.join(process.cwd(), 'audit-reports');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(outputDir, `FIX_PROMPT_${component}_${timestamp}.md`);
      fs.writeFileSync(reportPath, fixPrompt, 'utf-8');
      console.log(`📁 Fix prompt saved: ${reportPath}`);
    }

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('✅ Audit Complete!');
    console.log('═══════════════════════════════════════════');
    console.log('');

    // Return results
    res.json({
      success: true,
      component,
      analysis: {
        content: analysis.text,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalCost: '0.00'
        }
      },
      fixPrompt,
      filesAnalyzed: allFiles.length,
      totalLines,
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('');
    console.error('═══════════════════════════════════════════');
    console.error('❌ Audit Error');
    console.error('═══════════════════════════════════════════');
    console.error('Error:', error.message);
    console.error('');

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/fix-prompt/:component', (req, res) => {
  const { component } = req.params;
  const { report } = req.query;

  if (!report) {
    return res.status(400).json({ error: 'Missing report parameter' });
  }

  try {
    const fixPrompt = generateFixPrompt(decodeURIComponent(report), component);
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="FIX_PROMPT_${component}.md"`);
    res.send(fixPrompt);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 handler
app.use((req, res) => {
  console.warn(`⚠️ 404 - Not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Endpoint not found',
    requested: req.path,
    available: [
      'GET /api/health',
      'POST /api/audit/:component',
      'GET /api/fix-prompt/:component'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ==========================================
// START SERVER
// ==========================================

const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  🚀 NNH Code Auditor Extension          ║');
  console.log('║                                          ║');
  console.log(`║  ✅ Server running on port ${PORT}         ║`);
  console.log(`║  🔗 http://localhost:${PORT}               ║`);
  console.log('║                                          ║');
  console.log('║  📚 API Endpoints:                       ║');
  console.log('║     GET  /api/health                    ║');
  console.log('║     POST /api/audit/:component          ║');
  console.log('║     GET  /api/fix-prompt/:component     ║');
  console.log('║                                          ║');
  console.log('║  🤖 Powered by Claude Sonnet 4.5        ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log('Ready to audit! Open the UI in your browser.');
  console.log('');
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;