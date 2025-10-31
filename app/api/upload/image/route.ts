import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const name = `${user.id}/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage.from('gmb-media').upload(name, file, { contentType: file.type, upsert: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage.from('gmb-media').getPublicUrl(name)
    return NextResponse.json({ url: publicUrl, path: name })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}

