const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

const connectionString = process.env.DATABASE_URL || 'postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]';

async function executeMigrations() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Get PostgreSQL version
    const versionResult = await client.query('SELECT version()');
    console.log('📊 PostgreSQL Version:', versionResult.rows[0].version);
    console.log('\n=====================================\n');

    // Execute migrations
    console.log('🚀 Starting migrations...\n');

    // Read the combined migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251114_all_production_migrations.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    // Split by major sections to execute separately
    const sections = migrationSQL.split(/-- =====================================================\n/);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i].trim();
      if (!section) continue;

      // Extract section title
      const titleMatch = section.match(/^-- (.+?)(?:\n|$)/);
      const title = titleMatch ? titleMatch[1] : `Section ${i}`;

      try {
        console.log(`⏳ Executing: ${title}`);
        
        // Split section into individual statements
        const statements = section
          .split(/;\s*(?=\n|$)/)
          .filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'))
          .map(stmt => stmt.trim() + ';');

        for (const stmt of statements) {
          if (stmt.length > 10) { // Skip empty statements
            await client.query(stmt);
          }
        }
        
        console.log(`✅ Success: ${title}\n`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error in ${title}:`, error.message);
        errors.push({ section: title, error: error.message });
        errorCount++;
        
        // Ask to continue on error
        if (i < sections.length - 1) {
          console.log('Continuing with next section...\n');
        }
      }
    }

    console.log('\n=====================================\n');
    console.log('📊 MIGRATION SUMMARY:');
    console.log(`✅ Successful sections: ${successCount}`);
    console.log(`❌ Failed sections: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(({ section, error }) => {
        console.log(`  - ${section}: ${error}`);
      });
    }

    // Verify results
    console.log('\n=====================================\n');
    console.log('🔍 Verifying installation...\n');

    // Check tables
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    console.log('📋 Tables:', tablesResult.rows.length);
    
    // Check indexes
    const indexesResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM pg_indexes 
      WHERE schemaname = 'public'
    `);
    console.log('🔍 Indexes:', indexesResult.rows[0].count);

    // Check functions
    const functionsResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
    `);
    console.log('⚙️  Functions:', functionsResult.rows[0].count);

    // Check views
    const viewsResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.views 
      WHERE table_schema = 'public'
    `);
    console.log('👁️  Views:', viewsResult.rows[0].count);

    console.log('\n✨ Migration execution completed!');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
  } finally {
    await client.end();
    console.log('\n🔒 Connection closed.');
  }
}

// Execute
console.log('🚀 GMB Dashboard Production Readiness Migrations\n');
executeMigrations().catch(console.error);
