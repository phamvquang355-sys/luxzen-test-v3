
import { GoogleGenAI, Type } from "@google/genai";
import { FileData, RenderOptions, Resolution, EditMode, ClickPoint, SketchStyle, IdeaAsset } from "../types"; 
import { PHOTOGRAPHY_PRESETS, STRUCTURE_FIDELITY_PROMPT, REALISM_MODIFIERS } from "../constants";

const WEDDING_MATERIALS_KEYWORDS = {
  // These are now examples or fallbacks, as actual values will come from options
  florals: "high-density fresh white hydrangeas and roses, hanging wisteria, lush greenery",
  lighting: "cinematic volumetric lighting, warm amber ambient glow, professional stage spotlights, Tyndall effect"
};

// 1. Thêm hằng số định nghĩa quy tắc bố cục nghiêm ngặt
const COMPOSITION_RULE_PROMPT = `
=== CAMERA & COMPOSITION RULES (NON-NEGOTIABLE) ===
1. PRESERVE FRAMING: Do NOT crop, zoom, or change the camera angle. The output image must match the exact field of view of the source sketch.
2. SAFE ZONE ENFORCEMENT: 
   - Maintain the subject within the central 80% of the width (leaving 10% padding on Left/Right).
   - Maintain the subject within the vertical 70% (leaving 10% padding Top, 20% padding Bottom).
3. NEGATIVE SPACE: Respect the whitespace/background in the sketch. Do not fill the entire frame if the sketch implies empty space.
===================================================
`;

// 2. Thêm Prompt chuyên dụng cho việc ghép đồ (Bước 2)
const DECOR_PLACEMENT_ONLY_PROMPT = `
=== MODE: OBJECT INSERTION ONLY (CHẾ ĐỘ CHỈ GHÉP ĐỒ) ===
CONTEXT: The provided image is a FINAL ARCHITECTURAL RENDER.
TASK: Insert the requested decor assets into this EXACT scene.
CRITICAL CONSTRAINTS (VIOLATION = FAIL):
1. BACKGROUND LOCK: DO NOT redraw the room. The walls, floor, ceiling, lighting, and camera angle MUST remain 100% identical to the input image.
2. PERSPECTIVE MATCH: Place new objects respecting the existing vanishing point and floor plane.
3. NO RE-COMPOSITION: Do not zoom, crop, or shift the frame.
========================================================
`;

/**
 * Resize and compress an image to optimize for upload speed and API cost.
 * @param file The original file from input.
 * @param maxWidth Maximum width/height (whichever is larger) to scale down to (default 1024px).
 * @param quality Compression quality from 0.1 to 1.0 (default 0.8).
 * @returns A Promise that resolves with the base64 string of the compressed JPEG image (without prefix).
 */
export const resizeAndCompressImage = (
  file: File, 
  maxWidth: number = 1024, 
  quality: number = 0.8
): Promise<{ base64: string; mimeType: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate scaling factor to maintain aspect ratio
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height *= maxWidth / width;
            width = maxWidth;
          } else {
            width *= maxWidth / height;
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error("Could not get 2D rendering context for canvas."));
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Export as base64 JPEG, removing the prefix for Gemini API inlineData
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({ 
          base64: dataUrl.split(',')[1], 
          mimeType: 'image/jpeg',
          width: width,
          height: height
        }); 
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

/**
 * Creates an "AI Empowerment" prompt segment when user selects "Automatic" options.
 */
