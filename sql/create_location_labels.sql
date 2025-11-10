-- Create location_labels table for custom tags/labels
CREATE TABLE IF NOT EXISTS public.location_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color VARCHAR(7), -- Hex color code
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create location_to_labels junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.location_to_labels (
  location_id UUID NOT NULL REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.location_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (location_id, label_id)
);

-- Enable Row Level Security
ALTER TABLE public.location_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_to_labels ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow users to manage their own labels" ON public.location_labels;
DROP POLICY IF EXISTS "Allow users to manage their own location-label links" ON public.location_to_labels;

-- Create RLS policies for location_labels
CREATE POLICY "Allow users to manage their own labels" 
ON public.location_labels 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for location_to_labels
CREATE POLICY "Allow users to manage their own location-label links" 
ON public.location_to_labels 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.gmb_locations 
    WHERE id = location_id 
    AND user_id = auth.uid()
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_location_labels_user_id ON public.location_labels(user_id);
CREATE INDEX IF NOT EXISTS idx_location_to_labels_location_id ON public.location_to_labels(location_id);
CREATE INDEX IF NOT EXISTS idx_location_to_labels_label_id ON public.location_to_labels(label_id);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_location_labels_updated_at ON public.location_labels;
CREATE TRIGGER update_location_labels_updated_at
BEFORE UPDATE ON public.location_labels
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.location_labels IS 'Custom labels/tags for organizing locations';
COMMENT ON TABLE public.location_to_labels IS 'Junction table linking locations to labels (many-to-many)';
