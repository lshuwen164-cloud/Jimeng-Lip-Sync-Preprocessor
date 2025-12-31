
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PlayIcon, PauseIcon, ScissorsIcon, PlusIcon, XMarkIcon, SparklesIcon, ChevronLeftIcon, ChevronRightIcon, AdjustmentsHorizontalIcon, ArrowDownTrayIcon } from '@heroicons/react/24/solid';
import { AudioAsset, AppConfig } from '../types';

interface SegmentProps {
  id: string;
  index: number;
  url: string;
  blob: Blob;
  start: number;
  end: number;
  parentBuffer: AudioBuffer | null;
  activePlayingId: string | null;
  onTogglePlay: (id: string) => void;
}

const AudioSegmentPreview: React.FC<SegmentProps> = ({ id, index, url, start, end, parentBuffer, activePlayingId, onTogglePlay }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = end - start;
  const isCurrentlyPlaying = activePlayingId === id;

  useEffect(() => {
    if (!canvasRef.current || !parentBuffer) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = parentBuffer.getChannelData(0);
    const sampleRate = parentBuffer.sampleRate;
    const startIdx = Math.floor(start * sampleRate);
    const endIdx = Math.floor(end * sampleRate);
    const segmentData = data.subarray(startIdx, endIdx);

    const width = canvas.width;
    const height = canvas.height;
    const step = Math.ceil(segmentData.length / width);
    const amp = height / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1;

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = segmentData[i * step + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.moveTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();
  }, [parentBuffer, start, end]);

  useEffect(() => {
    if (audioRef.current) {
      if (isCurrentlyPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isCurrentlyPlaying]);

  const handleSeek = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / rect.width) * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  return (
    <div className={`flex items-center gap-3 p-2 px-3 bg-white rounded-xl border transition-all ${isCurrentlyPlaying ? 'border-indigo-400 shadow-md ring-1 ring-indigo-100' : 'border-slate-100 shadow-sm'}`}>
      {/* Index Badge */}
      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${isCurrentlyPlaying ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
        {index + 1}
      </div>

      {/* Play/Pause Button */}
      <button 
        onClick={() => onTogglePlay(id)}
        className={`shrink-0 p-1.5 rounded-full transition-all active:scale-90 ${isCurrentlyPlaying ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
      >
        {isCurrentlyPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
      </button>

      {/* Waveform Visualization */}
      <div 
        className="relative flex-1 h-8 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 cursor-pointer group"
        onClick={handleSeek}
      >
        <canvas ref={canvasRef} width={300} height={32} className="w-full h-full opacity-60" />
        {/* Progress Bar Overlay */}
        <div 
          className="absolute top-0 left-0 bottom-0 bg-indigo-500/15 border-r border-indigo-500 transition-none pointer-events-none"
          style={{ width: `${(currentTime / duration) * 100}%` }}
        />
        {/* Playhead Marker */}
        <div className="absolute inset-y-0 opacity-0 group-hover:opacity-100 w-px bg-indigo-400 pointer-events-none" />
      </div>

      {/* Timer Display */}
      <div className="shrink-0 flex flex-col items-end min-w-[60px]">
        <span className="text-[10px] font-mono font-black text-slate-700 leading-none">
          {currentTime.toFixed(1)}s
        </span>
        <span className="text-[8px] text-slate-400 font-mono">
          / {duration.toFixed(1)}s
        </span>
      </div>

      {/* Download Button */}
      <a 
        href={url} 
        download={`Jimeng_Part_${index+1}.wav`} 
        className="shrink-0 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
        title="Download Segment"
        onClick={e => e.stopPropagation()}
      >
        <ArrowDownTrayIcon className="w-4 h-4" />
      </a>

      <audio 
        ref={audioRef} 
        src={url} 
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} 
        onEnded={() => onTogglePlay('')} // Stop global playing state
        className="hidden" 
      />
    </div>
  );
};

interface Props {
  asset: AudioAsset;
  config: AppConfig;
  onUpdate: (updated: AudioAsset) => void;
  onUpdateConfig: (updated: Partial<AppConfig>) => void;
}

const AudioProcessor: React.FC<Props> = ({ asset, config, onUpdate, onUpdateConfig }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !asset.buffer) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buffer = asset.buffer.getChannelData(0);
    const width = canvas.width;
    const height = canvas.height;
    const step = Math.ceil(buffer.length / width);
    const amp = height / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1;

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = buffer[i * step + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.moveTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();
  }, [asset.buffer]);

  // Exclusive playback handler
  const handleTogglePlay = (id: string) => {
    if (activePlayingId === id) {
      // Toggle pause if it's already active
      setActivePlayingId(null);
    } else {
      // When switching to a new audio, start from beginning if it's the first time
      // The individual audio elements handle their own current time once they mount,
      // but the 'original' one is managed here.
      if (id === 'original' && audioRef.current) {
        // If we switch to original, we can choose to start from head or stay
        // Requirement says default start from head on switch.
      }
      setActivePlayingId(id);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
      if (activePlayingId === 'original') {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [activePlayingId]);

  const addSplitPoint = (time?: number) => {
    const t = Math.max(0, Math.min(asset.duration, time ?? currentTime));
    if (asset.splitPoints.includes(t)) return;
    const updatedPoints = [...asset.splitPoints, t].sort((a, b) => a - b);
    onUpdate({ ...asset, splitPoints: updatedPoints });
  };

  const removeSplitPoint = (point: number) => {
    onUpdate({ ...asset, splitPoints: asset.splitPoints.filter(p => p !== point) });
  };

  const autoDetectSplits = () => {
    if (!asset.buffer) return;
    const buffer = asset.buffer.getChannelData(0);
    const sampleRate = asset.buffer.sampleRate;
    const totalDuration = asset.duration;
    const maxDur = config.maxSegmentDuration;
    const searchWindow = Math.min(5, maxDur / 2);
    
    const newSplits: number[] = [];
    let currentPos = 0;

    while (currentPos + maxDur < totalDuration) {
      let minEnergy = Infinity;
      let bestTime = currentPos + maxDur;
      const searchStartSec = Math.max(currentPos + 1, currentPos + maxDur - searchWindow);
      const searchEndSec = currentPos + maxDur;
      const startSample = Math.floor(searchStartSec * sampleRate);
      const endSample = Math.floor(searchEndSec * sampleRate);
      const chunkSize = Math.floor(0.1 * sampleRate); 
      for (let s = startSample; s < endSample; s += chunkSize) {
        if (s + chunkSize > buffer.length) break;
        let energy = 0;
        for (let i = 0; i < chunkSize; i++) energy += Math.abs(buffer[s + i]);
        if (energy < minEnergy) {
          minEnergy = energy;
          bestTime = s / sampleRate;
        }
      }
      newSplits.push(bestTime);
      currentPos = bestTime;
    }
    onUpdate({ ...asset, splitPoints: newSplits, segments: [] });
  };

  const generateSegments = async () => {
    setIsProcessing(true);
    setActivePlayingId(null); // Stop playback during processing
    const points = [0, ...asset.splitPoints, asset.duration];
    const newSegments = [];
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      if (end - start < 0.1) continue; 
      const segmentBlob = await sliceAudio(asset.buffer!, start, end);
      newSegments.push({
        id: crypto.randomUUID(),
        start,
        end,
        blob: segmentBlob,
        url: URL.createObjectURL(segmentBlob)
      });
    }
    onUpdate({ ...asset, segments: newSegments });
    setIsProcessing(false);
  };

  const sliceAudio = async (buffer: AudioBuffer, start: number, end: number): Promise<Blob> => {
    const duration = end - start;
    const sampleRate = buffer.sampleRate;
    const frameCount = Math.floor(duration * sampleRate);
    const newBuffer = new AudioContext().createBuffer(buffer.numberOfChannels, frameCount, sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      const newChannelData = newBuffer.getChannelData(channel);
      const offset = Math.floor(start * sampleRate);
      for (let i = 0; i < frameCount; i++) {
        if (offset + i < channelData.length) newChannelData[i] = channelData[offset + i];
      }
    }
    return bufferToWav(newBuffer);
  };

  const bufferToWav = (abuffer: AudioBuffer) => {
    const numOfChan = abuffer.numberOfChannels;
    const length = abuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    let channels = [], i, sample, offset = 0, pos = 0;
    const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };
    const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164);
    setUint32(length - pos - 4);
    for(i = 0; i < numOfChan; i++) channels.push(abuffer.getChannelData(i));
    while(pos < length) {
      for(i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0;
        view.setInt16(pos, sample, true); pos += 2;
      }
      offset++;
    }
    return new Blob([buffer], { type: "audio/wav" });
  };

  const downloadAllSegments = async () => {
    // @ts-ignore
    const zip = new JSZip();
    asset.segments.forEach((seg, i) => {
      zip.file(`Jimeng_Segment_${i + 1}_${Math.round(seg.end - seg.start)}s.wav`, seg.blob);
    });
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Jimeng_Audio_Segments_${new Date().getTime()}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg">
              <MusicalNoteIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm truncate max-w-[120px]">{asset.name}</p>
              <p className="text-[10px] text-slate-500 font-mono">{(asset.duration).toFixed(2)}s</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200 hover:text-indigo-600'}`}
              title="Split Settings"
            >
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
            </button>
            <button 
              onClick={autoDetectSplits}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <SparklesIcon className="w-3.5 h-3.5" />
              Smart Auto-Split
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="mb-4 p-3 bg-white border border-indigo-100 rounded-xl animate-in slide-in-from-top-2">
            <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Max Segment Duration (sec)</label>
            <div className="flex items-center gap-4">
              <input 
                type="range" min="5" max="30" step="1"
                value={config.maxSegmentDuration}
                onChange={(e) => onUpdateConfig({ maxSegmentDuration: parseInt(e.target.value) })}
                className="flex-1 accent-indigo-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-sm font-black text-indigo-600 w-8 text-right">{config.maxSegmentDuration}s</span>
            </div>
          </div>
        )}

        <div className="relative h-28 bg-white rounded-xl overflow-hidden border border-slate-200 shadow-inner group">
          <canvas 
            ref={canvasRef} width={800} height={112} 
            className="w-full h-full cursor-crosshair"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const newTime = (x / rect.width) * asset.duration;
              if (audioRef.current) {
                audioRef.current.currentTime = newTime;
              }
            }}
          />
          <div 
            className="absolute top-0 left-0 bottom-0 bg-indigo-500/10 border-r-2 border-indigo-500 transition-all pointer-events-none"
            style={{ width: `${(currentTime / asset.duration) * 100}%` }}
          />
          {asset.splitPoints.map(p => (
            <div 
              key={p}
              className="absolute top-0 bottom-0 w-1 bg-rose-500/80 group/marker"
              style={{ left: `${(p / asset.duration) * 100}%`, transform: 'translateX(-50%)' }}
            >
              <div className="hidden group-hover/marker:flex absolute -top-1 -left-10 bg-rose-600 text-white text-[9px] px-2 py-0.5 rounded shadow-lg items-center gap-1 z-10">
                 {p.toFixed(2)}s <button onClick={(e) => { e.stopPropagation(); removeSplitPoint(p); }} className="font-bold ml-1">×</button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleTogglePlay('original')}
              className={`p-2.5 rounded-full transition-all active:scale-90 ${activePlayingId === 'original' ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
            >
              {activePlayingId === 'original' ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-slate-700">{currentTime.toFixed(2)}s</span>
              <span className="text-[10px] text-slate-400 font-mono">/ {asset.duration.toFixed(2)}s</span>
            </div>
          </div>
          <button 
            onClick={() => addSplitPoint()}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-100 transition-all active:scale-95"
          >
            <ScissorsIcon className="w-4 h-4" />
            Manual Split
          </button>
        </div>
      </div>

      <audio 
        ref={audioRef} src={asset.url} 
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setActivePlayingId(null)} className="hidden" 
      />

      <div className="flex flex-col gap-3">
        <button 
          onClick={generateSegments} disabled={isProcessing}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Slicing...
            </div>
          ) : (
            <>
              <ScissorsIcon className="w-5 h-5" />
              Process Fragments
            </>
          )}
        </button>

        {asset.segments.length > 0 && (
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fragments ({asset.segments.length})</p>
              {/* Prominent Batch Download Button */}
              <button 
                onClick={downloadAllSegments}
                className="group relative flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all active:scale-95"
              >
                <div className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </div>
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                Download Batch (ZIP)
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto custom-scrollbar pr-2 pb-4">
              {asset.segments.map((seg, i) => (
                <AudioSegmentPreview 
                  key={seg.id} index={i} id={seg.id} 
                  url={seg.url} blob={seg.blob} 
                  start={seg.start} end={seg.end} 
                  parentBuffer={asset.buffer} 
                  activePlayingId={activePlayingId}
                  onTogglePlay={handleTogglePlay}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// SVG components
const MusicalNoteIcon = ({ className }: { className?: string }) => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l1.246-.356A.75.75 0 0018 12.2V7.5m-9 2.25v9a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l1.246-.356A.75.75 0 009 18.2V9.75z" />
  </svg>
);

export default AudioProcessor;
