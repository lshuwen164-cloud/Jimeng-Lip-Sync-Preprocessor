
import React, { useRef, useState, useEffect } from 'react';
import { VideoAsset } from '../types';
import { ArrowPathIcon, PhotoIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface Props {
  asset: VideoAsset;
  onUpdate: (updated: VideoAsset) => void;
}

const VideoProcessor: React.FC<Props> = ({ asset, onUpdate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [previewFrame, setPreviewFrame] = useState<string | null>(null);

  const extractLastFrame = async () => {
    if (!videoRef.current) return;
    setIsExtracting(true);
    const video = videoRef.current;
    
    // Seek to near the end
    const duration = video.duration;
    let seekTime = duration - 0.05; // Start very close to end
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Detection loop for non-black frame
    const findGoodFrame = async (time: number): Promise<{blob: Blob, url: string, time: number} | null> => {
      return new Promise((resolve) => {
        video.currentTime = time;
        video.onseeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          
          // Basic black frame detection (average brightness)
          let totalBrightness = 0;
          for (let i = 0; i < imageData.length; i += 4) {
            totalBrightness += (imageData[i] + imageData[i+1] + imageData[i+2]) / 3;
          }
          const avgBrightness = totalBrightness / (imageData.length / 4);

          // If too dark (threshold 10) and not at start of video, back up and try again
          if (avgBrightness < 10 && time > 0.5) {
            findGoodFrame(time - 0.1).then(resolve);
          } else {
            canvas.toBlob((blob) => {
              if (blob) {
                resolve({ blob, url: URL.createObjectURL(blob), time });
              } else {
                resolve(null);
              }
            }, 'image/png');
          }
        };
      });
    };

    const result = await findGoodFrame(seekTime);
    if (result) {
      setPreviewFrame(result.url);
      onUpdate({
        ...asset,
        duration,
        lastFrame: {
          blob: result.blob,
          url: result.url,
          timestamp: result.time
        }
      });
    }
    setIsExtracting(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <video 
          ref={videoRef}
          src={asset.url}
          className="w-full rounded-xl border border-slate-200 mb-4 aspect-video bg-black"
          controls
          onLoadedMetadata={() => onUpdate({ ...asset, duration: videoRef.current?.duration || 0 })}
        />
        
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800 text-sm truncate max-w-[200px]">{asset.name}</p>
            <p className="text-xs text-slate-500">{asset.duration.toFixed(1)}s • 1080p</p>
          </div>
          <button 
            onClick={extractLastFrame}
            disabled={isExtracting}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {isExtracting ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <PhotoIcon className="w-4 h-4" />
            )}
            Auto-Extract Last Frame
          </button>
        </div>
      </div>

      {asset.lastFrame && (
        <div className="space-y-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Extracted Reference Frame</p>
          <div className="relative group overflow-hidden rounded-2xl border border-slate-200">
            <img 
              src={asset.lastFrame.url} 
              alt="Last Frame" 
              className="w-full h-auto transition-transform group-hover:scale-105 duration-500"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <a 
                href={asset.lastFrame.url} 
                download={`LastFrame_${asset.name}.png`}
                className="bg-white text-slate-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                Download PNG
              </a>
            </div>
          </div>
          <div className="bg-teal-50 border border-teal-100 p-3 rounded-xl flex items-start gap-3">
            <CheckCircleIcon className="w-5 h-5 text-teal-600 mt-0.5" />
            <p className="text-xs text-teal-800 leading-relaxed">
              Successfully identified a non-black frame at <b>{asset.lastFrame.timestamp.toFixed(2)}s</b>. Use this image as the "Reference Image" in Jimeng to ensure seamless transitions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple icons
const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default VideoProcessor;
