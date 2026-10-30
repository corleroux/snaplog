# Utility Functions

This directory contains general-purpose utility functions used throughout the application.

## Structure

```
utils/
├── index.ts         # Barrel export - imports from sub-modules
├── cn.ts            # Class name merging (Tailwind + clsx)
└── format.ts        # Date/time formatting utilities
```

## Usage

Import from the main entry point:

```typescript
import { cn, formatDate, formatDateTime } from '@/lib/utils'
```

## Modules

### `cn` - Class Name Utilities

Merges Tailwind CSS classes with proper precedence handling.

```typescript
import { cn } from '@/lib/utils'

cn('px-4 py-2', isActive && 'bg-blue-500', 'hover:bg-blue-600')
// Result: proper class merging with Tailwind precedence
```

### `format` - Date/Time Formatting

Formats dates and timestamps for display.

```typescript
import { formatDate, formatDateTime } from '@/lib/utils'

formatDate('2024-04-14T10:30:00Z')
// Result: "Apr 14, 2024"

formatDateTime('2024-04-14T10:30:00Z')
// Result: "Apr 14, 2024, 10:30 AM"
```

## Adding New Utilities

1. Create a new file in this directory (e.g., `string.ts`)
2. Export utility functions from that file
3. Add re-export in `index.ts`:

```typescript
// index.ts
export { yourFunction } from './string'
```

4. Update this README with documentation

## Guidelines

- **Pure functions only**: No side effects, no external state
- **TypeScript strict**: Full type safety, no `any`
- **Well-tested**: Add tests for non-trivial utilities
- **Documentation**: JSDoc comments for all exports
- **Single responsibility**: Each file should have a clear purpose

## Related Utilities

Other utility directories in the codebase:

- `src/lib/upload/` - File upload utilities
- `src/lib/offline/` - Offline/sync utilities
- `src/lib/validation/` - Schema validation
- `src/lib/security/` - Security/sanitization
- `src/lib/pdf/` - PDF generation
- `src/lib/export/` - Data export utilities
