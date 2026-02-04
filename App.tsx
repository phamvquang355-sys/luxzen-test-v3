import React, { useState } from 'react';
import { AppState, FileData, RenderOptions, UpscaleState, Tool, Resolution, AdvancedEditState, EditMode, SketchConverterState, SketchStyle, IdeaGeneratorState } from './types';
import { WEDDING_CATEGORIES, WEDDING_STYLES, COLOR_PALETTES, SURFACE_MATERIALS, TEXTILE_MATERIALS, TEXTILE_COLORS, PHOTOGRAPHY_PRESETS } from './constants';
import { generateWeddingRender } from './services/geminiService';
import { OptionSelector } from './components/OptionSelector';
import { RenderImageUpload } from './components/RenderImageUpload';
import { ImageComparator } from './components/ImageComparator';
import Upscale from './components/Upscale';
import AdvancedEdit from './components/AdvancedEdit';
import { SketchConverter } from './components/SketchConverter';
import { IdeaGenerator } from './components/IdeaGenerator'; // Import IdeaGenerator

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.RENDER);
  const [userCredits, setUserCredits] = useState<number>(100);

  // State for Render tab
  const [sourceImage, setSourceImage] = useState<FileData | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [renderOptions, setRenderOptions] = useState<RenderOptions>({
    category: WEDDING_CATEGORIES[0].value,
    style: WEDDING_STYLES[0].value,
    colorPalette: COLOR_PALETTES[0].value,
    surfaceMaterial: SURFACE_MATERIALS[0].value,
    textileMaterial: TEXTILE_MATERIALS[0].value,
    textileColor1: TEXTILE_COLORS[0].value, 
    textileColor2: TEXTILE_COLORS[0].value,
    additionalPrompt: '',
    hiddenAIContext: '',
    isAutoFocus: true, // Default enabled
    cameraPreset: 'CINEMATIC' // Default preset
  });

  // State for Upscale tab
  const [upscaleState, setUpscaleState] = useState<UpscaleState>({
    sourceImage: null,
    isLoading: false,
    error: null,
    upscaledImages: [],
    resolution: '1K' as Resolution,
  });

  // State for Advanced Edit tab
  const [advancedEditState, setAdvancedEditState] = useState<AdvancedEditState>({
    sourceImage: null,
    editMode: 'NOTE' as EditMode,
    refObject: null,
    annotatedBase64: null,
    clickPoint: null,
    detectedPoints: [],
    resultImage: null,
    isLoading: false,
    error: null,
    isAnnotating: false,
  });

  // State for Sketch Converter tab
  const [sketchState, setSketchState] = useState<SketchConverterState>({
    sourceImage: null,
    resultImage: null,
    isLoading: false,
    error: null,
    sketchStyle: 'pencil' as SketchStyle,
    resolution: '1K' as Resolution,
  });

  // State for Idea Generator tab
  const [ideaState, setIdeaState] = useState<IdeaGeneratorState>({
    sourceSketch: null,
    referenceStyle: null,
    baseImage: null,
    assets: [],
    isLoading: false,
    error: null,
    resultImages: [], // Updated to match type definition
    currentStep: 'UPLOAD',
  });

  const handleOptionChange = <K extends keyof RenderOptions>(key: K, value: RenderOptions[K]) => {
    setRenderOptions(prev => ({ ...prev, [key]: value }));
  };
  
  const handleAutoPrompt = (prompt: string) => {
    setRenderOptions(prev => ({ ...prev, hiddenAIContext: prompt }));
    console.log("Hidden AI Context updated silently.");
  };

  const handleGenerate = async () => {
    if (!sourceImage) return;

    setAppState(AppState.GENERATING);
    try {
      const resultUrl = await generateWeddingRender(sourceImage, renderOptions);
      setGeneratedImage(resultUrl);
      setAppState(AppState.SUCCESS);
    } catch (error) {
      console.error(error);
      setAppState(AppState.ERROR);
      alert("Đã xảy ra lỗi khi tạo ảnh. Vui lòng kiểm tra khóa API và thử lại.");
    }
  };

  const createFileDataFromDataURL = (dataUrl: string): FileData => {
    const parts = dataUrl.split(';base64,');
    const mimeType = parts[0].replace('data:', '');
    const base64 = parts[1];
    return {
      base64,
      mimeType,
      objectURL: dataUrl 
    };
  };

  const handleSourceImageUpload = (data: FileData) => {
    setSourceImage(data);
    setGeneratedImage(null); 
    setAppState(AppState.IDLE); 
  };

  const handleUpscaleStateChange = (newState: Partial<UpscaleState>) => {
    setUpscaleState(prev => ({ ...prev, ...newState }));
  };

  const resetUpscaleTab = () => {
    setUpscaleState({
      sourceImage: null,
      isLoading: false,
      error: null,
      upscaledImages: [],
      resolution: '1K' as Resolution,
    });
  };

  const handleAdvancedEditStateChange = (newState: Partial<AdvancedEditState>) => {
    setAdvancedEditState(prev => ({ ...prev, ...newState }));
  };

  const resetAdvancedEditTab = () => {
    setAdvancedEditState({
      sourceImage: null,
      editMode: 'NOTE',
      refObject: null,
      annotatedBase64: null,
      clickPoint: null,
      detectedPoints: [],
      resultImage: null,
      isLoading: false,
      error: null,
      isAnnotating: false,
    });
  };

  const handleSketchStateChange = (newState: Partial<SketchConverterState>) => {
    setSketchState(prev => ({ ...prev, ...newState }));
  };

  const resetSketchTab = () => {
    setSketchState({
      sourceImage: null,
      resultImage: null,
      isLoading: false,
      error: null,
      sketchStyle: 'pencil',
      resolution: '1K',
    });
  };

  const handleIdeaStateChange = (newState: Partial<IdeaGeneratorState>) => {
    setIdeaState(prev => ({ ...prev, ...newState }));
  };

  const resetIdeaTab = () => {
    setIdeaState({
      sourceSketch: null,
      referenceStyle: null,
      baseImage: null,
      assets: [],
      isLoading: false,
      error: null,
      resultImages: [], 
      currentStep: 'UPLOAD',
    });
  };

  const handleDeductCredits = async (cost: number, description: string) => {
    setUserCredits(prev => prev - cost);
    console.log(`Credits deducted: ${cost}. Remaining: ${userCredits - cost}. Action: ${description}`);
  };

  const handleTransferToUpscale = () => {
    if (generatedImage) {
      setActiveTool(Tool.UPSCALE);
      setUpscaleState(prev => ({ 
        ...prev, 
        sourceImage: createFileDataFromDataURL(generatedImage),
        upscaledImages: [], 
        error: null,
        isLoading: false,
      }));
    }
  };

  const handleTransferToAdvancedEdit = () => {
    if (generatedImage) {
      setActiveTool(Tool.ADVANCED_EDIT);
      setAdvancedEditState(prev => ({ 
        ...prev, 
        sourceImage: createFileDataFromDataURL(generatedImage),
        resultImage: null, 
        error: null,
        isLoading: false,
        editMode: 'NOTE', 
        refObject: null,
        annotatedBase64: null,
        clickPoint: null,
        detectedPoints: [],
        isAnnotating: false,
      }));
    }
  };


  return (
    <div className="min-h-screen flex flex-col bg-theme-base text-theme-gold font-sans selection:bg-theme-gold selection:text-theme-base">
      {/* Header */}
      <header className="bg-theme-base/90 backdrop-blur-md sticky top-0 z-50 border-b border-theme-gold/20 shadow-lg shadow-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-theme-gold text-theme-base rounded-full flex items-center justify-center">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-theme-gold">
              Luxe<span className="font-light opacity-80">Render</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            {[
                { id: Tool.RENDER, label: 'Render 3D', icon: null },
                { id: Tool.IDEA_GENERATOR, label: 'Ý Tưởng', icon: '💡' },
                { id: Tool.UPSCALE, label: 'Nâng Cấp', icon: null },
                { id: Tool.ADVANCED_EDIT, label: 'Chỉnh Sửa', icon: null },
                { id: Tool.SKETCH_CONVERTER, label: 'Phác Thảo', icon: null },
            ].map(tool => (
                <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id as Tool)}
                className={`px-4 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap border
                    ${activeTool === tool.id 
                    ? 'bg-theme-gold text-theme-base border-theme-gold shadow-[0_0_15px_rgba(217,197,180,0.3)]' 
                    : 'bg-transparent text-theme-gold-dim border-transparent hover:bg-theme-surface hover:text-theme-gold hover:border-theme-gold/30'}
                `}
                >
                {tool.icon && <span className="mr-1.5">{tool.icon}</span>}
                {tool.label}
                </button>
            ))}
            <div className="h-8 w-[1px] bg-theme-gold/20 mx-2 hidden md:block"></div>
            <span className="text-sm font-bold text-theme-gold ml-2 whitespace-nowrap bg-theme-surface px-3 py-1.5 rounded-lg border border-theme-gold/10">
                Credits: {userCredits}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {activeTool === Tool.RENDER && (
          <div className="flex flex-col lg:flex-row gap-8 items-start h-full">
            
            {/* LEFT: Controls */}
            <div className="w-full lg:w-1/3 space-y-8 bg-theme-surface p-6 md:p-8 rounded-2xl shadow-2xl border border-theme-gold/10">
              <div>
                <h2 className="text-xl font-bold text-theme-gold mb-6 border-b border-theme-gold/10 pb-4">Thông Số Thiết Kế</h2>
                <div className="space-y-6">
                  
                  {/* 1. Upload */}
                  <div className="space-y-2">
                      <label className="block text-xs font-bold text-theme-gold-dim uppercase tracking-widest">
                        Ảnh Gốc
                      </label>
                      <RenderImageUpload 
                        onImageUpload={handleSourceImageUpload} 
                        currentImage={sourceImage}
                        onAutoPromptGenerated={handleAutoPrompt}
                      />
                  </div>

                  {/* 2. Options */}
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

                  {/* --- PHOTOGRAPHY CONTROLS --- */}
                  <div className="p-4 bg-theme-base rounded-xl border border-theme-gold/20 mt-6">
                      <h3 className="text-xs font-bold text-theme-gold uppercase tracking-widest mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-theme-gold"></span>
                          Nâng cấp Nhiếp Ảnh
                      </h3>
                      
                      {/* Toggle AI Auto-Focus */}
                      <div className="flex items-center justify-between mb-4">
                          <div>
                              <span className="font-bold block text-sm text-theme-gold">AI Auto-Focus</span>
                              <small className="text-xs text-theme-gold-dim">Tự động lấy nét nghệ thuật</small>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                  type="checkbox" 
                                  className="sr-only peer" 
                                  checked={renderOptions.isAutoFocus}
                                  onChange={() => handleOptionChange('isAutoFocus', !renderOptions.isAutoFocus)}
                              />
                              <div className="w-11 h-6 bg-theme-surface2 border border-theme-gold/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-theme-base after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-theme-gold after:border-theme-base after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-gold/20 peer-checked:border-theme-gold"></div>
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

                  {/* 3. Text Area */}
                  <div className="space-y-2">
                      <label className="block text-xs font-bold text-theme-gold-dim uppercase tracking-widest">
                        Chi Tiết Cụ Thể
                      </label>
                      <textarea 
                        className="w-full p-3 bg-theme-base border border-theme-gold/20 rounded-xl text-theme-gold placeholder-theme-gold-dim/50 focus:ring-1 focus:ring-theme-gold focus:border-theme-gold outline-none transition-all resize-none text-sm"
                        rows={3}
                        placeholder="Ví dụ: Thêm đèn chùm pha lê, đảm bảo lối đi có hiệu ứng phản chiếu, bỏ khăn phủ ghế..."
                        value={renderOptions.additionalPrompt}
                        onChange={(e) => handleOptionChange('additionalPrompt', e.target.value)}
                      />
                  </div>

                  {/* 4. Action Button */}
                  <button
                    onClick={handleGenerate}
                    disabled={!sourceImage || appState === AppState.GENERATING}
                    className={`w-full py-4 px-6 rounded-xl font-bold text-theme-base tracking-widest shadow-lg transition-all transform hover:-translate-y-1
                      ${!sourceImage || appState === AppState.GENERATING 
                          ? 'bg-theme-surface2 text-theme-gold-dim cursor-not-allowed border border-theme-gold/10' 
                          : 'bg-theme-gold hover:bg-white hover:shadow-[0_0_20px_rgba(217,197,180,0.4)]'
                        }
                    `}
                  >
                    {appState === AppState.GENERATING ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-theme-base" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
            <div className="w-full lg:w-2/3 h-full min-h-[700px] bg-theme-surface rounded-2xl shadow-2xl border border-theme-gold/10 p-3 relative overflow-hidden flex flex-col">
              
              {appState === AppState.IDLE && !sourceImage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-theme-gold-dim bg-theme-base/50">
                    <svg className="w-24 h-24 mb-6 opacity-30 text-theme-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xl font-light italic text-theme-gold">Tuyệt tác của bạn bắt đầu từ đây.</p>
                    <p className="text-sm mt-2 opacity-70">Tải lên một bản phác thảo để bắt đầu tạo render.</p>
                </div>
              )}

              {appState === AppState.IDLE && sourceImage && (
                <div className="w-full h-full flex items-center justify-center bg-black/40 rounded-xl overflow-hidden backdrop-blur-sm border border-theme-gold/5">
                    <img src={sourceImage.objectURL} alt="Nguồn" className="max-w-full max-h-[650px] object-contain shadow-2xl" />
                </div>
              )}

              {appState === AppState.GENERATING && (
                <div className="absolute inset-0 z-20 bg-theme-base/80 backdrop-blur-md flex flex-col items-center justify-center">
                    <div className="relative w-32 h-32">
                      <div className="absolute top-0 left-0 w-full h-full border-4 border-theme-gold/20 rounded-full animate-ping opacity-50"></div>
                      <div className="absolute top-0 left-0 w-full h-full border-4 border-theme-gold rounded-full animate-spin border-t-transparent shadow-[0_0_20px_rgba(217,197,180,0.5)]"></div>
                    </div>
                    <h3 className="mt-8 text-xl font-bold text-theme-gold tracking-widest">AI ĐANG XỬ LÝ...</h3>
                    <p className="text-theme-gold-dim mt-2 text-sm">Đang áp dụng vật liệu, ánh sáng và sắp xếp hoa.</p>
                </div>
              )}

              {appState === AppState.SUCCESS && generatedImage && sourceImage?.objectURL && (
                  <div className="h-full flex flex-col gap-4">
                    <div className="flex-1 min-h-0 bg-black/20 rounded-xl overflow-hidden border border-theme-gold/10">
                        <ImageComparator 
                        originalImage={sourceImage.objectURL || ''} 
                        generatedImage={generatedImage} 
                        />
                    </div>
                    <div className="flex justify-center gap-4 py-2">
                      <a 
                        href={generatedImage} 
                        download="wedding-render-8k.png"
                        className="px-6 py-2.5 bg-theme-gold text-theme-base rounded-full text-sm font-bold hover:bg-white transition-all shadow-lg flex items-center gap-2 border border-transparent"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                        Tải Render
                      </a>
                      <button 
                        onClick={handleTransferToUpscale}
                        className="px-6 py-2.5 bg-theme-surface2 text-theme-gold border border-theme-gold/30 rounded-full text-sm font-bold hover:bg-theme-gold hover:text-theme-base transition-all shadow-lg flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.101M12 12l-2 2" /></svg>
                        Nâng Cấp
                      </button>
                      <button 
                        onClick={handleTransferToAdvancedEdit}
                        className="px-6 py-2.5 bg-theme-surface2 text-theme-gold border border-theme-gold/30 rounded-full text-sm font-bold hover:bg-theme-gold hover:text-theme-base transition-all shadow-lg flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        Chỉnh Sửa
                      </button>
                    </div>
                  </div>
              )}
            </div>
          </div>
        )}

        {activeTool === Tool.IDEA_GENERATOR && (
            <IdeaGenerator
                state={ideaState}
                onStateChange={handleIdeaStateChange}
                userCredits={userCredits}
                onDeductCredits={handleDeductCredits}
                onReset={resetIdeaTab}
            />
        )}

        {activeTool === Tool.UPSCALE && (
          <Upscale 
            state={upscaleState}
            onStateChange={handleUpscaleStateChange}
            userCredits={userCredits}
            onDeductCredits={handleDeductCredits}
            onReset={resetUpscaleTab}
          />
        )}

        {activeTool === Tool.ADVANCED_EDIT && (
          <AdvancedEdit 
            state={advancedEditState}
            onStateChange={handleAdvancedEditStateChange}
            userCredits={userCredits}
            onDeductCredits={handleDeductCredits}
            onReset={resetAdvancedEditTab}
          />
        )}

        {activeTool === Tool.SKETCH_CONVERTER && (
            <SketchConverter 
                state={sketchState} 
                onStateChange={handleSketchStateChange}
                userCredits={userCredits}
                onDeductCredits={handleDeductCredits}
                onReset={resetSketchTab}
            />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-theme-surface border-t border-theme-gold/10 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-theme-gold-dim text-sm">
          <p>© 2024 LuxeRender. Được hỗ trợ bởi Google Gemini AI.</p>
          <div className="flex justify-center gap-4 mt-2 opacity-50">
             <span>Chính sách bảo mật</span> • <span>Điều khoản sử dụng</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;