export const getEmpowermentPrompt = (selections: RenderOptions): string => {
  const autoInstructions: string[] = [];

  // 1. Nếu Category là Tự động: AI phải nhận diện hình khối để giữ nguyên công năng
  if (selections.category === 'none') {
    autoInstructions.push("- PHÂN TÍCH CẤU TRÚC GỐC: Nhận diện chính xác vị trí các vật thể hiện hữu. Tuyệt đối không thêm thắt các khối kiến trúc làm thay đổi bố cục gốc.");
  }

  // 2. Nếu Style là Tự động: AI phải đọc "ngôn ngữ" thiết kế có sẵn
  if (selections.style === 'none') {
    autoInstructions.push("- TRÍCH XUẤT PHONG CÁCH: Phân tích các đường nét kiến trúc sẵn có trong ảnh (ví dụ: phào chỉ cổ điển, nét thẳng hiện đại) để render vật liệu đồng nhất với ngôn ngữ đó.");
  }

  // 3. QUAN TRỌNG: Màu sắc bám sát gốc
  if (selections.colorPalette === 'none') {
    autoInstructions.push("- BẢO TỒN BẢNG MÀU (STRICT COLOR MATCH): Thực hiện lấy mẫu màu trực tiếp từ hình ảnh gốc. Nếu ảnh gốc có tông màu vàng kem và gỗ, bản render phải sử dụng chính xác mã màu đó. Tuyệt đối không tự ý thay đổi tone màu chủ đạo.");
  }

  // 4. QUAN TRỌNG: Vật liệu bám sát gốc
  if (selections.surfaceMaterial === 'none') {
    autoInstructions.push("- NÂNG CẤP VẬT LIỆU THỰC TẾ (MATERIAL ENHANCEMENT): Xác định vật liệu hiện có (ví dụ: sàn gạch, vải lụa, kim loại). Thay vì thay thế, hãy tập trung vào việc làm nét (upscale) vân bề mặt, thêm độ phản chiếu (reflection) và độ bóng (glossiness) dựa trên bản chất vật liệu gốc.");
  }

  // 5. QUAN TRỌNG: Vật liệu vải bám sát gốc (New)
  if (selections.textileMaterial === 'none') {
    autoInstructions.push("- TỐI ƯU VẬT LIỆU VẢI: Phân tích các loại vải hiện có (ví dụ: rèm, khăn trải bàn) và nâng cấp chúng lên chất liệu cao cấp (lụa óng ánh, nhung dày, voan mỏng) phù hợp với bối cảnh tổng thể.");
  }

  // 6. QUAN TRỌNG: Màu sắc vải bám sát gốc
  if (selections.textileMaterial !== 'none' && selections.textileColor1 === 'none') {
    autoInstructions.push("- TỐI ƯU MÀU SẮC CHÍNH VẢI: AI sẽ chọn màu sắc chính hài hòa với vật liệu vải và bảng màu tổng thể.");
  }
  if (selections.textileMaterial !== 'none' && selections.textileColor2 === 'none') {
    autoInstructions.push("- TỐI ƯU MÀU SẮC PHỤ VẢI: AI sẽ chọn màu sắc phụ hài hòa với vật liệu vải và bảng màu tổng thể, tạo điểm nhấn tinh tế.");
  }


  if (autoInstructions.length === 0) return "";

  return `
--- CHẾ ĐỘ AI TUÂN THỦ TỐI ĐA (STRICT ADHERENCE MODE) ---
Nhiệm vụ của bạn là 'Diễn họa phục hồi'. Hãy coi hình ảnh gốc là tiêu chuẩn vàng về màu sắc và vật liệu:
${autoInstructions.join('\n')}
MỤC TIÊU: Tạo ra bản render 8k siêu thực nhưng khi đặt cạnh ảnh gốc, người xem phải thấy sự đồng nhất 100% về màu sắc và linh hồn của vật liệu.
-------------------------------------------------------
  `;
};

/**
 * [MỚI] Hàm tạo chỉ thị không gian (Spatial Instructions)
 * Giúp AI hiểu vị trí và tỉ lệ vật thể dựa trên tọa độ bounding box.
 */
