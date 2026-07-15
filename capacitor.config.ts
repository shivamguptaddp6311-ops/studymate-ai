import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studymate.app',
  appName: 'StudyMate AI',
  webDir: 'dist',
  server: {
    url: 'https://ais-dev-7trcurr3ybqbdmvjkvx3x7-634393143987.asia-southeast1.run.app',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
