import { createClient } from '@/lib/supabase/server';
import { MediaGalleryClient } from '@/components/media/MediaGalleryClient';

export default async function MediaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }
  
  const { data: locations } = await supabase
    .from('gmb_locations')
    .select('id, location_name')
    .eq('user_id', user.id);
    
  const { data: media } = await supabase
    .from('gmb_media')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <MediaGalleryClient
      locations={locations || []}
      initialMedia={media || []}
    />
  );
}
