import React from 'react';
import { AppState, FileData, RenderOptions, Tool } from '../types';
import { WEDDING_CATEGORIES, WEDDING_STYLES, COLOR_PALETTES, SURFACE_MATERIALS, TEXTILE_MATERIALS, TEXTILE_COLORS, PHOTOGRAPHY_PRESETS } from '../constants';
import { OptionSelector } from './OptionSelector';
import { RenderImageUpload } from './RenderImageUpload';
import { ImageComparator } from './ImageComparator';

interface RenderToolProps {
  appState: AppState;
  renderOptions: RenderOptions;
  handleOptionChange: <K extends keyof RenderOptions>(key: K, value: RenderOptions[K]) => void;
  isCustomMode: boolean;
  handleToggleCustomMode: () => void;
  isPhotoSettingsOpen: boolean;
  setIsPhotoSettingsOpen: (isOpen: boolean) => void;
  sourceImage: FileData | null;
  handleSourceImageUpload: (data: FileData) => void;
  handleAutoPrompt: (prompt: string) => void;
  handleGenerate: () => void;
  generatedImages: string[];
  selectedImageIndex: number;
  setSelectedImageIndex: (index: number) => void;
  generatedImage: string | null;
  handleTransferToUpscale: () => void;
  handleTransferToAdvancedEdit: () => void;
}

