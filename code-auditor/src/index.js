// ==========================================
// NNH CODE AUDITOR - MAIN SERVER (FIXED)
// ==========================================

const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Validate environment
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ERROR: ANTHROPIC_API_KEY not found!');
  console.error('');
  console.error('Please add ANTHROPIC_API_KEY to your Replit Secrets.');
  console.error('Get your API key from: https://console.anthropic.com');
  console.error('');
  process.exit(1);
}

// ✅ CORRECT IMPORTS
const ClaudeClient = require('./claudeClient');
const FileHandler = require('./fileHandler');
const AuditPrompts = require('./prompts');

// Initialize Express server
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files (UI)
app.use(express.static(path.join(__dirname, '../public')));

// CORS for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize services
console.log('🔧 Initializing services...');
const claude = new ClaudeClient(process.env.ANTHROPIC_API_KEY);

// Get project path from environment or use current directory
const projectPath = process.env.PROJECT_PATH || process.cwd();
console.log(`📁 Project path: ${projectPath}`);

const fileHandler = new FileHandler(projectPath);
const prompts = new AuditPrompts();

console.log('✅ Services initialized');
console.log('');

// ==========================================
// API ENDPOINTS
// ==========================================

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    projectPath: projectPath,
    services: {
      claude: '✅ Connected',
      fileHandler: '✅ Ready',
      prompts: '✅ Loaded'
    }
  });
});

/**
 * Audit Dashboard endpoint
 */
app.post('/api/audit/dashboard', async (req, res) => {
  try {
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log('🔍 Starting Dashboard Audit');
    console.log('═══════════════════════════════════════════');
    console.log('');

    // Step 1: Read dashboard files
    console.log('📁 Step 1: Reading dashboard files...');
    console.log(`   Base directory: ${projectPath}`);

    let files;
    try {
      files = await fileHandler.readDashboardFiles();
    } catch (error) {
      console.error('❌ Error reading files:', error.message);

      if (error.message.includes('No dashboard files found')) {
        return res.status(400).json({
          success: false,
          error: 'Dashboard files not found',
          details: 'Make sure PROJECT_PATH in .env points to your NNH-AI-Studio project',
          currentPath: projectPath,
          expectedFiles: [
            'app/[locale]/(dashboard)/dashboard/page.tsx',
            'components/dashboard/stats-cards.tsx',
            'components/dashboard/ai-insights-card.tsx'
          ]
        });
      }

      throw error;
    }

    console.log(`✅ Found ${files.length} files`);
    const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    console.log(`📊 Total: ${totalLines} lines, ${(totalSize / 1024).toFixed(2)} KB`);
    console.log('');

    // Step 2: Build prompt
    console.log('📝 Step 2: Building audit prompt...');
    const prompt = prompts.buildDashboardAudit(files);
    console.log(`✅ Prompt built (${prompt.length} characters)`);
    console.log('');

    // Step 3: Send to Claude
    console.log('🤖 Step 3: Sending to Claude...');
    console.log('⏳ This may take 30-60 seconds...');
    const startTime = Date.now();

    const analysis = await claude.analyze(prompt);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Analysis complete in ${duration}s`);
    console.log(`💰 Cost: $${analysis.usage.totalCost}`);
    console.log('');

    // Step 4: Return results
    console.log('═══════════════════════════════════════════');
    console.log('✅ Audit Complete!');
    console.log('═══════════════════════════════════════════');
    console.log('');

    res.json({
      success: true,
      component: 'dashboard',
      analysis,
      filesAnalyzed: files.length,
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
    console.error('Stack:', error.stack);
    console.error('');

    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Apply fixes endpoint
 */
app.post('/api/fix/apply', async (req, res) => {
  try {
    const { fixes } = req.body;

    if (!fixes || !Array.isArray(fixes)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request. Expected "fixes" array.'
      });
    }

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log(`🔧 Applying ${fixes.length} fixes...`);
    console.log('═══════════════════════════════════════════');
    console.log('');

    const results = [];
    for (let i = 0; i < fixes.length; i++) {
      const fix = fixes[i];
      console.log(`[${i + 1}/${fixes.length}] Applying fix to ${fix.file}...`);

      const result = await fileHandler.applyFix(fix);
      results.push(result);

      if (result.success) {
        console.log(`  ✅ Success`);
      } else {
        console.log(`  ❌ Failed: ${result.error}`);
      }
    }

    const applied = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log(`✅ Applied: ${applied}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('═══════════════════════════════════════════');
    console.log('');

    res.json({
      success: true,
      applied,
      failed,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error applying fixes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * List component files endpoint
 */
app.get('/api/files/:component', async (req, res) => {
  try {
    const { component } = req.params;
    const files = await fileHandler.readComponentFiles(component);

    res.json({
      success: true,
      component,
      files: files.map(f => ({
        path: f.path,
        lines: f.lines,
        size: f.size
      }))
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use((req, res) => {
  console.warn(`⚠️ 404 - Not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Endpoint not found',
    requested: req.path,
    available: [
      'GET /api/health',
      'POST /api/audit/dashboard',
      'POST /api/fix/apply',
      'GET /api/files/:component'
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
  console.log(`✅ Server running on port ${PORT}`);
  console.log('...');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  🚀 NNH Code Auditor Extension          ║');
  console.log('║                                          ║');
  console.log(`║  ✅ Server running on port ${PORT}         ║`);
  console.log(`║  🔗 http://localhost:${PORT}               ║`);
  console.log('║                                          ║');
  console.log('║  📚 API Endpoints:                       ║');
  console.log('║     GET  /api/health                    ║');
  console.log('║     POST /api/audit/dashboard           ║');
  console.log('║     POST /api/fix/apply                 ║');
  console.log('║     GET  /api/files/:component          ║');
  console.log('║                                          ║');
  console.log('║  🤖 Powered by Claude Sonnet 4.5        ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`📁 Monitoring project at: ${projectPath}`);
  console.log('');
  console.log('Ready to audit! Open the UI in your browser.');
  console.log('');
});

// =======================================
// Graceful shutdown
// =======================================
process.on('SIGTERM', () => {
  console.log('');
  console.log('👋 Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('');
  console.log('👋 Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;