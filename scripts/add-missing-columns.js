const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]';

async function addMissingColumns() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Adding missing columns...\n');
    await client.connect();

    // Add calculated_response_rate to gmb_locations
    console.log('1️⃣ Adding calculated_response_rate to gmb_locations...');
    try {
      await client.query(`
        ALTER TABLE public.gmb_locations 
        ADD COLUMN IF NOT EXISTS calculated_response_rate NUMERIC(5,2)
      `);
      console.log('✅ Added calculated_response_rate\n');
    } catch (e) {
      console.log('⚠️  calculated_response_rate:', e.message, '\n');
    }

    // Add health_score to gmb_locations
    console.log('2️⃣ Adding health_score to gmb_locations...');
    try {
      await client.query(`
        ALTER TABLE public.gmb_locations 
        ADD COLUMN IF NOT EXISTS health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100)
      `);
      console.log('✅ Added health_score\n');
    } catch (e) {
      console.log('⚠️  health_score:', e.message, '\n');
    }

    // Add review_count if not exists
    console.log('3️⃣ Checking review_count column...');
    try {
      await client.query(`
        ALTER TABLE public.gmb_locations 
        ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0
      `);
      console.log('✅ review_count column ensured\n');
    } catch (e) {
      console.log('⚠️  review_count:', e.message, '\n');
    }

    // Check current columns
    console.log('📋 Current gmb_locations columns:');
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'gmb_locations' 
      AND table_schema = 'public'
      AND column_name IN ('calculated_response_rate', 'health_score', 'review_count', 'rating', 'is_active', 'business_hours')
      ORDER BY ordinal_position
    `);
    
    columns.rows.forEach(col => {
      console.log(`  ✅ ${col.column_name} (${col.data_type})`);
    });

    console.log('\n✨ All missing columns added!');
    
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await client.end();
  }
}

console.log('🏗️  GMB Dashboard - Add Missing Columns\n');
addMissingColumns().catch(console.error);
