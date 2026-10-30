/**
 * Vitest setup file for Snaplog tests.
 *
 * This file runs before all tests and sets up the testing environment.
 */

import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Extend globalThis with test utilities
declare global {
  var mockDelay: (ms: number) => Promise<void>
}

// Mock Capacitor since it's not available in test environment
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'web',
    isPluginAvailable: () => false,
  },
}))

// Mock Capacitor Filesystem
vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: vi.fn(),
    readFile: vi.fn(),
    deleteFile: vi.fn(),
    mkdir: vi.fn(),
    rmdir: vi.fn(),
  },
}))

// Mock Capacitor Camera
vi.mock('@capacitor/camera', () => ({
  Camera: {
    getPhoto: vi.fn(),
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
  },
  CameraResultType: { Uri: 'uri', Base64: 'base64', DataUrl: 'dataUrl' },
  CameraSource: { Prompt: 'PROMPT', Camera: 'CAMERA', Photos: 'PHOTOS' },
  CameraDirection: { Rear: 'Rear', Front: 'Front' },
}))

// Mock Capacitor Preferences
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  },
}))

// Global test utilities
global.mockDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
