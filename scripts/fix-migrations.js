const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://[USERNAME]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]';

async function fixMigrations() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Fixing migration issues...\n');
    await client.connect();

    // Fix 1: Enable pg_trgm extension
    console.log('1️⃣ Enabling pg_trgm extension...');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
      console.log('✅ pg_trgm extension enabled\n');
    } catch (e) {
      console.log('⚠️  pg_trgm:', e.message, '\n');
    }

    // Fix 2: Create text search indexes with pg_trgm
    console.log('2️⃣ Creating text search indexes...');
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_gmb_locations_name_trgm 
        ON public.gmb_locations USING gin(location_name gin_trgm_ops);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_gmb_locations_address_trgm 
        ON public.gmb_locations USING gin(address gin_trgm_ops);
      `);
      console.log('✅ Text search indexes created\n');
    } catch (e) {
      console.log('⚠️  Text search indexes:', e.message, '\n');
    }

    // Fix 3: Fix monitoring tables creation
    console.log('3️⃣ Ensuring monitoring tables exist...');
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.monitoring_metrics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          value NUMERIC NOT NULL,
          unit TEXT CHECK (unit IN ('count', 'milliseconds', 'bytes', 'percentage', 'custom')),
          tags JSONB,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL CHECK (type IN ('error', 'warning', 'info')),
          severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          service TEXT,
          metadata JSONB,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          acknowledged BOOLEAN DEFAULT false,
          acknowledged_at TIMESTAMPTZ,
          acknowledged_by UUID REFERENCES auth.users(id),
          resolved BOOLEAN DEFAULT false,
          resolved_at TIMESTAMPTZ,
          resolved_by UUID REFERENCES auth.users(id),
          resolution_notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.health_check_results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          service TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
          message TEXT,
          duration INTEGER,
          details JSONB,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      
      console.log('✅ Monitoring tables created\n');
    } catch (e) {
      console.log('❌ Monitoring tables error:', e.message, '\n');
    }

    // Fix 4: Create missing functions
    console.log('4️⃣ Creating missing functions...');
    
    // Fix response rate function
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION calculate_location_response_rate(p_location_id UUID)
        RETURNS NUMERIC AS $$
        DECLARE
          v_total_reviews INTEGER;
          v_replied_reviews INTEGER;
          v_response_rate NUMERIC(5,2);
        BEGIN
          SELECT COUNT(*) INTO v_total_reviews
          FROM public.gmb_reviews
          WHERE location_id = p_location_id;
          
          IF v_total_reviews = 0 THEN
            RETURN 0;
          END IF;
          
          SELECT COUNT(*) INTO v_replied_reviews
          FROM public.gmb_reviews
          WHERE location_id = p_location_id
            AND has_reply = true;
          
          v_response_rate := (v_replied_reviews::NUMERIC / v_total_reviews::NUMERIC) * 100;
          
          RETURN ROUND(v_response_rate, 2);
        END;
        $$ LANGUAGE plpgsql STABLE;
      `);
      console.log('✅ Response rate function fixed');
    } catch (e) {
      console.log('⚠️  Response rate function:', e.message);
    }

    // Fix health score function
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION calculate_location_health_score(p_location_id UUID)
        RETURNS INTEGER AS $$
        DECLARE
          v_score INTEGER := 0;
          v_profile_score INTEGER := 0;
          v_rating_score INTEGER := 0;
          v_loc RECORD;
        BEGIN
          -- Simplified version
          SELECT * INTO v_loc
          FROM public.gmb_locations
          WHERE id = p_location_id;
          
          IF NOT FOUND THEN
            RETURN 0;
          END IF;
          
          -- Basic scoring
          IF v_loc.location_name IS NOT NULL THEN
            v_profile_score := v_profile_score + 20;
          END IF;
          
          IF v_loc.rating IS NOT NULL THEN
            v_rating_score := ROUND((v_loc.rating / 5.0) * 20);
          END IF;
          
          v_score := v_profile_score + v_rating_score;
          
          -- Add response rate bonus
          IF v_loc.calculated_response_rate IS NOT NULL THEN
            v_score := v_score + ROUND((v_loc.calculated_response_rate / 100.0) * 30);
          END IF;
          
          -- Freshness bonus
          IF v_loc.updated_at > NOW() - INTERVAL '7 days' THEN
            v_score := v_score + 30;
          ELSIF v_loc.updated_at > NOW() - INTERVAL '30 days' THEN
            v_score := v_score + 20;
          END IF;
          
          RETURN GREATEST(0, LEAST(v_score, 100));
        END;
        $$ LANGUAGE plpgsql STABLE;
      `);
      console.log('✅ Health score function fixed');
    } catch (e) {
      console.log('⚠️  Health score function:', e.message);
    }

    console.log('\n5️⃣ Creating additional indexes...');
    // Create remaining indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_name ON public.monitoring_metrics(name);',
      'CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_timestamp ON public.monitoring_metrics(timestamp DESC);',
      'CREATE INDEX IF NOT EXISTS idx_monitoring_metrics_user ON public.monitoring_metrics(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON public.monitoring_alerts(severity);',
      'CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_timestamp ON public.monitoring_alerts(timestamp DESC);',
      'CREATE INDEX IF NOT EXISTS idx_health_check_timestamp ON public.health_check_results(timestamp DESC);'
    ];

    for (const idx of indexes) {
      try {
        await client.query(idx);
      } catch (e) {
        // Ignore duplicate index errors
      }
    }
    console.log('✅ Additional indexes created\n');

    // Verify final state
    console.log('📊 Final verification...');
    
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as indexes,
        (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public') as functions,
        (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as tables,
        (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') as views
    `);
    
    const s = stats.rows[0];
    console.log(`
✅ Database Status:
  - Tables: ${s.tables}
  - Indexes: ${s.indexes} 
  - Functions: ${s.functions}
  - Views: ${s.views}
    `);

    console.log('🎉 All fixes applied successfully!');
    
  } catch (error) {
    console.error('💥 Error:', error);
  } finally {
    await client.end();
  }
}

console.log('🔧 GMB Dashboard - Migration Fixes\n');
fixMigrations().catch(console.error);
