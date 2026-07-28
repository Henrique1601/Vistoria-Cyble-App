-- Migration: Add hora column to agendamentos table
-- Run this in your Neon SQL editor or via psql

ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS hora TEXT;

-- Update the ORDER BY in the API to use hora
-- The API route already handles NULL hora with NULLS LAST
