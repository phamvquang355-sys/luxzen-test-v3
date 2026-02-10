
export interface FileData {
  base64: string;
  mimeType: string;
  file?: File;
  objectURL?: string;
  width?: number; // New: width of the image
  height?: number; // New: height of the image
}

export interface OptionItem {
  value: string;
  label: string;
  description?: string;
}

// New Idea Generator Types
export interface IdeaAsset {
  id: string;
  x: number; // Percentage coordinate 0-100 (Top-Left)
  y: number; // Percentage coordinate 0-100 (Top-Left)
  width: number; // Percentage width 0-100
  height: number; // Percentage height 0-100
  rotation: number; // Degrees 0-360
  aspectRatio: number; // width / height ratio of the asset image
  image: FileData | null;
  label: string;
}

export interface RenderOptions {
  category: string;
  style: string;
  colorPalette: string;
  surfaceMaterial: string; // New: specific surface material
  textileMaterial: string; // New: specific textile material
  textileColor1: string; // New: primary textile color
  textileColor2: string; // New: secondary textile color
  additionalPrompt: string;
  hiddenAIContext?: string; // New: Hidden AI analysis context
  isAutoFocus: boolean; // New: AI Photography Auto-Focus
  cameraPreset: string; // New: Photography Lens Preset Key
  assets?: IdeaAsset[]; // New: List of spatial assets
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export enum Tool {
  RENDER = 'render',
  EVENT_AXONOMETRIC = 'event_axonometric', // New Tool
  IDEA_GENERATOR = 'idea_generator',
  UPSCALE = 'upscale',
  ADVANCED_EDIT = 'advanced_edit',
  SKETCH_CONVERTER = 'sketch_converter'
}

export type Resolution = '1K' | '2K' | '4K';

export interface UpscaleState {
  sourceImage: FileData | null;
  isLoading: boolean;
  error: string | null;
  upscaledImages: string[];
  resolution: Resolution;
}

export interface UpscaleProps {
  state: UpscaleState;
  onStateChange: (newState: Partial<UpscaleState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
  onReset: () => void;
}

// New AdvancedEdit state and props
export type EditMode = 'NOTE' | 'SWAP';

export interface ClickPoint {
  x: number;
  y: number;
}

export interface AdvancedEditState {
  sourceImage: FileData | null;
  editMode: EditMode;
  refObject: FileData | null; // For SWAP mode
  annotatedBase64: string | null; // For NOTE mode (base64 of image with annotations)
  clickPoint: ClickPoint | null; // For SWAP mode (single point reference for detection/swap)
  detectedPoints: ClickPoint[]; // New: List of automatically detected similar objects
  resultImage: string | null; // AI generated result
  isLoading: boolean;
  error: string | null;
  isAnnotating: boolean; // Controls whether AnnotationCanvas is visible
  additionalPrompt?: string; // New: Optional user text prompt for edits
}

export interface AdvancedEditProps {
  state: AdvancedEditState;
  onStateChange: (newState: Partial<AdvancedEditState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
  onReset: () => void;
}

// New Sketch Converter types
export type SketchStyle = 'pencil' | 'charcoal' | 'watercolor' | 'architectural';

export interface SketchConverterState {
  sourceImage: FileData | null;
  resultImage: string | null;
  isLoading: boolean;
  error: string | null;
  sketchStyle: SketchStyle;
  resolution: Resolution;
}

export interface SketchConverterProps {
  state: SketchConverterState;
  onStateChange: (newState: Partial<SketchConverterState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
  onReset: () => void;
}

export type IdeaStep = 'UPLOAD' | 'STRUCTURE_RESULT' | 'DECOR_SETUP' | 'FINAL_RESULT';

export interface IdeaGeneratorState {
  sourceSketch: FileData | null;
  referenceStyle: FileData | null; // New: Reference image for materials
  baseImage: string | null; // New: Result of Pass 1 (Structure)
  assets: IdeaAsset[];
  isLoading: boolean;
  error: string | null;
  resultImages: string[]; // Updated: Array of results
  currentStep: IdeaStep;
}

export interface IdeaGeneratorProps {
  state: IdeaGeneratorState;
  onStateChange: (newState: Partial<IdeaGeneratorState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
  onReset: () => void;
}

// NEW: Event Axonometric Types
export interface EventAxonometricState {
  sourceImage: FileData | null;
  eventDescription: string; // Mô tả sự kiện (VD: "Tiệc cưới tone trắng hồng")
  resultImage: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface EventAxonometricProps {
  state: EventAxonometricState;
  onStateChange: (newState: Partial<EventAxonometricState>) => void;
  userCredits: number;
  onDeductCredits?: (cost: number, description: string) => Promise<void>;
  onReset: () => void;
}


// Annotation Types for AnnotationCanvas
export type AnnotationTool = 'brush' | 'arrow' | 'text';

export interface StrokeAnnotation {
  type: 'brush';
  points: { x: number; y: number }[];
  color: string;
  lineWidth: number;
}

export interface ArrowAnnotation {
  type: 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  lineWidth: number;
}

export interface TextAnnotation {
  type: 'text';
  x: number;
  y: number;
  content: string;
  color: string;
  fontSize: number;
  fontFamily: string;
}

export type Annotation = StrokeAnnotation | ArrowAnnotation | TextAnnotation;
