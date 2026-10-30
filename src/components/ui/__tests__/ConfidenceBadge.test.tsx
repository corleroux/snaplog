/**
 * ConfidenceBadge tests
 *
 * Tests that:
 * - null confidence renders nothing
 * - high confidence (>=0.8) shows green badge with percentage
 * - medium confidence (0.5-0.8) shows amber badge with percentage
 * - low confidence (<0.5) shows red badge with percentage
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConfidenceBadge } from '../ConfidenceBadge'

describe('ConfidenceBadge', () => {
  it('renders nothing when confidence is null', () => {
    const { container } = render(<ConfidenceBadge confidence={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when confidence is undefined', () => {
    const { container } = render(<ConfidenceBadge confidence={undefined as any} />)
    expect(container.innerHTML).toBe('')
  })

  it('shows green badge with "90%" for high confidence', () => {
    render(<ConfidenceBadge confidence={0.9} />)
    const badge = screen.getByText('90%')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-green-100')
    expect(badge.className).toContain('text-green-800')
  })

  it('shows amber badge with "60%" for medium confidence', () => {
    render(<ConfidenceBadge confidence={0.6} />)
    const badge = screen.getByText('60%')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-amber-100')
    expect(badge.className).toContain('text-amber-800')
  })

  it('shows red badge with "30%" for low confidence', () => {
    render(<ConfidenceBadge confidence={0.3} />)
    const badge = screen.getByText('30%')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-red-100')
    expect(badge.className).toContain('text-red-800')
  })

  it('rounds percentage correctly', () => {
    render(<ConfidenceBadge confidence={0.856} />)
    expect(screen.getByText('86%')).toBeInTheDocument()
  })

  it('applies sm size classes by default', () => {
    render(<ConfidenceBadge confidence={0.9} />)
    const badge = screen.getByText('90%')
    expect(badge.className).toContain('text-xs')
  })

  it('applies md size classes when specified', () => {
    render(<ConfidenceBadge confidence={0.9} size="md" />)
    const badge = screen.getByText('90%')
    expect(badge.className).toContain('text-sm')
  })

  it('treats exactly 0.8 as high confidence', () => {
    render(<ConfidenceBadge confidence={0.8} />)
    const badge = screen.getByText('80%')
    expect(badge.className).toContain('bg-green-100')
  })

  it('treats exactly 0.5 as medium confidence', () => {
    render(<ConfidenceBadge confidence={0.5} />)
    const badge = screen.getByText('50%')
    expect(badge.className).toContain('bg-amber-100')
  })

  it('shows 0% for zero confidence', () => {
    render(<ConfidenceBadge confidence={0} />)
    const badge = screen.getByText('0%')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-red-100')
  })
})
