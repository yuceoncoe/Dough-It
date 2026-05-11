import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.doughit.circleday',
  appName: 'circle day',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