export const RenderTool: React.FC<RenderToolProps> = ({
  appState,
  renderOptions,
  handleOptionChange,
  isCustomMode,
  handleToggleCustomMode,
  isPhotoSettingsOpen,
  setIsPhotoSettingsOpen,
  sourceImage,
  handleSourceImageUpload,
  handleAutoPrompt,
  handleGenerate,
  generatedImages,
  selectedImageIndex,
  setSelectedImageIndex,
  generatedImage,
  handleTransferToUpscale,
  handleTransferToAdvancedEdit,
}) => {
  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start h-full">
      
      {/* LEFT: Controls */}
      <div className="w-full lg:w-1/3 space-y-8 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div>
          {/* Heading H2 -> text-lg font-normal */}
          <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-6 border-b border-zinc-200 dark:border-zinc-800 pb-4">Thông Số Thiết Kế</h2>
          <div className="space-y-6">
            
            {/* 1. Upload */}
            <div className="space-y-2">
                {/* Label -> text-xs font-normal */}
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                  Ảnh Gốc
                </label>
                <RenderImageUpload 
                  onImageUpload={handleSourceImageUpload} 
                  currentImage={sourceImage}
                  onAutoPromptGenerated={handleAutoPrompt}
                />
            </div>
            
            {/* TOGGLE: Chế độ Tùy chỉnh */}
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col">
                    {/* Body Default -> text-sm font-normal */}
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">Tùy Chỉnh</span>
                    {/* Micro/Meta -> text-[11px] font-normal */}
                    <span className="text-[11px] text-zinc-500 font-normal">Bật để chọn Hạng mục, Màu sắc, Vật liệu...</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isCustomMode}
                        onChange={handleToggleCustomMode}
                    />
                    <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>

            {/* 2. Options (Conditional) */}
            {isCustomMode && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300 border-l-2 border-zinc-200 dark:border-zinc-700 pl-4">
                  <OptionSelector
                      label="Hạng Mục"
                      options={WEDDING_CATEGORIES}
                      value={renderOptions.category}
                      onChange={(v) => handleOptionChange('category', v)}
                  />

                  <OptionSelector
                      label="Phong Cách"
                      options={WEDDING_STYLES}
                      value={renderOptions.style}
                      onChange={(v) => handleOptionChange('style', v)}
                  />

                  <OptionSelector
                      label="Bảng Màu"
                      options={COLOR_PALETTES}
                      value={renderOptions.colorPalette}
                      onChange={(v) => handleOptionChange('colorPalette', v)}
                  />

                  <OptionSelector
                      label="Vật Liệu Bề Mặt"
                      options={SURFACE_MATERIALS}
                      value={renderOptions.surfaceMaterial}
                      onChange={(v) => handleOptionChange('surfaceMaterial', v)}
                  />

                  <OptionSelector
                      label="Vật Liệu Vải"
                      options={TEXTILE_MATERIALS}
                      value={renderOptions.textileMaterial}
                      onChange={(v) => handleOptionChange('textileMaterial', v)}
                  />

                  {/* New Conditional Textile Color Selectors */}
                  {renderOptions.textileMaterial !== 'none' && (
                      <>
                      <OptionSelector
                          label="Màu Sắc Chính (Vải)"
                          options={TEXTILE_COLORS}
                          value={renderOptions.textileColor1}
                          onChange={(v) => handleOptionChange('textileColor1', v)}
                      />
                      <OptionSelector
                          label="Màu Sắc Phụ (Vải)"
                          options={TEXTILE_COLORS}
                          value={renderOptions.textileColor2}
                          onChange={(v) => handleOptionChange('textileColor2', v)}
                      />
                      </>
                  )}
                </div>
            )}

            {/* --- PHOTOGRAPHY CONTROLS TOGGLE --- */}
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 mt-6">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">Nâng Cấp Nhiếp Ảnh</span>
                    <span className="text-[11px] text-zinc-500 font-normal">Tiêu cự, lấy nét AI & ánh sáng</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={isPhotoSettingsOpen}
                        onChange={() => setIsPhotoSettingsOpen(!isPhotoSettingsOpen)}
                    />
                    <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>

            {/* --- PHOTOGRAPHY CONTROLS CONTENT --- */}
            {isPhotoSettingsOpen && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 mt-2 animate-in fade-in slide-in-from-top-2">
                  {/* Toggle AI Auto-Focus */}
                  <div className="flex items-center justify-between mb-4">
                      <div>
                          {/* Body Default -> text-sm font-normal */}
                          <span className="font-medium block text-sm text-zinc-700 dark:text-zinc-300">AI Auto-Focus</span>
                          {/* Micro/Meta -> text-[11px] font-normal */}
                          <small className="text-[11px] text-zinc-500 font-normal">Tự động lấy nét nghệ thuật</small>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={renderOptions.isAutoFocus}
                              onChange={() => handleOptionChange('isAutoFocus', !renderOptions.isAutoFocus)}
                          />
                          <div className="w-11 h-6 bg-zinc-200 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                  </div>

                  {/* Chọn Style Ống kính */}
                  <div className="mb-2">
                      <OptionSelector
                          label="Chế độ Ống kính"
                          options={Object.entries(PHOTOGRAPHY_PRESETS).map(([key, val]) => ({
                              value: key,
                              label: val.label,
                              description: val.description
                          }))}
                          value={renderOptions.cameraPreset}
                          onChange={(v) => handleOptionChange('cameraPreset', v)}
                          variant="grid"
                      />
                  </div>
              </div>
            )}

            {/* 3. Text Area */}
            <div className="space-y-2">
                {/* Label -> text-xs font-normal */}
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                  Chi Tiết Cụ Thể
                </label>
                <textarea 
                  className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none text-sm"
                  rows={3}
                  placeholder="Ví dụ: Thêm đèn chùm pha lê, đảm bảo lối đi có hiệu ứng phản chiếu, bỏ khăn phủ ghế..."
                  value={renderOptions.additionalPrompt}
                  onChange={(e) => handleOptionChange('additionalPrompt', e.target.value)}
                />
            </div>

            {/* 4. Image Count Selector */}
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">Số Lượng Ảnh</span>
                    <span className="text-[11px] text-zinc-500 font-normal">Chọn số lượng phương án (1-4)</span>
                </div>
                <div className="flex items-center gap-2">
                    {[1, 2, 3, 4].map((count) => (
                        <button
                            key={count}
                            onClick={() => handleOptionChange('imageCount', count)}
                            className={`w-8 h-8 rounded-full text-xs font-medium transition-all flex items-center justify-center border
                                ${renderOptions.imageCount === count
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 border-transparent hover:bg-zinc-300 dark:hover:bg-zinc-600'}
                            `}
                        >
                            {count}
                        </button>
                    ))}
                </div>
            </div>

            {/* 5. Action Button: Primary (text-sm, py-3, font-normal) */}
            <button
              onClick={handleGenerate}
              disabled={!sourceImage || appState === AppState.GENERATING}
              className={`w-full py-3 px-6 rounded-xl font-semibold text-white tracking-wide shadow-lg transition-all transform hover:-translate-y-1 text-sm
                ${!sourceImage || appState === AppState.GENERATING 
                    ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed' 
                    : 'bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100'
                  }
              `}
            >
              {appState === AppState.GENERATING ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white dark:text-zinc-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  ĐANG TẠO RENDER...
                </span>
              ) : 'HIỆN THỰC HÓA KHÔNG GIAN'}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Display */}
      <div className="w-full lg:w-2/3 h-full min-h-[700px] bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-3 relative overflow-hidden flex flex-col">
        
        {appState === AppState.IDLE && !sourceImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 bg-zinc-50/50 dark:bg-zinc-950/50">
              <svg className="w-24 h-24 mb-6 opacity-20 text-zinc-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xl font-light italic text-zinc-800 dark:text-zinc-200">Tuyệt tác của bạn bắt đầu từ đây.</p>
              <p className="text-sm mt-2 opacity-70">Tải lên một bản phác thảo để bắt đầu tạo render.</p>
          </div>
        )}

        {appState === AppState.IDLE && sourceImage && (
          <div className="w-full h-full flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <img src={sourceImage.objectURL} alt="Nguồn" className="max-w-full max-h-[650px] object-contain shadow-lg" />
          </div>
        )}

        {appState === AppState.GENERATING && (
          <div className="absolute inset-0 z-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex flex-col items-center justify-center">
              <div className="relative w-32 h-32">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-zinc-200 dark:border-zinc-700 rounded-full animate-ping opacity-50"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-zinc-900 dark:border-white rounded-full animate-spin border-t-transparent shadow-lg"></div>
              </div>
              <h3 className="mt-8 text-xl font-semibold text-zinc-900 dark:text-white tracking-widest">AI ĐANG XỬ LÝ...</h3>
              <p className="text-zinc-500 mt-2 text-sm">Đang áp dụng vật liệu, ánh sáng và sắp xếp hoa.</p>
          </div>
        )}

        {appState === AppState.SUCCESS && generatedImage && sourceImage?.objectURL && (
            <div className="h-full flex flex-col gap-4">
              <div className="flex-1 min-h-0 bg-zinc-100 dark:bg-zinc-950 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative">
                  <ImageComparator 
                  originalImage={sourceImage.objectURL || ''} 
                  generatedImage={generatedImage} 
                  />
                  
                  {/* Image Selector Overlay */}
                  {generatedImages.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black/50 backdrop-blur-md p-2 rounded-full border border-white/10 z-10">
                          {generatedImages.map((_, idx) => (
                              <button
                                  key={idx}
                                  onClick={() => setSelectedImageIndex(idx)}
                                  className={`w-8 h-8 rounded-full text-xs font-medium transition-all flex items-center justify-center border
                                      ${selectedImageIndex === idx
                                          ? 'bg-white text-black border-white shadow-lg scale-110'
                                          : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}
                                  `}
                              >
                                  {idx + 1}
                              </button>
                          ))}
                      </div>
                  )}
              </div>
              <div className="flex justify-center gap-4 py-2">
                <a 
                  href={generatedImage} 
                  download="wedding-render-8k.png"
                  className="px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full text-xs font-semibold hover:opacity-90 transition-all shadow-lg flex items-center gap-2 border border-transparent"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  Tải Render
                </a>
                <button 
                  onClick={handleTransferToUpscale}
                  className="px-5 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-full text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101M12 12l-2 2" /></svg>
                  Nâng Cấp
                </button>
                <button 
                  onClick={handleTransferToAdvancedEdit}
                  className="px-5 py-2 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-full text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  Chỉnh Sửa
                </button>
              </div>
            </div>
        )}
      </div>
    </div>
  );
};
