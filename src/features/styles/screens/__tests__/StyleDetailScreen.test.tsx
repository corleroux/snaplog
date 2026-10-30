/**
 * StyleDetailScreen render tests
 *
 * Tests loading, error, populated, and empty states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StyleDetailScreen } from '../StyleDetailScreen'
import { ToastProvider } from '@/components/ui/toast'
import {
  createFabricStyle,
  createFabricVariant,
  createPriceHistory,
  resetFactoryIds,
} from '@/test/factories'
import type { FabricStyleDetail } from '@/lib/supabase/types'

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <ToastProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </ToastProvider>
  )
}

function createMockDetail(overrides: Partial<FabricStyleDetail> = {}): FabricStyleDetail {
  return {
    style: createFabricStyle(),
    variants: [],
    inventory: [],
    prices: [],
    images: [],
    ...overrides,
  }
}

describe('StyleDetailScreen', () => {
  const mockOnBack = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    resetFactoryIds()
  })

  it('shows loading state', () => {
    renderWithRouter(
      <StyleDetailScreen loading={true} onBack={mockOnBack} />
    )

    expect(screen.getByText('Loading style details...')).toBeInTheDocument()
  })

  it('shows error state with retry button when error provided', () => {
    const mockRefresh = vi.fn()

    renderWithRouter(
      <StyleDetailScreen error="Network error" onBack={mockOnBack} onRefresh={mockRefresh} />
    )

    expect(screen.getByText('Failed to load style')).toBeInTheDocument()
    expect(screen.getByText('Network error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('shows error state when no data and no error', () => {
    renderWithRouter(
      <StyleDetailScreen onBack={mockOnBack} />
    )

    expect(screen.getByText('Failed to load style')).toBeInTheDocument()
  })

  it('renders style name and item code', () => {
    const detail = createMockDetail({
      style: createFabricStyle({ name: 'Cotton Twill', item_code: 'FAB-001' }),
    })

    renderWithRouter(
      <StyleDetailScreen data={detail} onBack={mockOnBack} />
    )

    expect(screen.getByText('Cotton Twill')).toBeInTheDocument()
    expect(screen.getByText('FAB-001')).toBeInTheDocument()
  })

  it('renders "Untitled Style" when name is null', () => {
    const detail = createMockDetail({
      style: createFabricStyle({ name: null }),
    })

    renderWithRouter(
      <StyleDetailScreen data={detail} onBack={mockOnBack} />
    )

    expect(screen.getByText('Untitled Style')).toBeInTheDocument()
  })

  it('renders variants section when variants present', () => {
    const detail = createMockDetail({
      style: createFabricStyle({ name: 'Test Style' }),
      variants: [
        createFabricVariant({ color_name: 'Navy', color_code: 'NV001' }),
      ],
    })

    renderWithRouter(
      <StyleDetailScreen data={detail} onBack={mockOnBack} />
    )

    expect(screen.getByText('Variants (1)')).toBeInTheDocument()
    expect(screen.getByText(/Color: Navy/)).toBeInTheDocument()
  })

  it('renders prices with yard-to-meter conversion', () => {
    const detail = createMockDetail({
      style: createFabricStyle({ name: 'Test Style' }),
      prices: [
        createPriceHistory({
          currency: 'USD',
          price: 10,
          price_unit: 'yard',
        }),
      ],
    })

    renderWithRouter(
      <StyleDetailScreen data={detail} onBack={mockOnBack} />
    )

    // 10 USD/yard → 10/0.9144 ≈ 10.94 USD/meter
    expect(screen.getByText(/USD.*10\.94.*meter/)).toBeInTheDocument()
  })

  it('renders empty variants section with add button when no variants', () => {
    const detail = createMockDetail({
      style: createFabricStyle({ name: 'Test Style' }),
      variants: [],
    })

    renderWithRouter(
      <StyleDetailScreen data={detail} onBack={mockOnBack} />
    )

    expect(screen.getByText('Variants')).toBeInTheDocument()
    expect(screen.getByText('Add Variant')).toBeInTheDocument()
  })
})
