/**
 * Mobile Helpers
 *
 * Helper functions for mobile-specific E2E test operations:
 * - Gesture simulation (swipe, pinch, scroll)
 * - Pull-to-refresh
 * - Touch target verification
 * - Safe area verification
 */

import { type Page, type Locator } from '@playwright/test'

/**
 * Swipe gesture on an element
 * @param element - The element to swipe on
 * @param direction - Direction to swipe ('left', 'right', 'up', 'down')
 * @param distance - Distance in pixels (default: 300)
 * @param speed - Number of steps for the gesture (default: 10, lower = faster)
 */
export async function swipe(
  page: Page,
  element: Locator,
  direction: 'left' | 'right' | 'up' | 'down',
  distance = 300,
  speed = 10
) {
  const box = await element.boundingBox()
  if (!box) {
    throw new Error('Cannot swipe: element has no bounding box')
  }

  const startX = box.x + box.width / 2
  const startY = box.y + box.height / 2

  let endX = startX
  let endY = startY

  switch (direction) {
    case 'left':
      endX = startX - distance
      break
    case 'right':
      endX = startX + distance
      break
    case 'up':
      endY = startY - distance
      break
    case 'down':
      endY = startY + distance
      break
  }

  // Perform the swipe
  await page.touchscreen.tap(startX, startY)
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(endX, endY, { steps: speed })
  await page.mouse.up()

  // Wait for animation to complete
  await page.waitForTimeout(500)
}

/**
 * Pull-to-refresh gesture on a list or scrollable area
 * @param element - The scrollable element
 * @param distance - Distance to pull down in pixels (default: 200)
 */
export async function pullToRefresh(page: Page, element: Locator, distance = 200) {
  const box = await element.boundingBox()
  if (!box) {
    throw new Error('Cannot pull-to-refresh: element has no bounding box')
  }

  const startX = box.x + box.width / 2
  const startY = box.y + 50 // Start near the top
  const endY = startY + distance

  // Perform the pull gesture
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX, endY, { steps: 15 })
  await page.mouse.up()

  // Wait for refresh to complete
  await page.waitForTimeout(1000)
}

/**
 * Long press gesture on an element
 * @param element - The element to long press
 * @param duration - Duration in milliseconds (default: 500)
 */
export async function longPress(page: Page, element: Locator, duration = 500) {
  const box = await element.boundingBox()
  if (!box) {
    throw new Error('Cannot long press: element has no bounding box')
  }

  const x = box.x + box.width / 2
  const y = box.y + box.height / 2

  await page.touchscreen.tap(x, y)
  await page.mouse.down()
  await page.waitForTimeout(duration)
  await page.mouse.up()
}

/**
 * Pinch to zoom gesture
 * @param element - The element to zoom
 * @param scale - Scale factor (>1 to zoom in, <1 to zoom out)
 */
export async function pinchZoom(page: Page, element: Locator, scale: number) {
  const box = await element.boundingBox()
  if (!box) {
    throw new Error('Cannot pinch: element has no bounding box')
  }

  const centerX = box.x + box.width / 2
  const centerY = box.y + box.height / 2
  const initialDistance = 50
  const finalDistance = initialDistance * scale

  // Start with two points close together
  const x1 = centerX - initialDistance / 2
  const x2 = centerX + initialDistance / 2

  // Move points apart or together
  const x1End = centerX - finalDistance / 2
  const x2End = centerX + finalDistance / 2

  // First finger
  await page.mouse.move(x1, centerY)
  await page.mouse.down()

  // Second finger (simulated)
  await page.mouse.move(x2, centerY)

  // Move fingers apart/together
  await page.mouse.move(x1End, centerY, { steps: 10 })
  await page.mouse.move(x2End, centerY, { steps: 10 })

  await page.mouse.up()

  await page.waitForTimeout(500)
}

/**
 * Scroll an element to bring a child into view
 * @param element - The scrollable element
 * @param target - The target element to scroll into view
 */
