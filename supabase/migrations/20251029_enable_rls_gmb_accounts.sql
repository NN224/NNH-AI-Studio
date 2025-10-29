-- Enable Row Level Security on gmb_accounts table
-- This ensures users can only access their own GMB accounts

-- Enable RLS
ALTER TABLE gmb_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own accounts
CREATE POLICY "Users can view their own accounts" 
ON gmb_accounts FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own accounts
CREATE POLICY "Users can insert their own accounts" 
ON gmb_accounts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own accounts (for disconnect, sync, etc.)
CREATE POLICY "Users can update their own accounts" 
ON gmb_accounts FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy: Users can delete their own accounts
CREATE POLICY "Users can delete their own accounts" 
ON gmb_accounts FOR DELETE 
USING (auth.uid() = user_id);
