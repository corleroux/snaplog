/**
 * Zod schema smoke tests.
 *
 * Validates that the validation schemas are correctly defined
 * and catch invalid data as expected.
 */

import { describe, it, expect } from 'vitest'

describe('Validation Schemas', () => {
  describe('Extraction Request Schemas', () => {
    it('should validate vendor scan types', async () => {
      const { vendorScanTypeSchema } = await import('./extraction/extractionRequest.schema.ts')

      const validTypes = ['vendor_card', 'vendor_signage', 'vendor_brochure', 'vendor_catalog']

      for (const type of validTypes) {
        const result = vendorScanTypeSchema.safeParse(type)
        expect(result.success).toBe(true)
      }
    })

    it('should validate fabric scan types', async () => {
      const { fabricScanTypeSchema } = await import('./extraction/extractionRequest.schema.ts')

      const validTypes = ['product_tag', 'stock_sheet', 'fabric_card', 'multi_variant_sheet']

      for (const type of validTypes) {
        const result = fabricScanTypeSchema.safeParse(type)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid vendor extraction request', async () => {
      const { extractVendorRequestSchema } = await import('./extraction/extractionRequest.schema.ts')

      const invalidRequest = {
        scan_session_id: 'not-a-uuid',
        event_id: 'also-not-a-uuid',
        storage_path: '',
        mime_type: 'not-an-image',
        scan_type: 'invalid_type',
      }

      const result = extractVendorRequestSchema.safeParse(invalidRequest)
      expect(result.success).toBe(false)
    })

    it('should accept valid vendor extraction request', async () => {
      const { extractVendorRequestSchema } = await import('./extraction/extractionRequest.schema.ts')

      const validRequest = {
        scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
        event_id: '987fcdeb-51a2-43f1-a456-426614174000',
        storage_path: 'vendor-documents/test.jpg',
        mime_type: 'image/jpeg',
        scan_type: 'vendor_card' as const,
      }

      const result = extractVendorRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })

    it('should accept valid fabric extraction request', async () => {
      const { extractFabricRequestSchema } = await import('./extraction/extractionRequest.schema.ts')

      const validRequest = {
        scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
        event_id: '987fcdeb-51a2-43f1-a456-426614174000',
        vendor_id: '456e7890-e89b-12d3-a456-426614174000',
        storage_path: 'fabric-documents/test.jpg',
        mime_type: 'image/jpeg',
        scan_type: 'product_tag' as const,
      }

      const result = extractFabricRequestSchema.safeParse(validRequest)
      expect(result.success).toBe(true)
    })
  })

  describe('Vendor Extraction Schemas', () => {
    it('should validate extracted vendor document', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const validVendor = {
        company_name: 'Test Textile Co.',
        booth_number: 'A-42',
        contact_person: 'John Doe',
        email: 'john@test.com',
        phone: '+1 234 567 8900',
        whatsapp: '+1 234 567 8900',
        website_url: 'https://test.com',
        address: '123 Test St',
        country_of_origin: 'USA',
        brand_names: ['Brand1', 'Brand2'],
        notes: 'Test notes',
      }

      const result = extractedVendorDocumentSchema.safeParse(validVendor)
      expect(result.success).toBe(true)
    })

    it('should reject vendor with missing company name', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const invalidVendor = {
        company_name: '',
      }

      const result = extractedVendorDocumentSchema.safeParse(invalidVendor)
      expect(result.success).toBe(false)
    })

    it('should reject vendor with invalid email', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const invalidVendor = {
        company_name: 'Test Co.',
        email: 'not-an-email',
      }

      const result = extractedVendorDocumentSchema.safeParse(invalidVendor)
      expect(result.success).toBe(false)
    })

    it('should reject vendor with invalid website URL', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const invalidVendor = {
        company_name: 'Test Co.',
        website_url: 'test.com',
      }

      const result = extractedVendorDocumentSchema.safeParse(invalidVendor)
      expect(result.success).toBe(false)
    })

    it('should accept brand names as comma-separated string', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const vendorWithBrands = {
        company_name: 'Test Co.',
        brand_names: 'Brand1, Brand2, Brand3',
      }

      const result = extractedVendorDocumentSchema.safeParse(vendorWithBrands)
      expect(result.success).toBe(true)

      if (result.success) {
        expect(result.data.brand_names).toEqual(['Brand1', 'Brand2', 'Brand3'])
      }
    })
  })

  describe('Commit Payload Schemas', () => {
    it('should validate vendor commit payload', async () => {
      const { commitVendorPayloadSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const validPayload = {
        scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
        event_id: '987fcdeb-51a2-43f1-a456-426614174000',
        reviewed_document: {
          company_name: 'Test Co.',
          booth_number: null,
          contact_person: null,
          email: null,
          phone: null,
          whatsapp: null,
          website_url: null,
          address: null,
          country_of_origin: null,
          brand_names: null,
          notes: null,
        },
        source_image: null,
      }

      const result = commitVendorPayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('should validate vendor commit payload with source_image', async () => {
      const { commitVendorPayloadSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const validPayload = {
        scan_session_id: '123e4567-e89b-12d3-a456-426614174000',
        event_id: '987fcdeb-51a2-43f1-a456-426614174000',
        reviewed_document: {
          company_name: 'Test Co.',
          booth_number: 'A-42',
          contact_person: 'John Doe',
          email: 'john@test.com',
          phone: '+1 234 567 8900',
          whatsapp: null,
          website_url: null,
          address: null,
          country_of_origin: null,
          brand_names: ['Brand1', 'Brand2'],
          notes: null,
        },
        source_image: {
          storage_path: 'vendor-documents/test.jpg',
          public_url: 'https://storage.example.com/test.jpg',
        },
      }

      const result = commitVendorPayloadSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('should reject commit payload with invalid scan_session_id', async () => {
      const { commitVendorPayloadSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const invalidPayload = {
        scan_session_id: 'not-a-uuid',
        event_id: '987fcdeb-51a2-43f1-a456-426614174000',
        reviewed_document: {
          company_name: 'Test Co.',
          booth_number: null,
          contact_person: null,
          email: null,
          phone: null,
          whatsapp: null,
          website_url: null,
          address: null,
          country_of_origin: null,
          brand_names: null,
          notes: null,
        },
        source_image: null,
      }

      const result = commitVendorPayloadSchema.safeParse(invalidPayload)
      expect(result.success).toBe(false)
    })
  })

  describe('Phone Validation Edge Cases', () => {
    it('should accept international phone format with country code', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const validPhones = [
        '+86 123 4567 8900',  // China
        '+1 234 567 8900',    // US
        '+44 20 1234 5678',   // UK
        '+91 98765 43210',    // India
        '1234567890',         // Simple
        '(123) 456-7890',     // US formatted
        '+1 (234) 567-8900',  // US with country code
      ]

      for (const phone of validPhones) {
        const result = extractedVendorDocumentSchema.safeParse({
          company_name: 'Test Co.',
          phone,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid phone formats', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const invalidPhones = ['abc123', 'phone', 'not-a-number']

      for (const phone of invalidPhones) {
        const result = extractedVendorDocumentSchema.safeParse({
          company_name: 'Test Co.',
          phone,
        })
        expect(result.success).toBe(false)
      }
    })

    it('should accept empty string for optional phone field', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const result = extractedVendorDocumentSchema.safeParse({
        company_name: 'Test Co.',
        phone: '',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        // Empty string is preserved as-is for optional fields
        expect(result.data.phone).toBe('')
      }
    })

    it('should accept null phone', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const result = extractedVendorDocumentSchema.safeParse({
        company_name: 'Test Co.',
        phone: null,
      })
      expect(result.success).toBe(true)
    })
  })

  describe('Email Validation Edge Cases', () => {
    it('should accept valid email formats', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user@sub.domain.com',
        'test123@test-domain.com',
      ]

      for (const email of validEmails) {
        const result = extractedVendorDocumentSchema.safeParse({
          company_name: 'Test Co.',
          email,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid email formats', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const invalidEmails = [
        'user@',
        '@example.com',
        'user@.com',
        'user',
        'user@',
        '@',
      ]

      for (const email of invalidEmails) {
        const result = extractedVendorDocumentSchema.safeParse({
          company_name: 'Test Co.',
          email,
        })
        expect(result.success).toBe(false)
      }
    })
  })

  describe('URL Validation Edge Cases', () => {
    it('should accept valid URL formats', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const validUrls = [
        'https://example.com',
        'http://example.com',
        'https://example.com/path',
        'https://example.com?page=1',
        'https://sub.domain.example.com/path?query=value',
      ]

      for (const url of validUrls) {
        const result = extractedVendorDocumentSchema.safeParse({
          company_name: 'Test Co.',
          website_url: url,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid URL formats', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const invalidUrls = [
        'example.com',
        'ftp://example.com',
        '//example.com',
      ]

      for (const url of invalidUrls) {
        const result = extractedVendorDocumentSchema.safeParse({
          company_name: 'Test Co.',
          website_url: url,
        })
        expect(result.success).toBe(false)
      }
    })
  })

  describe('Brand Names Transformation', () => {
    it('should transform comma-separated string to array', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const result = extractedVendorDocumentSchema.safeParse({
        company_name: 'Test Co.',
        brand_names: 'Brand1, Brand2, Brand3',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.brand_names).toEqual(['Brand1', 'Brand2', 'Brand3'])
      }
    })

    it('should pass through array input', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const result = extractedVendorDocumentSchema.safeParse({
        company_name: 'Test Co.',
        brand_names: ['Brand1', 'Brand2'],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.brand_names).toEqual(['Brand1', 'Brand2'])
      }
    })

    it('should handle undefined for brand_names (returns empty array)', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      // When brand_names is not provided (undefined)
      const result = extractedVendorDocumentSchema.safeParse({
        company_name: 'Test Co.',
        // brand_names not provided - undefined
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.brand_names).toEqual([])
      }
    })

    it('should return empty array for undefined', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const result = extractedVendorDocumentSchema.safeParse({
        company_name: 'Test Co.',
        brand_names: undefined,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.brand_names).toEqual([])
      }
    })

    it('should filter out empty strings from comma-separated list', async () => {
      const { extractedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const result = extractedVendorDocumentSchema.safeParse({
        company_name: 'Test Co.',
        brand_names: 'Brand1, , Brand3,  ',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.brand_names).toEqual(['Brand1', 'Brand3'])
      }
    })
  })

  describe('Form Schema vs Reviewed Schema Differences', () => {
    it('styleReviewFormSchema: item_code is required', async () => {
      const { styleReviewFormSchema } = await import('./extraction/fabricExtraction.schema.ts')

      const result = styleReviewFormSchema.safeParse({
        item_code: '',
        name: 'Test Style',
      })

      expect(result.success).toBe(false)
    })

    it('styleReviewFormSchema: accepts valid item_code', async () => {
      const { styleReviewFormSchema } = await import('./extraction/fabricExtraction.schema.ts')

      const result = styleReviewFormSchema.safeParse({
        item_code: 'FAB-001',
        name: 'Test Style',
      })

      expect(result.success).toBe(true)
    })

    it('styleReviewFormSchema: rejects missing item_code', async () => {
      const { styleReviewFormSchema } = await import('./extraction/fabricExtraction.schema.ts')

      const result = styleReviewFormSchema.safeParse({
        name: 'Test Style',
      })

      expect(result.success).toBe(false)
    })
    it('vendorReviewFormSchema: all fields optional strings', async () => {
      const { vendorReviewFormSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const result = vendorReviewFormSchema.safeParse({
        company_name: 'Test Co.',
      })

      expect(result.success).toBe(true)
    })

    it('reviewedVendorDocumentSchema: nullable optional fields', async () => {
      const { reviewedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const result = reviewedVendorDocumentSchema.safeParse({
        company_name: 'Test Co.',
      })

      expect(result.success).toBe(true)
    })

    it('reviewedVendorDocumentSchema should accept null values', async () => {
      const { reviewedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const result = reviewedVendorDocumentSchema.safeParse({
        company_name: 'Test Co.',
        booth_number: null,
        contact_person: null,
        email: null,
        phone: null,
        whatsapp: null,
        website_url: null,
        address: null,
        country_of_origin: null,
        brand_names: null,
        notes: null,
      })

      expect(result.success).toBe(true)
    })

    it('reviewedVendorDocumentSchema should accept brand_names array', async () => {
      const { reviewedVendorDocumentSchema } = await import('./extraction/vendorExtraction.schema.ts')

      const result = reviewedVendorDocumentSchema.safeParse({
        company_name: 'Test Co.',
        brand_names: ['Brand1', 'Brand2', 'Brand3'],
      })

      expect(result.success).toBe(true)
    })
  })
})
