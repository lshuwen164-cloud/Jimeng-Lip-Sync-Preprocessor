
export enum ProcessingStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface AudioAsset {
  id: string;
  file: File;
  name: string;
  duration: number;
  url: string;
  buffer: AudioBuffer | null;
  splitPoints: number[];
  segments: {
    id: string;
    start: number;
    end: number;
    url: string;
    blob: Blob;
  }[];
}

export interface VideoAsset {
  id: string;
  file: File;
  name: string;
  duration: number;
  url: string;
  lastFrame: {
    url: string;
    blob: Blob;
    timestamp: number;
  } | null;
}

export interface AppConfig {
  maxSegmentDuration: number;
}

export interface AppState {
  audio: AudioAsset | null;
  video: VideoAsset | null;
  status: ProcessingStatus;
  progress: number;
  error: string | null;
  config: AppConfig;
}
