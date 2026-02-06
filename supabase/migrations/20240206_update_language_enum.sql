-- Add missing values to language_type enum
-- Using IF NOT EXISTS to avoid errors if they were somehow added partially
ALTER TYPE language_type ADD VALUE IF NOT EXISTS 'English';
ALTER TYPE language_type ADD VALUE IF NOT EXISTS 'Hindi';
ALTER TYPE language_type ADD VALUE IF NOT EXISTS 'Gujarati';