const generateSpatialInstructions = (assets: IdeaAsset[]): string => {
  if (!assets || assets.length === 0) return "";

  const assetInstructions = assets.map((asset, index) => {
    // Làm tròn số để prompt gọn gàng hơn
    const x = Math.round(asset.x);
    const y = Math.round(asset.y);
    const w = Math.round(asset.width);
    const h = Math.round(asset.height);
    
    // Xác định ngữ cảnh độ sâu (Depth) để AI xử lý ánh sáng (Focus/Blur)
    let depthContext = "MID-GROUND";
    const bottomY = asset.y + asset.height;
    
    // Quy tắc heuristic đơn giản: Càng thấp trong ảnh (y cao) thì càng gần camera
    if (bottomY > 85) depthContext = "FOREGROUND (High Detail, Sharp Focus)";
    else if (bottomY < 45) depthContext = "BACKGROUND (Slightly less focus if needed)";

    // Input Image Index bắt đầu từ 2 (vì #1 là ảnh nền phòng)
    const imageRefIndex = index + 2; 

    return `
    --- OBJECT #${index + 1} (Ref: Input Image ${imageRefIndex}) ---
    TYPE: Decor Item (Label: "${asset.label}")
    
    1. STRICT PLACEMENT (HARD CONSTRAINT):
       - Bounding Box: Left=${x}%, Top=${y}%, Width=${w}%, Height=${h}%
       - RULE: The object must receive a "CONTAIN" fit within this box. DO NOT crop the object. DO NOT stretch distinct shapes.
       - RULE: The object's bottom edge (at Top + Height) must "sit" on the floor/surface to cast a correct shadow.

    2. VISUAL PROCESSING:
       - SEGMENTATION: Automatically REMOVE the background of Input Image ${imageRefIndex} before placing. Only use the object itself.
       - LIGHTING MATCH: Analyze the light direction in the main room (Input Image 1) and apply consistent highlights/shadows to this object.
       - PERSPECTIVE: Adjust the object's perspective to match the room's vanishing point at this specific location (${depthContext}).
    `;
  }).join('\n');

  return `
  \n========== STEP 2: DECOR SETUP INSTRUCTIONS (STRICT MODE) ==========
  USER INTENT: The user has manually arranged these decor items exactly where they want them.
  
  *** COMPOSITION RULES ***:
  1. NO COMPOSITION CHANGES: Do not move objects to make the scene "better". Respect user coordinates absolutely.
  2. SCALE ACCURACY: If the user made an object small, keep it small. If large, keep it large.
  3. REALISM: The primary goal is to make these inserted objects look like they naturally belong in the scene (Photorealistic Blending), not just pasted on top.
  
  DETAILS FOR EACH OBJECT:
  ${assetInstructions}
  `;
};

// ... (Existing helper functions generatePromptFromImageAndText, generateRenderPrompt, generateWeddingRender, getSupportedAspectRatio, generateHighQualityImage, generateAdvancedEdit, detectSimilarObjects, generateSketch - keep them as is) ...
export const generatePromptFromImageAndText = async (
  image: FileData, 
  instruction: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { text: instruction },
          { inlineData: { mimeType: image.mimeType, data: image.base64 } }
        ]
      },
      config: { temperature: 0.4 }
    });

    return response.text || "Không thể phân tích ảnh.";
  } catch (error) {
    console.error("Auto-Prompt Generation Error:", error);
    throw error;
  }
};

export const generateRenderPrompt = (
  basePrompt: string, 
  style: string, 
  isAutoFocus: boolean,
  presetKey: string
) => {
  const preset = PHOTOGRAPHY_PRESETS[presetKey as keyof typeof PHOTOGRAPHY_PRESETS] || PHOTOGRAPHY_PRESETS.CINEMATIC;
  
  // Logic xử lý Auto-Focus
  const focusPrompt = isAutoFocus 
    ? "AI AUTOMATIC FOCUS: Identify the most prominent decorative element and apply a sharp photographic focus to it, creating a natural depth of field."
    : "MANUAL FOCUS: Keep the sharpness consistent across the designated focal area.";

  return `
    IMAGE TYPE: Wedding Design Render.
    CORE INSTRUCTION: ${STRUCTURE_FIDELITY_PROMPT}
    
    SUBJECT DESCRIPTION: ${basePrompt}.
    VISUAL STYLE: ${style}.
    PHOTOGRAPHY SETTINGS: ${preset.prompt}.
    FOCUS CONTROL: ${focusPrompt}.
    
    QUALITY STANDARDS: ${REALISM_MODIFIERS}.
    
    FINAL NOTE: Ensure the materials like glass, silk, and flowers look authentic under the specified lighting.
  `;
};

