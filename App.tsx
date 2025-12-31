
import React, { useState, useCallback, useEffect } from 'react';
import { 
  CloudArrowUpIcon, 
  ScissorsIcon, 
  PhotoIcon, 
  PlayIcon, 
  ArrowDownTrayIcon,
  TrashIcon,
  MusicalNoteIcon,
  VideoCameraIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChevronRightIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';
import { AppState, ProcessingStatus, AudioAsset, VideoAsset, AppConfig } from './types';
import FileUploader from './components/FileUploader';
import AudioProcessor from './components/AudioProcessor';
import VideoProcessor from './components/VideoProcessor';
import StatusBadge from './components/StatusBadge';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    audio: null,
    video: null,
    status: ProcessingStatus.IDLE,
    progress: 0,
    error: null,
    config: {
      maxSegmentDuration: 30 // Default Jimeng limit
    }
  });

  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (state.audio || state.video) setCurrentStep(2);
    if ((state.audio && state.audio.segments.length > 0) || (state.video && state.video.lastFrame)) setCurrentStep(3);
  }, [state.audio, state.video]);

  const handleAudioUpload = async (file: File) => {
    setState(prev => ({ ...prev, status: ProcessingStatus.PROCESSING, progress: 10, error: null }));
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      const audioAsset: AudioAsset = {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        duration: audioBuffer.duration,
        url: URL.createObjectURL(file),
        buffer: audioBuffer,
        splitPoints: [],
        segments: []
      };

      setState(prev => ({ 
        ...prev, 
        audio: audioAsset, 
        status: ProcessingStatus.COMPLETED,
        progress: 100 
      }));
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        status: ProcessingStatus.ERROR, 
        error: "Failed to process audio file." 
      }));
    }
  };

  const handleVideoUpload = async (file: File) => {
    setState(prev => ({ ...prev, status: ProcessingStatus.PROCESSING, progress: 10, error: null }));
    const videoAsset: VideoAsset = {
      id: crypto.randomUUID(),
      file,
      name: file.name,
      duration: 0,
      url: URL.createObjectURL(file),
      lastFrame: null
    };
    setState(prev => ({ 
      ...prev, 
      video: videoAsset, 
      status: ProcessingStatus.COMPLETED,
      progress: 100 
    }));
  };

  const clearAudio = () => setState(prev => ({ ...prev, audio: null }));
  const clearVideo = () => setState(prev => ({ ...prev, video: null }));

  const updateConfig = (newConfig: Partial<AppConfig>) => {
    setState(prev => ({ ...prev, config: { ...prev.config, ...newConfig } }));
  };

  const steps = [
    { id: 1, name: 'Upload Assets' },
    { id: 2, name: 'Processing' },
    { id: 3, name: 'Preview & Verify' },
    { id: 4, name: 'Ready to Import' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-8">
      {/* Header Section */}
      <header className="w-full max-w-6xl mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-2xl shadow-lg shadow-indigo-200">
                 <MusicalNoteIcon className="w-8 h-8 text-white" />
              </div>
              Jimeng Preprocessor
            </h1>
            <p className="text-slate-500 font-medium mt-2">Professional toolkit for Jimeng AI lip-sync optimization</p>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status={state.status} />
          </div>
        </div>

        {/* Stepper */}
        <nav aria-label="Progress" className="hidden md:block">
          <ol role="list" className="flex items-center">
            {steps.map((step, stepIdx) => (
              <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                <div className="flex items-center" aria-hidden="true">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${currentStep >= step.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-200 text-slate-500'}`}>
                    {step.id}
                  </div>
                  {stepIdx !== steps.length - 1 && (
                    <div className={`ml-4 h-0.5 w-16 sm:w-24 transition-colors ${currentStep > step.id ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                  )}
                </div>
                <div className="mt-2 text-xs font-bold text-slate-500 absolute whitespace-nowrap">
                   {step.name}
                </div>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      {/* Grid Content */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
        
        {/* Audio Module */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-indigo-500 rounded-full" />
                <h2 className="text-2xl font-black text-slate-800">Audio Segmenter</h2>
              </div>
              {state.audio && (
                <button onClick={clearAudio} className="text-slate-300 hover:text-rose-500 transition-colors p-2">
                  <TrashIcon className="w-6 h-6" />
                </button>
              )}
            </div>
            
            {!state.audio ? (
              <FileUploader 
                onUpload={handleAudioUpload} 
                accept=".mp3,.wav" 
                label="Import Audio" 
                description="MP3/WAV recommended for smart slicing"
              />
            ) : (
              <AudioProcessor 
                asset={state.audio} 
                config={state.config}
                onUpdateConfig={updateConfig}
                onUpdate={(updated) => setState(prev => ({ ...prev, audio: updated }))} 
              />
            )}
          </div>
        </div>

        {/* Video Module */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-teal-500 rounded-full" />
                <h2 className="text-2xl font-black text-slate-800">Video Processor</h2>
              </div>
              {state.video && (
                <button onClick={clearVideo} className="text-slate-300 hover:text-rose-500 transition-colors p-2">
                  <TrashIcon className="w-6 h-6" />
                </button>
              )}
            </div>

            {!state.video ? (
              <FileUploader 
                onUpload={handleVideoUpload} 
                accept=".mp4" 
                label="Import Video" 
                description="MP4 for reference frame extraction"
              />
            ) : (
              <VideoProcessor 
                asset={state.video} 
                onUpdate={(updated) => setState(prev => ({ ...prev, video: updated }))}
              />
            )}
          </div>
        </div>
      </main>

      {/* Floating Error Bar */}
      {state.error && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5">
           <div className="bg-rose-600 text-white px-8 py-4 rounded-3xl flex items-center gap-4 shadow-2xl">
              <ExclamationCircleIcon className="w-6 h-6" />
              <span className="font-bold">{state.error}</span>
              <button onClick={() => setState(prev => ({ ...prev, error: null }))} className="bg-white/20 hover:bg-white/30 p-1 rounded-lg">
                <XMarkIcon className="w-4 h-4" />
              </button>
           </div>
        </div>
      )}

      {/* Footer Branding */}
      <footer className="w-full max-w-6xl flex flex-col items-center pt-10 border-t border-slate-200/60 pb-12">
        <div className="flex items-center gap-8 mb-6">
           <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" alt="Google" className="h-5 opacity-40" />
           <div className="h-4 w-[1px] bg-slate-200" />
           <p className="text-slate-400 font-bold text-sm">Powered by Gemini AI 2.5</p>
        </div>
        <p className="text-slate-400 text-xs font-medium">© 2024 Jimeng Creator Lab • Secure Client-Side Processing</p>
      </footer>
    </div>
  );
};

// Simplified Icons
const XMarkIcon = ({ className }: { className?: string }) => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default App;
