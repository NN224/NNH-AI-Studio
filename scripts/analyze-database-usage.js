#!/usr/bin/env node

/**
 * 🔍 Database Usage Analyzer
 * يفحص استخدام الجداول والأعمدة في الكود
 */

const fs = require('fs');
const path = require('path');

// قائمة الجداول من Supabase
const TABLES = [
  'users', 'profiles', 'gmb_accounts', 'gmb_locations', 'gmb_reviews',
  'gmb_questions', 'gmb_posts', 'gmb_media', 'activity_logs', 'ai_requests',
  'ai_settings', 'notifications', 'rate_limit_requests', 'error_logs',
  'performance_metrics', 'weekly_task_recommendations', 'location_features',
  'location_branding', 'sync_transactions', 'sync_errors', 'user_preferences',
  'dashboard_widgets', 'saved_filters', 'api_keys', 'webhooks',
  'webhook_events', 'audit_logs', 'sessions', 'refresh_tokens',
  'password_reset_tokens', 'email_verification_tokens', 'user_roles',
  'permissions', 'role_permissions', 'user_permissions'
];

// الـ Views
const VIEWS = [
  'v_dashboard_stats', 'v_location_performance', 'v_review_summary',
  'v_question_summary', 'v_post_summary'
];

// الـ Functions
const FUNCTIONS = [
  'calculate_health_score', 'get_pending_reviews_count',
  'update_updated_at_column', 'notify_new_review', 'notify_new_question'
];

const results = {
  tables: {},
  views: {},
  functions: {},
  unusedTables: [],
  unusedViews: [],
  unusedFunctions: [],
  totalFiles: 0,
  scannedFiles: 0
};

// مسارات البحث
const SEARCH_PATHS = [
  'app',
  'components',
  'lib',
  'hooks',
  'server',
  'contexts'
];

/**
 * البحث في ملف عن استخدام جدول/view/function
 */
function searchInFile(filePath, searchTerms) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const found = {};

    searchTerms.forEach(term => {
      // البحث عن .from('table') أو .table('table')
      const fromPattern = new RegExp(`\\.from\\(['"\`]${term}['"\`]\\)`, 'g');
      const tablePattern = new RegExp(`\\.table\\(['"\`]${term}['"\`]\\)`, 'g');
      const selectPattern = new RegExp(`['"\`]${term}['"\`]`, 'g');
      
      const fromMatches = (content.match(fromPattern) || []).length;
      const tableMatches = (content.match(tablePattern) || []).length;
      const selectMatches = (content.match(selectPattern) || []).length;
      
      const totalMatches = fromMatches + tableMatches + selectMatches;
      
      if (totalMatches > 0) {
        found[term] = totalMatches;
      }
    });

    return found;
  } catch (error) {
    return {};
  }
}

/**
 * البحث في مجلد بشكل recursive
 */
function searchInDirectory(dirPath, searchTerms) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // تخطي node_modules و .next
      if (file === 'node_modules' || file === '.next' || file === '.git') {
        return;
      }
      searchInDirectory(filePath, searchTerms);
    } else if (stat.isFile()) {
      // فقط ملفات TypeScript/JavaScript
      if (file.match(/\.(ts|tsx|js|jsx)$/)) {
        results.totalFiles++;
        const found = searchInFile(filePath, searchTerms);
        
        if (Object.keys(found).length > 0) {
          results.scannedFiles++;
          Object.entries(found).forEach(([term, count]) => {
            if (!results.tables[term]) {
              results.tables[term] = { count: 0, files: [] };
            }
            results.tables[term].count += count;
            results.tables[term].files.push({
              path: filePath.replace(process.cwd(), ''),
              count: count
            });
          });
        }
      }
    }
  });
}

/**
 * تشغيل التحليل
 */
