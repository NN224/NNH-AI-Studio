import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const TABLES = [
  'gmb_accounts',
  'gmb_locations',
  'gmb_reviews',
  'gmb_questions',
  'gmb_posts',
  'gmb_insights',
  'gmb_media',
  'gmb_attributes',
  'oauth_tokens',
  'profiles',
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ يرجى تعيين NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY قبل التشغيل');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const outputDir = path.resolve('exports');
  await fs.mkdir(outputDir, { recursive: true });

  for (const table of TABLES) {
    console.log(`📥 تصدير جدول ${table} ...`);
    const { data, error } = await supabase.from(table).select('*');

    if (error) {
      console.error(`❌ خطأ أثناء قراءة ${table}:`, error.message);
      continue;
    }

    const filePath = path.join(outputDir, `${table}.json`);
    await fs.writeFile(filePath, JSON.stringify(data ?? [], null, 2), 'utf8');
    console.log(`✅ تم حفظ ${(data ?? []).length} سجل في ${filePath}`);
  }

  console.log('\n🎉 انتهى التصدير!');
}

main().catch((err) => {
  console.error('❌ خطأ غير متوقع:', err);
  process.exit(1);
});