export const generateWeddingRender = async (
  sourceImage: FileData,
  options: RenderOptions
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set REACT_APP_GEMINI_API_KEY or process.env.API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const empowermentPrompt = getEmpowermentPrompt(options);
  const spatialPrompt = options.assets ? generateSpatialInstructions(options.assets) : "";

  let masterPrompt = "";
  let textileDetails = '';
  if (options.textileMaterial !== 'none') {
    textileDetails += options.textileMaterial;
    if (options.textileColor1 !== 'none' && options.textileColor2 !== 'none') {
      textileDetails += ` in a primary color of ${options.textileColor1} and a secondary color of ${options.textileColor2}`;
    } else if (options.textileColor1 !== 'none') {
      textileDetails += ` in ${options.textileColor1}`;
    } else if (options.textileColor2 !== 'none') {
      textileDetails += ` with accents of ${options.textileColor2}`;
    }
  } else {
    textileDetails = 'appropriate luxury fabrics and draping based on context';
  }

  const baseDescription = `
    Analyze this wedding sketch/3D base.
    CONTEXT: ${options.category !== 'none' ? options.category : 'wedding event space'}.
    STYLE: ${options.style !== 'none' ? options.style : 'high-end luxury wedding'}.
    PALETTE: ${options.colorPalette !== 'none' ? options.colorPalette : 'harmonious elegant palette'}.
    MATERIALS: ${options.surfaceMaterial !== 'none' ? options.surfaceMaterial : 'appropriate luxury materials based on context'} for flooring and prominent surfaces.
    TEXTILE MATERIALS: ${textileDetails}.
    FLORALS: ${WEDDING_MATERIALS_KEYWORDS.florals}.
    LIGHTING: ${WEDDING_MATERIALS_KEYWORDS.lighting}.
    USER DETAILS: ${options.additionalPrompt}.
    ${empowermentPrompt}
    ${spatialPrompt}
  `;

  if (options.hiddenAIContext) {
      console.log("Step 1: Using Mixed Prompt Strategy (Hidden Context Available)...");
      masterPrompt = generateRenderPrompt(
          `${baseDescription}\nCONTEXTUAL ANALYSIS FROM SOURCE: ${options.hiddenAIContext}`,
          options.style,
          options.isAutoFocus,
          options.cameraPreset
      );
  } else {
      console.log("Step 1: Analyzing structure with Gemini Flash (Fallback)...");
      const analysisPrompt = `
        ${baseDescription}
        1. Identify the exact perspective: (e.g., eye-level, wide angle).
        2. Identify structural anchors: (e.g., center aisle, stage placement, ceiling height).
        3. Generate a comprehensive description of the scene that can be used to re-render it photorealistically.
        
        Return ONLY the description.
      `;

      try {
          const reasoningResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { text: analysisPrompt },
                    { inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } }
                ]
            },
            config: { temperature: 0.2 }
          });
          
          const sceneDescription = reasoningResponse.text || baseDescription;
          masterPrompt = generateRenderPrompt(
              sceneDescription,
              options.style,
              options.isAutoFocus,
              options.cameraPreset
          );
      } catch (e) {
          console.warn("Reasoning step failed, falling back to basic prompt", e);
          masterPrompt = generateRenderPrompt(
              baseDescription,
              options.style,
              options.isAutoFocus,
              options.cameraPreset
          );
      }
  }

  try {
    const renderResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { text: masterPrompt },
          { inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } }
        ]
      },
      config: {
        systemInstruction: "You are a specialized 3D Wedding Visualizer. Transform the input sketch into a photorealistic render following the prompt exactly."
      }
    });

    if (renderResponse.candidates && renderResponse.candidates.length > 0) {
        const content = renderResponse.candidates[0].content;
        if (content && content.parts) {
            for (const part of content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
    }
    throw new Error("No image generated in the response.");
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const generateHighQualityImage = async (
  prompt: string,
  resolution: Resolution,
  sourceImage: { mimeType: string; base64: string; width?: number; height?: number } 
): Promise<string[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set REACT_APP_GEMINI_API_KEY or process.env.API_KEY");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const contentsParts = [];
  contentsParts.push({ inlineData: { mimeType: sourceImage.mimeType, data: sourceImage.base64 } });
  contentsParts.push({ text: prompt });

  const aspectRatio = sourceImage.width && sourceImage.height
    ? getSupportedAspectRatio(sourceImage.width, sourceImage.height)
    : "16:9";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', 
      contents: { parts: contentsParts },
      config: {
        imageConfig: { aspectRatio: aspectRatio, imageSize: resolution },
        systemInstruction: "You are an expert image upscaler..."
      },
    });

    const generatedImageUrls: string[] = [];
    if (response.candidates && response.candidates.length > 0) {
      for (const candidate of response.candidates) {
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.data) {
              generatedImageUrls.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
            }
          }
        }
      }
    }
    if (generatedImageUrls.length === 0) throw new Error("No image data returned.");
    return generatedImageUrls;
  } catch (error) {
    console.error("Gemini High Quality Image Generation Error:", error);
    throw error;
  }
};

