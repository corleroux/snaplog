import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.snaplog.app',
  appName: 'Snaplog',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