function analyze() {
  console.log('🔍 بدء تحليل استخدام قاعدة البيانات...\n');

  // البحث عن الجداول
  console.log('📊 البحث عن استخدام الجداول...');
  SEARCH_PATHS.forEach(searchPath => {
    const fullPath = path.join(process.cwd(), searchPath);
    if (fs.existsSync(fullPath)) {
      searchInDirectory(fullPath, TABLES);
    }
  });

  // البحث عن الـ Views
  console.log('📊 البحث عن استخدام الـ Views...');
  SEARCH_PATHS.forEach(searchPath => {
    const fullPath = path.join(process.cwd(), searchPath);
    if (fs.existsSync(fullPath)) {
      searchInDirectory(fullPath, VIEWS);
    }
  });

  // البحث عن الـ Functions
  console.log('📊 البحث عن استخدام الـ Functions...');
  SEARCH_PATHS.forEach(searchPath => {
    const fullPath = path.join(process.cwd(), searchPath);
    if (fs.existsSync(fullPath)) {
      searchInDirectory(fullPath, FUNCTIONS);
    }
  });

  // تحديد الجداول غير المستخدمة
  TABLES.forEach(table => {
    if (!results.tables[table] || results.tables[table].count === 0) {
      results.unusedTables.push(table);
    }
  });

  VIEWS.forEach(view => {
    if (!results.tables[view] || results.tables[view].count === 0) {
      results.unusedViews.push(view);
    }
  });

  FUNCTIONS.forEach(func => {
    if (!results.tables[func] || results.tables[func].count === 0) {
      results.unusedFunctions.push(func);
    }
  });

  // طباعة النتائج
  printResults();
  
  // حفظ النتائج في ملف JSON
  fs.writeFileSync(
    path.join(process.cwd(), 'database-usage-report.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log('\n✅ تم حفظ التقرير في: database-usage-report.json');
}

/**
 * طباعة النتائج
 */
function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 تقرير استخدام قاعدة البيانات');
  console.log('='.repeat(60));

  console.log(`\n📁 الملفات الممسوحة: ${results.scannedFiles} / ${results.totalFiles}`);

  // الجداول المستخدمة
  console.log('\n✅ الجداول المستخدمة:');
  console.log('-'.repeat(60));
  const usedTables = Object.entries(results.tables)
    .filter(([name]) => TABLES.includes(name))
    .sort((a, b) => b[1].count - a[1].count);

  usedTables.forEach(([name, data]) => {
    console.log(`  ${name.padEnd(30)} ${data.count} مرة في ${data.files.length} ملف`);
  });

  // الجداول غير المستخدمة
  if (results.unusedTables.length > 0) {
    console.log('\n❌ الجداول غير المستخدمة:');
    console.log('-'.repeat(60));
    results.unusedTables.forEach(table => {
      console.log(`  ⚠️  ${table}`);
    });
  }

  // الـ Views المستخدمة
  const usedViews = Object.entries(results.tables)
    .filter(([name]) => VIEWS.includes(name))
    .sort((a, b) => b[1].count - a[1].count);

  if (usedViews.length > 0) {
    console.log('\n✅ الـ Views المستخدمة:');
    console.log('-'.repeat(60));
    usedViews.forEach(([name, data]) => {
      console.log(`  ${name.padEnd(30)} ${data.count} مرة في ${data.files.length} ملف`);
    });
  }

  // الـ Views غير المستخدمة
  if (results.unusedViews.length > 0) {
    console.log('\n❌ الـ Views غير المستخدمة:');
    console.log('-'.repeat(60));
    results.unusedViews.forEach(view => {
      console.log(`  ⚠️  ${view}`);
    });
  }

  // الـ Functions المستخدمة
  const usedFunctions = Object.entries(results.tables)
    .filter(([name]) => FUNCTIONS.includes(name))
    .sort((a, b) => b[1].count - a[1].count);

  if (usedFunctions.length > 0) {
    console.log('\n✅ الـ Functions المستخدمة:');
    console.log('-'.repeat(60));
    usedFunctions.forEach(([name, data]) => {
      console.log(`  ${name.padEnd(30)} ${data.count} مرة في ${data.files.length} ملف`);
    });
  }

  // الـ Functions غير المستخدمة
  if (results.unusedFunctions.length > 0) {
    console.log('\n❌ الـ Functions غير المستخدمة:');
    console.log('-'.repeat(60));
    results.unusedFunctions.forEach(func => {
      console.log(`  ⚠️  ${func}`);
    });
  }

  // الإحصائيات
  console.log('\n📊 الإحصائيات:');
  console.log('-'.repeat(60));
  console.log(`  الجداول المستخدمة:        ${usedTables.length} / ${TABLES.length}`);
  console.log(`  الجداول غير المستخدمة:    ${results.unusedTables.length}`);
  console.log(`  الـ Views المستخدمة:       ${usedViews.length} / ${VIEWS.length}`);
  console.log(`  الـ Views غير المستخدمة:   ${results.unusedViews.length}`);
  console.log(`  الـ Functions المستخدمة:   ${usedFunctions.length} / ${FUNCTIONS.length}`);
  console.log(`  الـ Functions غير المستخدمة: ${results.unusedFunctions.length}`);

  console.log('\n' + '='.repeat(60));
}

// تشغيل التحليل
analyze();