export const generateAdvancedEdit = async (
  sourceImageBase64: string,
  sourceImageMimeType: string,
  editMode: EditMode,
  secondaryImageData?: { base64: string; mimeType: string }, 
  targetClickPoints?: ClickPoint[], 
  additionalPrompt?: string 
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [{ inlineData: { mimeType: sourceImageMimeType, data: sourceImageBase64 } }];
  let systemInstruction = "";
  let userPrompt = "";

  if (editMode === 'NOTE') {
    if (!secondaryImageData) throw new Error("Annotated image data is required for 'NOTE' mode.");
    parts.push({ inlineData: { mimeType: secondaryImageData.mimeType, data: secondaryImageData.base64 } });
    const userInstructionText = additionalPrompt ? `USER INSTRUCTIONS: ${additionalPrompt}` : "Follow the visual annotations.";
    userPrompt = `TASK: PHOTOREALISTIC IMAGE EDITING... ${userInstructionText}`;
    systemInstruction = "You are an AI image editor...";
  } else if (editMode === 'SWAP') {
    if (!secondaryImageData || !targetClickPoints || targetClickPoints.length === 0) throw new Error("Reference object image and target click points are required.");
    parts.push({ inlineData: { mimeType: secondaryImageData.mimeType, data: secondaryImageData.base64 } });
    const clickPointsDescription = targetClickPoints.map(p => `(X:${p.x}%, Y:${p.y}%)`).join(', ');
    userPrompt = `TASK: PHOTOREALISTIC OBJECT REPLACEMENT... Coords: ${clickPointsDescription}`;
    systemInstruction = "You are an AI specializing in precise object replacement...";
  }

  parts.push({ text: userPrompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview', 
      contents: { parts: parts }, 
      config: { systemInstruction: systemInstruction }
    });
    if (response.candidates && response.candidates[0].content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData?.data) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Gemini Advanced Edit Error:", error);
    throw error;
  }
};

export const detectSimilarObjects = async (
  sourceImageBase64: string,
  sourceImageMimeType: string,
  detectionPrompt: string,
): Promise<ClickPoint[]> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: {
        parts: [
          { inlineData: { mimeType: sourceImageMimeType, data: sourceImageBase64 } },
          { text: detectionPrompt }
        ]
      },
      config: {
        responseMimeType: "application/json", 
        responseSchema: { 
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER }
            },
            required: ["x", "y"]
          }
        },
        systemInstruction: "You are an expert object detection AI..."
      }
    });
    const jsonStr = response.text?.trim();
    if (!jsonStr) throw new Error("No JSON response.");
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Gemini Object Detection Error:", error);
    throw error;
  }
};

export const generateSketch = async (
  sourceImageBase64: string,
  sourceImageMimeType: string,
  style: SketchStyle,
  resolution: Resolution
): Promise<string> => {
  if (!process.env.API_KEY) throw new Error("API Key is missing.");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-2.5-flash-image';
  const finalPrompt = `Professional high-speed ${style} sketch conversion...`;
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { mimeType: sourceImageMimeType, data: sourceImageBase64 } },
          { text: finalPrompt }
        ]
      },
    });
    if (response.candidates && response.candidates[0].content?.parts) {
      for (const part of response.candidates[0].content.parts) {
         if (part.inlineData?.data) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No sketch/render generated.");
  } catch (error) {
    console.error("Gemini Sketch Generation Error:", error);
    throw error;
  }
};

// ... (existing getSupportedAspectRatio function) ...
const getSupportedAspectRatio = (width: number, height: number): "1:1" | "3:4" | "4:3" | "9:16" | "16:9" => {
  const ratio = width / height;
  if (ratio > 1.5) return "16:9"; 
  if (ratio > 1.0) return "4:3";
  if (ratio < 0.6) return "9:16";
  if (ratio < 1.0) return "3:4";
  return "1:1";
};

/**
 * --- GIAI ĐOẠN 1: Dựng Khung Sườn (Pass 1 - Structure) ---
 * Updated to support multiple variations
 */
