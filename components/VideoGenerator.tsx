import React, { useState } from 'react';
import { VideoGeneratorProps } from '../types';
import { SingleVideoGenerator } from './SingleVideoGenerator';
import { VideoSequenceGenerator } from './VideoSequenceGenerator';

type VideoMode = 'single' | 'sequence';

export const VideoGenerator: React.FC<VideoGeneratorProps> = (props) => {
  const [mode, setMode] = useState<VideoMode>('single');

  return (
    <div className="flex flex-col h-full bg-theme-base overflow-hidden">
      {/* Sub-Navigation for Video Modes */}
      <div className="bg-theme-surface border-b border-theme-gold/10 px-6 py-2 flex justify-center items-center shrink-0">
        <div className="flex bg-theme-base rounded-lg p-1 border border-theme-gold/10">
          <button
            onClick={() => setMode('single')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'single'
                ? 'bg-theme-gold text-theme-base shadow-sm'
                : 'text-theme-text-sub hover:text-theme-gold'
            }`}
          >
            Video Đơn
          </button>
          <button
            onClick={() => setMode('sequence')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'sequence'
                ? 'bg-theme-gold text-theme-base shadow-sm'
                : 'text-theme-text-sub hover:text-theme-gold'
            }`}
          >
            Chuỗi Video
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {mode === 'single' ? (
          <SingleVideoGenerator {...props} />
        ) : (
          <div className="h-full overflow-y-auto p-4 custom-scrollbar">
             <div className="max-w-6xl mx-auto">
                <VideoSequenceGenerator />
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
