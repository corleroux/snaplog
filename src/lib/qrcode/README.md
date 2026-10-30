# QR Code Library

Generates QR codes for sharing links.

## Usage

```typescript
import { generateQRCode, downloadQRCode } from '@/lib/qrcode'

// Generate QR code as data URL
const qrDataUrl = await generateQRCode('https://example.com')

// Download QR code as PNG
downloadQRCode(qrDataUrl, 'vendor-qr')
```

## Options

- `width`: QR code size in pixels (default: 256)
- `margin`: White space margin (default: 2)
- `color.dark`: Dark color hex (default: #000000)
- `color.light`: Light color hex (default: #FFFFFF)