export async function scrollIntoView(page: Page, element: Locator, target: Locator) {
  const box = await element.boundingBox()
  const targetBox = await target.boundingBox()

  if (!box || !targetBox) {
    throw new Error('Cannot scroll: elements have no bounding box')
  }

  const scrollDistance = targetBox.y - box.y - box.height / 2

  if (scrollDistance > 0) {
    await element.evaluate((el, distance) => {
      el.scrollTop = distance
    }, scrollDistance)
  }

  await page.waitForTimeout(300)
}

/**
 * Verify a touch target meets minimum size (44x44px per iOS guidelines)
 * @param element - The element to check
 * @returns - true if element meets minimum size
 */
export async function verifyTouchTargetSize(element: Locator): Promise<boolean> {
  const box = await element.boundingBox()
  if (!box) {
    return false
  }

  const MIN_SIZE = 44
  return box.width >= MIN_SIZE && box.height >= MIN_SIZE
}

/**
 * Get all touch targets on page that are too small
 * @param minSize - Minimum size in pixels (default: 44)
 */
export async function getUndersizedTouchTargets(page: Page, minSize = 44): Promise<Locator[]> {
  const allButtons = page.getByRole('button')
  const allLinks = page.getByRole('link')
  const inputs = page.getByRole('textbox').or(page.getByRole('searchbox'))

  const undersized: Locator[] = []

  for (const element of [allButtons, allLinks, inputs]) {
    const count = await element.count()
    for (let i = 0; i < count; i++) {
      const item = element.nth(i)
      const isSized = await verifyTouchTargetSize(item)
      if (!isSized) {
        undersized.push(item)
      }
    }
  }

  return undersized
}

/**
 * Check if safe area is being respected (no content under notch)
 * This checks that the main content is pushed down from the top
 */
export async function verifySafeAreaTop(page: Page): Promise<boolean> {
  // Check for safe-area-top CSS class or padding-top on main container
  const mainContainer = page.locator('main, .app-container, [data-testid="app-container"]').first()

  const paddingTop = await mainContainer.evaluate((el) => {
    return window.getComputedStyle(el).paddingTop
  })

  // Should have some padding (safe area)
  const paddingValue = parseInt(paddingTop, 10)
  return paddingValue >= 10 // At least 10px padding
}

/**
 * Check if safe area is being respected at bottom (home indicator)
 */
export async function verifySafeAreaBottom(page: Page): Promise<boolean> {
  const mainContainer = page.locator('main, .app-container, [data-testid="app-container"]').first()

  const paddingBottom = await mainContainer.evaluate((el) => {
    return window.getComputedStyle(el).paddingBottom
  })

  const paddingValue = parseInt(paddingBottom, 10)
  return paddingValue >= 10 // At least 10px padding
}

/**
 * Get viewport size
 */
export async function getViewportSize(page: Page): Promise<{ width: number; height: number }> {
  const viewportSize = await page.viewportSize()
  return {
    width: viewportSize?.width || 0,
    height: viewportSize?.height || 0,
  }
}

/**
 * Set device orientation
 */
export async function setOrientation(page: Page, orientation: 'portrait' | 'landscape') {
  const viewportSize = await page.viewportSize()
  if (!viewportSize) {
    return
  }

  if (orientation === 'portrait') {
    const width = Math.min(viewportSize.width, viewportSize.height)
    const height = Math.max(viewportSize.width, viewportSize.height)
    await page.setViewportSize({ width, height })
  } else {
    const width = Math.max(viewportSize.width, viewportSize.height)
    const height = Math.min(viewportSize.width, viewportSize.height)
    await page.setViewportSize({ width, height })
  }
}

/**
 * Simulate device notches by checking if content is properly inset
 */
export async function verifyNotchClearance(page: Page): Promise<boolean> {
  // Check that no interactive elements are at the very top
  const topElements = page.locator('button, link, [role="button"]').filter({ hasNot: text => text.filter({ hasText: /^$/ }) })

  const count = await topElements.count()
  for (let i = 0; i < Math.min(count, 5); i++) {
    const element = topElements.nth(i)
    const box = await element.boundingBox()
    if (box && box.y < 20) {
      // Element too close to top (might be under notch)
      return false
    }
  }

  return true
}
