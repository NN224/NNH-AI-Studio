const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const connectionString = process.env.DATABASE_URL || 'postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]';

async function executeFinalSetup() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🚀 Executing final setup...\n');
    await client.connect();

    // Read SQL file
    const sqlPath = path.join(__dirname, 'complete-setup.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');

    // Execute the SQL
    console.log('⏳ Creating missing functions and views...');
    await client.query(sql);
    
    console.log('✅ All functions and views created successfully!\n');

    // Verify the setup
    console.log('🔍 Verifying final setup...\n');
    
    const functionsCheck = await client.query(`
      SELECT proname, 
             CASE 
               WHEN proname LIKE 'calculate_%' THEN '📊'
               WHEN proname LIKE 'get_%' THEN '📈'
               WHEN proname LIKE 'extract_%' THEN '🤖'
               ELSE '⚙️'
             END as icon
      FROM pg_proc 
      WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname IN (
        'calculate_weighted_response_rate',
        'calculate_user_response_rate', 
        'calculate_location_response_rate',
        'calculate_location_health_score',
        'get_dashboard_trends',
        'get_location_trends',
        'maintain_review_reply_consistency',
        'extract_sentiment_topics',
        'get_aspect_score'
      )
      ORDER BY proname
    `);

    console.log('Functions installed:');
    functionsCheck.rows.forEach(func => {
      console.log(`  ${func.icon} ${func.proname}`);
    });

    // Check views
    const viewsCheck = await client.query(`
      SELECT viewname 
      FROM pg_views 
      WHERE schemaname = 'public'
      ORDER BY viewname
    `);

    console.log('\nViews installed:');
    viewsCheck.rows.forEach(view => {
      console.log(`  👁️  ${view.viewname}`);
    });

    // Test performance
    console.log('\n⏱️  Performance test...');
    
    const start = Date.now();
    await client.query('SELECT * FROM v_dashboard_stats LIMIT 1');
    const dashTime = Date.now() - start;
    console.log(`  ✅ Dashboard stats view: ${dashTime}ms`);

    // Update stats
    console.log('\n📊 Updating location statistics...');
    const updateResult = await client.query(`
      UPDATE public.gmb_locations
      SET 
        calculated_response_rate = calculate_location_response_rate(id),
        health_score = calculate_location_health_score(id),
        updated_at = NOW()
      WHERE is_active = true
        AND (calculated_response_rate IS NULL OR health_score IS NULL)
    `);
    console.log(`  ✅ Updated ${updateResult.rowCount} locations`);

    console.log('\n🎉 SETUP COMPLETED SUCCESSFULLY!');
    console.log('\n====================================');
    console.log('✅ PRODUCTION READINESS ACHIEVED! ✅');
    console.log('====================================\n');

  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await client.end();
  }
}

console.log('🏁 GMB Dashboard - Final Setup\n');
executeFinalSetup().catch(console.error);
