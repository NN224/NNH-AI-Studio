import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const formData = await request.formData();
  const files = formData.getAll('files') as File[];
  const locationId = formData.get('locationId') as string;
  
  const uploaded = [];
  
  for (const file of files) {
    const fileName = `${user.id}/${nanoid()}_${file.name}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error } = await supabase.storage
      .from('media')
      .upload(fileName, file);
      
    if (!error) {
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);
        
      // Save to database
      const { data: mediaRecord } = await supabase
        .from('gmb_media')
        .insert({
          user_id: user.id,
          location_id: locationId,
          url: publicUrl,
          type: 'PHOTO',
          metadata: {
            originalName: file.name,
            size: file.size,
            mimeType: file.type
          }
        })
        .select()
        .single();
        
      uploaded.push(mediaRecord);
    }
  }
  
  return NextResponse.json({ uploaded });
}
