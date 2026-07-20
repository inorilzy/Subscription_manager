import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.subscout.app',
  appName: 'SubScout',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
