import { NativeModules } from 'react-native';

interface WorkManagerInterface {
  scheduleLocationSync(data: {
    supabaseUrl: string;
    accessToken: string;
    anonKey: string;
    userId: string;
    plate: string;
    sessionId: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number;
    heading: number;
    timestamp: string;
  }): Promise<string>;
  
  cancelAllWork(): Promise<void>;
}

const WorkManager = NativeModules.WorkManager as WorkManagerInterface;

if (!WorkManager) {
  console.warn('⚠️ WorkManager module not found. Background sync may not work properly.');
}

export default WorkManager;