export const generateIdeaStructure = async (
  sketchImage: FileData,
  referenceStyle: FileData | null,
  imageCount: number = 1,
  onStatusUpdate?: (status: string) => void
): Promise<string[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (onStatusUpdate) onStatusUpdate("Đang xây dựng khung sườn kiến trúc 3D...");

  const structurePrompt = `
    ROLE: Professional Event Constructor & 3D Visualizer.
    TASK: Convert this SKETCH (Input 1) into a photorealistic architectural base (Empty Room) following strict stage design rules.
    
    CRITICAL INSTRUCTIONS FOR STAGE 1 (STRUCTURE & COMPOSITION):
      
    1. CAMERA ANGLE (GÓC MÁY):
    - TYPE: **Dead-center Frontal Shot** (Góc chụp chính diện tuyệt đối).
    - PERSPECTIVE: **Elevation View** (Mặt đứng). The camera must be placed exactly on the center axis facing the stage flatly. No Dutch angles, no side angles.
    - SYMMETRY: Ensure perfect symmetry if the sketch implies it.

    2. COMPOSITION & PROPORTIONS (BỐ CỤC):
    - HORIZONTAL FILL: The stage design must occupy **85% of the image width**. Minimal negative space on sides (hoành tráng).
    - VERTICAL LAYOUT (STRICT):
      * **Bottom 20%**: Glossy Black Floor (Sàn đen bóng).
      * **Middle 70%**: The main Stage Structure (Frame, Walls, Decor foundations).
      * **Top 10%**: Ceiling/Background void (Starry curtain).
    
    3. MANDATORY ENVIRONMENT:
    - FLOOR: High-gloss black reflection floor.
    - BACKGROUND: Black velvet curtains with LED starlight effect.
    
    4. MATERIAL APPLICATION:
    - Apply the user's requested style (from Reference Image if provided) ONLY to the structural elements (arches, walls, catwalk) defined in the sketch.

    5. NEGATIVE INSTRUCTIONS:
    - Do NOT crop the sketch edges.
    - Do NOT add random furniture/props yet (wait for Phase 2).
    
    Output: Photorealistic 8k render of the architectural base.
  `;

  const parts: any[] = [
    { text: structurePrompt },
    { inlineData: { mimeType: sketchImage.mimeType, data: sketchImage.base64 } }
  ];

  if (referenceStyle) {
    parts.push({ inlineData: { mimeType: referenceStyle.mimeType, data: referenceStyle.base64 } });
  }

  try {
    const images: string[] = [];

    // Loop to generate multiple variations if needed
    for (let i = 0; i < imageCount; i++) {
        if (onStatusUpdate && imageCount > 1) onStatusUpdate(`Đang tạo khung sườn ${i + 1}/${imageCount}...`);
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
            contents: { parts: parts },
            config: {
                systemInstruction: "You are a specialized 3D Architectural Visualizer. Your goal is to create a realistic 'blank canvas' room based on a sketch."
            }
        });

        if (response.candidates && response.candidates.length > 0) {
            const content = response.candidates[0].content;
            if (content && content.parts) {
                for (const part of content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                    }
                }
            }
        }
    }

    if (images.length === 0) throw new Error("No structure image generated.");
    return images;
  } catch (error) {
    console.error("Gemini Idea Structure Error:", error);
    throw error;
  }
};

/**
 * --- GIAI ĐOẠN 2: Sắp Đặt Decor (Pass 2 - Decoration) ---
 * Updated to accept optional strict mode for background preservation.
 */
