import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB per file
const MAX_FILES = 20 // Maximum 20 files per bulk upload
const THUMBNAIL_SIZE = 400
const MAX_IMAGE_DIMENSION = 2048
const STORAGE_BUCKET = 'gmb-media'
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm'
])

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

interface UploadResult {
  fileName: string
  success: boolean
  url?: string
  thumbnailUrl?: string
  error?: string
  metadata?: Record<string, unknown>
}

interface UploadContext {
  supabase: SupabaseServerClient
  userId: string
  locationId?: string
}

interface FilePaths {
  objectPath: string
  thumbnailPath: string
  isVideo: boolean
}

interface ProcessImageParams {
  buffer: Buffer
  supabase: SupabaseServerClient
  thumbnailPath: string
  metadata: Record<string, unknown>
}

interface ProcessImageResult {
  buffer: Buffer
  metadata: Record<string, unknown>
  thumbnailUrl?: string
}

interface UploadOutcome {
  success: boolean
  publicUrl?: string
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = collectFiles(formData)

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({
        error: `Too many files. Maximum ${MAX_FILES} files allowed per upload`
      }, { status: 400 })
    }

    const locationId = (formData.get('locationId') as string | null) ?? undefined
    const context: UploadContext = {
      supabase,
      userId: user.id,
      locationId: locationId || undefined
    }

    const results: UploadResult[] = []

    for (const file of files) {
      results.push(await handleFileUpload(file, context))
    }

    return NextResponse.json(buildSummary(results))
  } catch (error: any) {
    console.error('Bulk upload error:', error)
    return NextResponse.json({
      error: error?.message || 'Bulk upload failed'
    }, { status: 500 })
  }
}

function collectFiles(formData: FormData): File[] {
  const files: File[] = []
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('file') && value instanceof File) {
      files.push(value)
    }
  }
  return files
}

async function handleFileUpload(file: File, context: UploadContext): Promise<UploadResult> {
  const validationError = validateFile(file)
  if (validationError) {
    return createFailureResult(file, validationError)
  }

  try {
    const paths = buildFilePaths(file, context)
    let buffer: Buffer = Buffer.from(await file.arrayBuffer()) as Buffer
    let metadata = createBaseMetadata(file)

    let thumbnailUrl: string | undefined

    if (!paths.isVideo) {
      const processed = await processImageAsset({
        buffer,
        supabase: context.supabase,
        thumbnailPath: paths.thumbnailPath,
        metadata
      })
      buffer = processed.buffer
      metadata = processed.metadata
      thumbnailUrl = processed.thumbnailUrl
    }

    const uploadOutcome = await uploadPrimaryAsset({
      supabase: context.supabase,
      objectPath: paths.objectPath,
      buffer,
      contentType: file.type
    })

    if (!uploadOutcome.success || !uploadOutcome.publicUrl) {
      return createFailureResult(file, uploadOutcome.error || 'Upload failed')
    }

    const effectiveThumbnail = thumbnailUrl ?? (!paths.isVideo ? uploadOutcome.publicUrl : undefined)

    if (context.locationId) {
      await persistMediaRecord(context, {
        locationId: context.locationId,
        fileUrl: uploadOutcome.publicUrl,
        thumbnailUrl: effectiveThumbnail,
        metadata,
        isVideo: paths.isVideo
      })
    }

    return {
      fileName: file.name,
      success: true,
      url: uploadOutcome.publicUrl,
      thumbnailUrl: effectiveThumbnail,
      metadata
    }
  } catch (error: any) {
    console.error(`Error uploading ${file.name}:`, error)
    return createFailureResult(file, error?.message || 'Upload failed')
  }
}

function validateFile(file: File): string | null {
  if (file.size > MAX_SIZE) {
    return 'File too large (max 10MB)'
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return 'Invalid file type'
  }

  return null
}

