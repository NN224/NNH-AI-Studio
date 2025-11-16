#!/usr/bin/env node

/**
 * 🔍 Database Detailed Analyzer
 * يحلل قاعدة البيانات بالتفصيل ويعطي توصيات
 */

const fs = require('fs');
const path = require('path');

console.log('📊 تحليل مفصل لقاعدة البيانات\n');
console.log('=' .repeat(60));

// قراءة نتائج التحليل السابق
const reportPath = path.join(process.cwd(), 'database-usage-report.json');
if (!fs.existsSync(reportPath)) {
  console.log('❌ لم يتم العثور على database-usage-report.json');
  console.log('⚠️ شغّل أولاً: node scripts/analyze-database-usage.js');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

// الإحصائيات من النتيجة التي أعطاها المستخدم
const dbStats = {
  tables: 61,
  views: 7,
  functions: 90,
  indexes: 381,
  triggers: 44,
  policies: 221
};

console.log('\n📊 إحصائيات قاعدة البيانات الحالية:');
console.log('-'.repeat(60));
console.log(`  الجداول:        ${dbStats.tables} جدول`);
console.log(`  Views:          ${dbStats.views} views`);
console.log(`  Functions:      ${dbStats.functions} functions`);
console.log(`  Indexes:        ${dbStats.indexes} indexes`);
console.log(`  Triggers:       ${dbStats.triggers} triggers`);
console.log(`  Policies:       ${dbStats.policies} policies`);

// تحليل الجداول
console.log('\n\n✅ الجداول المستخدمة في الكود:');
console.log('-'.repeat(60));
const usedTables = Object.entries(report.tables)
  .filter(([name, data]) => data.count > 0)
  .sort((a, b) => b[1].count - a[1].count);

usedTables.forEach(([name, data], index) => {
  const usage = data.count > 100 ? '🔥' : data.count > 50 ? '⭐' : data.count > 10 ? '✅' : '⚠️';
  console.log(`  ${(index + 1).toString().padStart(2)}. ${usage} ${name.padEnd(35)} ${data.count.toString().padStart(4)} مرة في ${data.files.length.toString().padStart(3)} ملف`);
});

console.log(`\n  المجموع: ${usedTables.length} جدول مستخدم`);

// الجداول غير المستخدمة
console.log('\n\n❌ الجداول غير المستخدمة في الكود:');
console.log('-'.repeat(60));
report.unusedTables.forEach((table, index) => {
  console.log(`  ${(index + 1).toString().padStart(2)}. ❌ ${table}`);
});

console.log(`\n  المجموع: ${report.unusedTables.length} جدول غير مستخدم`);

// تحليل الفرق
const totalTablesInCode = usedTables.length + report.unusedTables.length;
const unknownTables = dbStats.tables - totalTablesInCode;

if (unknownTables > 0) {
  console.log('\n\n⚠️ جداول إضافية في قاعدة البيانات:');
  console.log('-'.repeat(60));
  console.log(`  ${unknownTables} جدول موجود في قاعدة البيانات لكن غير مذكور في السكريبت`);
  console.log(`  قد تكون: جداول Supabase الداخلية، أو جداول قديمة`);
}

// تحليل الـ Views
console.log('\n\n📊 تحليل الـ Views:');
console.log('-'.repeat(60));
console.log(`  المستخدمة:      ${dbStats.views - report.unusedViews.length} views`);
console.log(`  غير المستخدمة:  ${report.unusedViews.length} views`);
console.log(`  المجموع:        ${dbStats.views} views`);

if (report.unusedViews.length > 0) {
  console.log('\n  Views غير مستخدمة:');
  report.unusedViews.forEach(view => {
    console.log(`    ❌ ${view}`);
  });
}

// تحليل الـ Functions
console.log('\n\n🔧 تحليل الـ Functions:');
console.log('-'.repeat(60));
console.log(`  المستخدمة:      ${dbStats.functions - report.unusedFunctions.length} functions`);
console.log(`  غير المستخدمة:  ${report.unusedFunctions.length} functions`);
console.log(`  المجموع:        ${dbStats.functions} functions`);

if (report.unusedFunctions.length > 0) {
  console.log('\n  Functions غير مستخدمة:');
  report.unusedFunctions.forEach(func => {
    console.log(`    ❌ ${func}`);
  });
}

console.log('\n  ⚠️ ملاحظة: ${dbStats.functions - report.unusedFunctions.length} functions قد تكون:');
console.log('     - مستخدمة في Triggers');
console.log('     - مستخدمة في Views');
console.log('     - Functions داخلية لـ Supabase');

// تحليل الـ Indexes
console.log('\n\n📑 تحليل الـ Indexes:');
console.log('-'.repeat(60));
const avgIndexesPerTable = (dbStats.indexes / dbStats.tables).toFixed(1);
console.log(`  المجموع:        ${dbStats.indexes} indexes`);
console.log(`  متوسط لكل جدول: ${avgIndexesPerTable} indexes`);

if (avgIndexesPerTable > 6) {
  console.log(`  ⚠️ تحذير: متوسط عالي! قد يكون هناك indexes مكررة أو غير ضرورية`);
} else if (avgIndexesPerTable > 4) {
  console.log(`  ⚠️ ملاحظة: متوسط فوق الطبيعي، تحقق من الـ indexes غير المستخدمة`);
} else {
  console.log(`  ✅ متوسط طبيعي`);
}

// تحليل الـ Triggers
console.log('\n\n⚡ تحليل الـ Triggers:');
console.log('-'.repeat(60));
const avgTriggersPerTable = (dbStats.triggers / dbStats.tables).toFixed(1);
console.log(`  المجموع:        ${dbStats.triggers} triggers`);
console.log(`  متوسط لكل جدول: ${avgTriggersPerTable} triggers`);

if (avgTriggersPerTable > 1) {
  console.log(`  ⚠️ ملاحظة: متوسط عالي، تحقق من الـ triggers الضرورية فقط`);
} else {
  console.log(`  ✅ متوسط طبيعي`);
}

// تحليل الـ Policies
console.log('\n\n🔒 تحليل الـ RLS Policies:');
console.log('-'.repeat(60));
const avgPoliciesPerTable = (dbStats.policies / dbStats.tables).toFixed(1);
console.log(`  المجموع:        ${dbStats.policies} policies`);
console.log(`  متوسط لكل جدول: ${avgPoliciesPerTable} policies`);

if (avgPoliciesPerTable > 5) {
  console.log(`  ⚠️ تحذير: متوسط عالي جداً! قد يكون هناك policies مكررة`);
} else if (avgPoliciesPerTable > 3) {
  console.log(`  ⚠️ ملاحظة: متوسط عالي، تحقق من الـ policies المكررة`);
} else {
  console.log(`  ✅ متوسط طبيعي`);
}

// التوصيات
console.log('\n\n🎯 التوصيات الرئيسية:');
console.log('='.repeat(60));

let priority = 1;

// توصية 1: الجداول غير المستخدمة
if (report.unusedTables.length > 0) {
  console.log(`\n${priority++}. ❌ حذف الجداول غير المستخدمة (${report.unusedTables.length} جدول)`);
  console.log(`   توفير متوقع: ~${(report.unusedTables.length * 5).toFixed(0)} MB`);
  console.log(`   الأولوية: 🔴 عالية`);
}

// توصية 2: Views غير مستخدمة
if (report.unusedViews.length > 0) {
  console.log(`\n${priority++}. ❌ حذف الـ Views غير المستخدمة (${report.unusedViews.length} views)`);
  console.log(`   توفير متوقع: ~${(report.unusedViews.length * 0.1).toFixed(1)} MB`);
  console.log(`   الأولوية: 🟡 متوسطة`);
}

// توصية 3: Functions غير مستخدمة
if (report.unusedFunctions.length > 0) {
  console.log(`\n${priority++}. ⚠️ مراجعة الـ Functions غير المستخدمة (${report.unusedFunctions.length} functions)`);
  console.log(`   ملاحظة: تحقق أولاً من استخدامها في Triggers`);
  console.log(`   الأولوية: 🟡 متوسطة`);
}

// توصية 4: Indexes
if (avgIndexesPerTable > 4) {
  console.log(`\n${priority++}. 📑 فحص الـ Indexes غير المستخدمة`);
  console.log(`   شغّل: scripts/detailed-database-report.sql (Query 8)`);
  console.log(`   توفير متوقع: ~${(dbStats.indexes * 0.2 * 0.5).toFixed(0)} MB`);
  console.log(`   الأولوية: 🟠 متوسطة-عالية`);
}

// توصية 5: Policies
if (avgPoliciesPerTable > 3) {
  console.log(`\n${priority++}. 🔒 مراجعة الـ Policies المكررة`);
  console.log(`   شغّل: scripts/detailed-database-report.sql (Query 6)`);
  console.log(`   الأولوية: 🟢 منخفضة`);
}

// توصية 6: الجداول الإضافية
if (unknownTables > 0) {
  console.log(`\n${priority++}. ⚠️ فحص الجداول الإضافية (${unknownTables} جدول)`);
  console.log(`   شغّل: scripts/detailed-database-report.sql (Query 1)`);
  console.log(`   الأولوية: 🟡 متوسطة`);
}

// الخطوات التالية
console.log('\n\n📋 الخطوات التالية:');
console.log('='.repeat(60));
console.log('\n1. شغّل في Supabase SQL Editor:');
console.log('   scripts/detailed-database-report.sql');
console.log('\n2. راجع النتائج بالتفصيل');
console.log('\n3. اعمل Backup قبل أي حذف');
console.log('\n4. شغّل سكريبت التنظيف:');
console.log('   sql/cleanup-unused-database-objects.sql');
console.log('\n5. اختبر التطبيق بعد التنظيف');
console.log('\n6. شغّل VACUUM ANALYZE للتحسين');

// ملخص التوفير المتوقع
const expectedSavings = {
  tables: report.unusedTables.length * 5,
  views: report.unusedViews.length * 0.1,
  indexes: dbStats.indexes * 0.2 * 0.5,
  total: 0
};
expectedSavings.total = expectedSavings.tables + expectedSavings.views + expectedSavings.indexes;

console.log('\n\n💾 التوفير المتوقع:');
console.log('='.repeat(60));
console.log(`  من الجداول:     ~${expectedSavings.tables.toFixed(0)} MB`);
console.log(`  من الـ Views:    ~${expectedSavings.views.toFixed(1)} MB`);
console.log(`  من الـ Indexes:  ~${expectedSavings.indexes.toFixed(0)} MB`);
console.log(`  ${'─'.repeat(40)}`);
console.log(`  المجموع:        ~${expectedSavings.total.toFixed(0)} MB (تقديري)`);
console.log(`  النسبة:         ~${((expectedSavings.total / 500) * 100).toFixed(0)}% من حجم قاعدة البيانات`);

console.log('\n' + '='.repeat(60));
console.log('✅ انتهى التحليل المفصل!\n');