export const generateIdeaDecor = async (
  baseImageBase64: string, // Base image from Pass 1
  baseImageMimeType: string,
  assets: IdeaAsset[],
  imageCount: number, // New parameter
  onStatusUpdate?: (status: string) => void,
  isStrictBackgroundPreservation: boolean = false // NEW: Mode for strict overlay
): Promise<string[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  if (onStatusUpdate) onStatusUpdate("Đang phân tích và sắp đặt vật thể...");

  // Generate enhanced spatial instructions using the helper
  const spatialInstructions = generateSpatialInstructions(assets);

  let decorPrompt = "";
  let modelName = 'gemini-2.5-flash-image';

  if (isStrictBackgroundPreservation) {
    // === STRICT DECOR ONLY MODE ===
    modelName = 'gemini-3-pro-image-preview'; // High quality for blending
    decorPrompt = `
      ${DECOR_PLACEMENT_ONLY_PROMPT}
      ${spatialInstructions}
      
      DESCRIPTION OF ASSETS TO ADD:
      ${assets.map(a => `- ${a.label}`).join('\n')}
      
      The rest of the room (Architecture, Material, Light) is FIXED.
    `;
  } else {
    // === STANDARD MODE (Context Aware) ===
    decorPrompt = `
      ROLE: Professional Wedding Decorator.
      TASK: Composite specific decorative items into the provided BACKGROUND (Input 1).
      
      BACKGROUND: The first image is the architectural base. Keep its lighting and perspective exactly as is.
      
      SPATIAL & PERSPECTIVE INSTRUCTIONS:
      ${spatialInstructions}
      
      INSTRUCTIONS:
      1. Place the assets at the specified regions defined in the spatial instructions.
      2. BLENDING: Ensure the inserted objects cast realistic shadows on the floor/walls of the background. Match the color temperature and lighting direction of the background.
      3. SCALE: Scale the objects appropriately for the perspective at that depth and within the defined region.
      4. If an asset image is provided (subsequent inputs), use that exact design. If no image is provided for a label, generate a high-quality object matching the label description.
      
      Output: Final photorealistic event render.
    `;
  }

  const parts: any[] = [
    { text: decorPrompt },
    { inlineData: { mimeType: baseImageMimeType, data: baseImageBase64 } } // Background
  ];

  // Add asset images to the context
  assets.forEach((asset, index) => {
    if (asset.image) {
      parts.push({ 
        inlineData: { mimeType: asset.image.mimeType, data: asset.image.base64 } 
      });
      parts.push({ text: `[Reference Image for Asset #${index + 1}]` });
    }
  });

  if (onStatusUpdate) onStatusUpdate("Đang hoàn thiện bản phối cảnh cuối cùng...");

  try {
    const images: string[] = [];
    
    // Loop for multiple images
    for (let i = 0; i < imageCount; i++) {
        if (onStatusUpdate && imageCount > 1) onStatusUpdate(`Đang tạo phương án ${i + 1}/${imageCount}...`);
        
        const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts: parts },
            config: {
                systemInstruction: "You are an expert Image Compositor and Decorator. Seamlessly blend objects into a scene."
            }
        });

        if (response.candidates && response.candidates.length > 0) {
            const content = response.candidates[0].content;
            if (content && content.parts) {
                for (const part of content.parts) {
                    if (part.inlineData && part.inlineData.data) {
                        images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                    }
                }
            }
        }
    }

    if (images.length === 0) throw new Error("No decor image generated.");
    return images;

  } catch (error) {
    console.error("Gemini Idea Decor Error:", error);
    throw error;
  }
};

/**
 * Tạo bản vẽ 3D Axonometric từ ảnh chụp hiện trạng
 */
export const generateAxonometricView = async (
  imageBase64: string,
  mimeType: string,
  eventDescription: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    ROLE: Professional Architectural Visualizer & Event Designer.
    TASK: Convert the input photo (current state) into a "3D Isometric Axonometric Cutaway" architectural drawing.
    
    STRICT VISUAL RULES:
    1. VIEWPOINT: High-angle isometric view (approx 45 degrees), showing the room as a "cutaway box" floating in white space.
    2. STYLE: Clean, high-end architectural visualization with realistic lighting but diagrammatic clarity.
    3. TRANSFORMATION: Transform the empty/messy room into a fully decorated event venue based on the user's description.
    4. DETAILS: Show wall thickness (cut section in black or dark grey).
  `;

  const userPrompt = `
    Input Image: This is the current venue state.
    User Request: Decorate this space for an event: "${eventDescription}".
    
    OUTPUT REQUIREMENT:
    - Generate a 3D Axonometric view.
    - Flooring: High quality material.
    - Decor: Add tables, chairs, stage, and floral arrangements matching the description.
    - Lighting: Warm, cinematic event lighting.
    - Negative Prompt: 2D, flat photo, distorted perspective, messy, low resolution, blurry, text, watermark.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Generating image
      contents: {
        parts: [
          { text: userPrompt },
          { inlineData: { mimeType: mimeType, data: imageBase64 } }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
      }
    });

    if (response.candidates && response.candidates.length > 0) {
        const content = response.candidates[0].content;
        if (content && content.parts) {
            for (const part of content.parts) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
    }
    throw new Error("No image generated.");
  } catch (error) {
    console.error("Axonometric Gen Error:", error);
    throw error;
  }
};
