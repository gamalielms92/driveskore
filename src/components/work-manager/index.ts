import { NativeModulesProxy } from 'expo-modules-core';

const WorkManagerModule = NativeModulesProxy.WorkManager;

export interface LocationData {
  userId: string;
  plate: string;
  sessionId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  heading: number;
  timestamp: string;
  supabaseUrl: string;
  accessToken: string;
  anonKey: string;
}

export function scheduleLocationSync(data: LocationData): Promise<string> {
  return WorkManagerModule.scheduleLocationSync(data);
}

export function cancelAllWork(): Promise<void> {
  return WorkManagerModule.cancelAllWork();
}