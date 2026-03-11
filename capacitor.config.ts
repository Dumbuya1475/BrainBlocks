import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.brainblocks.app',
  appName: 'BrainBlocks',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      providers: ["google.com"],
    },
  },
};

export default config;