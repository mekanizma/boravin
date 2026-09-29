-- Add accepted status for admin order workflow
ALTER TYPE "public"."order_status" ADD VALUE IF NOT EXISTS 'accepted';