function buildFilePaths(file: File, context: UploadContext): FilePaths {
  const isVideo = file.type.startsWith('video/')
  const inferredExtension = file.name.split('.').pop()
  const fallbackExtension = isVideo ? 'mp4' : 'jpg'
  const ext = (inferredExtension || fallbackExtension).toLowerCase()
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const basePath = context.locationId
    ? `${context.userId}/${context.locationId}`
    : `${context.userId}/general`

  return {
    objectPath: `${basePath}/${uniqueSuffix}.${ext}`,
    thumbnailPath: `${basePath}/${uniqueSuffix}_thumb.webp`,
    isVideo
  }
}

function createBaseMetadata(file: File): Record<string, unknown> {
  return {
    fileSize: file.size,
    originalSize: file.size,
    fileType: file.type,
    fileName: file.name,
    optimized: false,
    thumbnailGenerated: false,
    uploadedAt: new Date().toISOString()
  }
}

async function processImageAsset(params: ProcessImageParams): Promise<ProcessImageResult> {
  const { buffer, supabase, thumbnailPath } = params
  const metadata = { ...params.metadata }
  let workingBuffer: Buffer = buffer

  try {
    const imageMetadata = await sharp(buffer).metadata()

    if (imageMetadata.width) {
      metadata.width = imageMetadata.width
    }
    if (imageMetadata.height) {
      metadata.height = imageMetadata.height
    }

    if ((imageMetadata.width || 0) > MAX_IMAGE_DIMENSION || (imageMetadata.height || 0) > MAX_IMAGE_DIMENSION) {
      workingBuffer = await sharp(buffer)
        .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toBuffer()

      metadata.optimized = true
      metadata.fileSize = workingBuffer.length
    }

    const thumbnailBuffer = await sharp(workingBuffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 80 })
      .toBuffer()

    const { thumbnailUrl, generated } = await uploadThumbnail(supabase, thumbnailPath, thumbnailBuffer)

    if (generated) {
      metadata.thumbnailGenerated = true
    }

    return {
      buffer: workingBuffer,
      metadata,
      thumbnailUrl
    }
  } catch (error) {
    console.error('Sharp processing error:', error)
    return {
      buffer: workingBuffer,
      metadata
    }
  }
}

async function uploadThumbnail(
  supabase: SupabaseServerClient,
  thumbnailPath: string,
  thumbnailBuffer: Buffer
): Promise<{ thumbnailUrl?: string; generated: boolean }> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(thumbnailPath, thumbnailBuffer, {
      contentType: 'image/webp',
      upsert: false
    })

  if (error) {
    console.error('Thumbnail upload error:', error)
    return { generated: false }
  }

  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(thumbnailPath)

  return {
    thumbnailUrl: publicUrl,
    generated: true
  }
}

async function uploadPrimaryAsset(params: {
  supabase: SupabaseServerClient
  objectPath: string
  buffer: Buffer
  contentType: string
}): Promise<UploadOutcome> {
  const { supabase, objectPath, buffer, contentType } = params

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(objectPath, buffer, {
      contentType,
      upsert: false
    })

  if (error) {
    console.error('Primary upload error:', error)
    return {
      success: false,
      error: error.message
    }
  }

  const { data: { publicUrl } } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(objectPath)

  return {
    success: true,
    publicUrl
  }
}

async function persistMediaRecord(
  context: UploadContext,
  params: {
    locationId: string
    fileUrl: string
    thumbnailUrl?: string
    metadata: Record<string, unknown>
    isVideo: boolean
  }
) {
  const { locationId, fileUrl, thumbnailUrl, metadata, isVideo } = params

  const { error } = await context.supabase
    .from('gmb_media')
    .insert({
      user_id: context.userId,
      location_id: locationId,
      url: fileUrl,
      type: isVideo ? 'VIDEO' : 'PHOTO',
      thumbnail_url: thumbnailUrl ?? null,
      metadata,
      created_at: new Date().toISOString()
    })

  if (error) {
    console.error('Database insert error:', error)
  }
}

function buildSummary(results: UploadResult[]) {
  const uploaded = results.filter(result => result.success).length
  const failed = results.length - uploaded

  return {
    success: uploaded > 0,
    uploaded,
    failed,
    total: results.length,
    results
  }
}

function createFailureResult(file: File, message: string): UploadResult {
  return {
    fileName: file.name,
    success: false,
    error: message
  }
}
