/**
 * Centralized test data factories.
 *
 * Every test that needs entity data must use these factories.
 * Adding a required field to an entity only requires updating
 * the factory, not every test file.
 *
 * Usage:
 *   import { createVendor, createEvent } from '@/test/factories'
 *   const vendor = createVendor({ company_name: 'Custom' })
 */

import type {
  Event,
  Vendor,
  VendorImage,
  FabricStyle,
  FabricVariant,
  FabricImage,
  InventoryRecord,
  PriceHistory,
  ScanSession,
  Draft,
  Profile,
  EventMember,
} from '@/lib/supabase/types'
import type { VendorRecord } from '@/types/vendor'
import type { StyleRecord } from '@/types/style'

// ============================================================================
// Counter for unique IDs
// ============================================================================

let _counter = 0
function nextId(prefix: string): string {
  _counter++
  return `${prefix}-${_counter}`
}

/** Reset ID counter between tests */
export function resetFactoryIds(): void {
  _counter = 0
}

// ============================================================================
// Entity Factories
// ============================================================================

export function createProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: nextId('user'),
    full_name: 'Test User',
    avatar_url: null,
    company_name: null,
    email: 'test@example.com',
    role: 'user',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: nextId('evt'),
    name: 'Test Trade Fair 2026',
    slug: 'test-trade-fair-2026',
    city: 'Mumbai',
    country: 'India',
    venue: 'Bombay Exhibition Centre',
    starts_on: '2026-06-01',
    ends_on: '2026-06-04',
    cover_image_url: null,
    status: 'active',
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createEventMember(overrides: Partial<EventMember> = {}): EventMember {
  return {
    id: nextId('em'),
    event_id: 'evt-1',
    user_id: 'user-1',
    role: 'owner',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createVendor(overrides: Partial<Vendor> = {}): Vendor {
  return {
    id: nextId('v'),
    event_id: 'evt-1',
    company_name: 'Test Fabrics Inc.',
    booth_number: 'A-101',
    country_of_origin: 'India',
    address: null,
    brand_names: [],
    contact_person: null,
    email: null,
    phone: null,
    whatsapp: null,
    website_url: null,
    notes: null,
    source: 'manual',
    status: 'active',
    source_info_image_id: null,
    extracted_at: null,
    extraction_status: null,
    extraction_warnings: [],
    extraction_confidence: null,
    deleted_at: null,
    version: 1,
    created_by: 'user-1',
    updated_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createVendorImage(overrides: Partial<VendorImage> = {}): VendorImage {
  return {
    id: nextId('vi'),
    vendor_id: 'v-1',
    event_id: 'evt-1',
    storage_path: 'scans/vendor-img.jpg',
    public_url: 'https://example.com/vendor-img.jpg',
    image_type: 'gallery',
    is_primary: true,
    display_order: 0,
    caption: null,
    was_source_info_image: false,
    width: null,
    height: null,
    file_size_bytes: null,
    mime_type: null,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createFabricStyle(overrides: Partial<FabricStyle> = {}): FabricStyle {
  return {
    id: nextId('fs'),
    event_id: 'evt-1',
    vendor_id: 'v-1',
    item_code: 'SKU-001',
    name: 'Cotton Twill',
    composition: '100% Cotton',
    category: 'Woven',
    construction: 'Twill',
    finish: null,
    width_cm: 150,
    width_in: 59,
    weight_gsm: 200,
    weight_ozsy: null,
    pattern: 'Solid',
    season: null,
    supplier_ref: null,
    source_info_image_id: null,
    extracted_at: null,
    extraction_status: null,
    extraction_warnings: [],
    extraction_confidence: null,
    is_shortlisted: false,
    deleted_at: null,
    metadata: {},
    source: 'scan',
    status: 'active',
    version: 1,
    created_by: 'user-1',
    updated_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createFabricVariant(overrides: Partial<FabricVariant> = {}): FabricVariant {
  return {
    id: nextId('fv'),
    style_id: 'fs-1',
    event_id: 'evt-1',
    vendor_id: 'v-1',
    color_code: 'BLU-001',
    color_name: 'Navy Blue',
    variant_name: null,
    wash_code: null,
    finish_override: null,
    status: 'active',
    metadata: {},
    deleted_at: null,
    version: 1,
    created_by: 'user-1',
    updated_by: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createFabricImage(overrides: Partial<FabricImage> = {}): FabricImage {
  return {
    id: nextId('fi'),
    style_id: 'fs-1',
    variant_id: null,
    vendor_id: 'v-1',
    event_id: 'evt-1',
    storage_path: 'scans/fabric-img.jpg',
    public_url: 'https://example.com/fabric-img.jpg',
    image_role: 'gallery',
    is_primary: true,
    display_order: 0,
    caption: null,
    was_source_info_image: false,
    width: null,
    height: null,
    file_size_bytes: null,
    mime_type: null,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createInventoryRecord(overrides: Partial<InventoryRecord> = {}): InventoryRecord {
  return {
    id: nextId('ir'),
    variant_id: 'fv-1',
    style_id: 'fs-1',
    event_id: 'evt-1',
    vendor_id: 'v-1',
    quantity: 500,
    unit: 'meters',
    batch_no: null,
    stock_status: 'in_stock',
    captured_at: '2026-01-01T00:00:00Z',
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createPriceHistory(overrides: Partial<PriceHistory> = {}): PriceHistory {
  return {
    id: nextId('ph'),
    style_id: null,
    variant_id: null,
    event_id: 'evt-1',
    vendor_id: 'v-1',
    currency: 'USD',
    price: 3.50,
    price_unit: 'meter',
    minimum_order_quantity: 100,
    minimum_order_unit: 'meters',
    lead_time_value: null,
    lead_time_unit: null,
    notes: null,
    recorded_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createScanSession(overrides: Partial<ScanSession> = {}): ScanSession {
  return {
    id: nextId('ss'),
    event_id: 'evt-1',
    vendor_id: null,
    style_id: null,
    scan_type: 'vendor_card',
    source_image_path: 'scans/card.jpg',
    source_image_url: 'https://example.com/card.jpg',
    extraction_status: 'pending',
    extractor_name: null,
    extractor_model: null,
    extractor_version: null,
    raw_payload: null,
    normalized_payload: null,
    reviewed_payload: null,
    confidence_scores: null,
    reviewed_by: null,
    reviewed_at: null,
    error_message: null,
    created_by: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

export function createDraft(overrides: Partial<Draft> = {}): Draft {
  return {
    id: nextId('draft'),
    event_id: 'evt-1',
    owner_id: 'user-1',
    draft_type: 'vendor',
    status: 'draft',
    payload: {},
    last_error: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ============================================================================
// UI Record Factories (camelCase types for components)
// ============================================================================

export function createVendorRecord(overrides: Partial<VendorRecord> = {}): VendorRecord {
  return {
    id: nextId('vrec'),
    eventId: 'evt-1',
    companyName: 'Test Fabrics Inc.',
    boothNumber: 'A-101',
    contactName: 'Jane Doe',
    email: 'jane@testfabrics.com',
    phone: '+91-9876543210',
    website: 'https://testfabrics.com',
    address: '123 Textile Lane',
    countryOfOrigin: 'India',
    brandNames: 'TestBrand',
    notes: '',
    images: [],
    createdAt: '2026-01-01T00:00:00Z',
    status: 'active',
    version: 1,
    ...overrides,
  }
}

export function createStyleRecord(overrides: Partial<StyleRecord> = {}): StyleRecord {
  return {
    id: nextId('srec'),
    vendorId: 'v-1',
    styleName: 'Cotton Twill',
    composition: '100% Cotton',
    color: 'Navy Blue',
    weight: '200 GSM',
    width: '150 cm',
    price: '$3.50/meter',
    sku: 'SKU-001',
    supplierRef: '',
    notes: '',
    images: [],
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ============================================================================
// Auth / User Factory
// ============================================================================

export interface MockUser {
  id: string
  email: string
  aud: string
  role: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, unknown>
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: nextId('user'),
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: { full_name: 'Test User' },
    ...overrides,
  }
}

export interface MockSession {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  expires_at: number
  user: MockUser
}

export function createMockSession(overrides: Partial<MockSession> = {}): MockSession {
  const user = overrides.user ?? createMockUser()
  return {
    access_token: `mock-access-token-${user.id}`,
    refresh_token: `mock-refresh-token-${user.id}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
    ...overrides,
  }
}

// ============================================================================
// Commit Request Factories
// ============================================================================

export function createCommitVendorRequest(overrides: Record<string, unknown> = {}) {
  return {
    scan_session_id: nextId('ss'),
    event_id: 'evt-1',
    reviewed_document: {
      company_name: 'Test Fabrics Inc.',
      booth_number: 'A-101',
      contact_person: 'Jane Doe',
      email: 'jane@testfabrics.com',
      phone: '+91-9876543210',
      whatsapp: null,
      website_url: null,
      address: null,
      country_of_origin: 'India',
      brand_names: ['TestBrand'],
      notes: null,
    },
    source_image: null,
    ...overrides,
  }
}

export function createCommitFabricRequest(overrides: Record<string, unknown> = {}) {
  return {
    scan_session_id: nextId('ss'),
    event_id: 'evt-1',
    vendor_id: 'v-1',
    reviewed_document: {
      style: {
        item_code: 'SKU-001',
        name: 'Cotton Twill',
        composition: '100% Cotton',
        category: 'Woven',
        construction: 'Twill',
        width_cm: 150,
        weight_gsm: 200,
      },
      variants: [
        {
          color_name: 'Navy Blue',
          color_code: 'BLU-001',
          quantity: 500,
          unit: 'meters',
        },
      ],
      inventory: [],
      prices: [
        {
          variant_index: 0,
          price: {
            currency: 'USD',
            price: 3.50,
            price_unit: 'meter',
            minimum_order_quantity: 100,
          },
        },
      ],
    },
    source_images: null,
    ...overrides,
  }
}
