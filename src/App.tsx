import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, PencilBrush, Image as FabricImage } from 'fabric';
import { HexColorPicker } from 'react-colorful';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PaintBrushIcon,
  SwatchIcon,
  TrashIcon,
  PhotoIcon,
  CursorArrowRaysIcon,
  BackspaceIcon,
} from '@heroicons/react/24/outline';
import { gsap } from 'gsap';
import UploadModal from './components/UploadModal';

type Tool = 'brush' | 'select' | 'eraser';
type ActivePopupType = 'brush' | 'color' | 'eraser' | null;

interface ToolButtonProps {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

interface SizePopupProps {
  isOpen: boolean;
  onClose: () => void;
  size: number;
  onSizeChange: (size: number) => void;
  tool: Tool;
}

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSelectTool: (tool: Tool) => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({ isActive, onClick, children, style }) => (
  <button
    className={`btn-tool ${isActive ? 'active' : ''}`}
    onClick={onClick}
    style={style}
  >
    {children}
  </button>
);

const SizePopup: React.FC<SizePopupProps> = ({
  isOpen,
  onClose,
  size,
  onSizeChange,
  tool,
}) => {
  const handleSliderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSizeChange(Number(e.target.value));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="popup-container" onClick={(e) => e.stopPropagation()}>
          <motion.div
            className="size-popup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div 
              className="size-preview"
              style={{
                width: `${size}px`,
                height: `${size}px`,
              }}
            />
            <input
              type="range"
              min="1"
              max="50"
              value={size}
              onChange={handleSliderChange}
              onClick={handleSliderClick}
              className="size-slider"
            />
            <div className="size-value">{size}px</div>
            <div className="popup-arrow" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Add styles at the top of the file
const styles = `
  .context-menu {
    position: fixed;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    min-width: 200px;
    z-index: 1000;
  }

  .context-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    cursor: pointer;
    transition: background-color 0.2s;
    user-select: none;
  }

  .context-menu-item:hover {
    background-color: #f3f4f6;
  }

  .context-menu-item svg {
    width: 20px;
    height: 20px;
    color: #4b5563;
  }

  .size-popup-wrapper {
    position: relative;
  }

  .popup-container {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 8px;
    z-index: 40;
  }

  .size-popup {
    background: white;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    min-width: 240px;
  }

  .color-picker-wrapper {
    position: relative;
    z-index: 50;
  }

  .toolbar-container {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 30;
  }

  .toolbar {
    background: white;
    border-radius: 12px;
    padding: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .toolbar-content {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .upload-popup-wrapper {
    position: relative;
  }

  .upload-popup {
    background: white;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    min-width: 200px;
  }

  .popup-container {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 8px;
    z-index: 40;
  }

  .popup-arrow {
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%) rotate(45deg);
    width: 12px;
    height: 12px;
    background: white;
    border-right: 1px solid rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }
`;

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, onSelectTool }) => {
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <>
      <style>{styles}</style>
      <motion.div
        className="context-menu"
        style={{ left: x, top: y }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="context-menu-item"
          onClick={() => {
            onSelectTool('select');
            onClose();
          }}
        >
          <CursorArrowRaysIcon />
          <span>Selection Tool</span>
        </button>
      </motion.div>
    </>
  );
};

// Create a proper FabricVideo class that extends FabricImage
class FabricVideo extends FabricImage {
  videoElement: HTMLVideoElement | null;
  isPlaying: boolean;
  erasable?: boolean;
  private frameRequestId: number | null;
  private lastFrameTime: number;
  private tempCanvas: HTMLCanvasElement;
  private tempCtx: CanvasRenderingContext2D | null;

  constructor(element: HTMLImageElement) {
    super(element);
    this.videoElement = null;
    this.isPlaying = false;
    this.erasable = false;
    this.frameRequestId = null;
    this.lastFrameTime = 0;
    // Create persistent temp canvas for better performance
    this.tempCanvas = document.createElement('canvas');
    this.tempCtx = this.tempCanvas.getContext('2d', {
      willReadFrequently: true,
      alpha: false
    });
  }

  static async fromVideo(file: File): Promise<FabricVideo> {
    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video');
      videoElement.crossOrigin = 'anonymous';
      videoElement.muted = false;
      videoElement.src = URL.createObjectURL(file);
      videoElement.playsInline = true;
      videoElement.controls = false;

      videoElement.onloadedmetadata = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = videoElement.videoWidth;
        tempCanvas.height = videoElement.videoHeight;
        const ctx = tempCanvas.getContext('2d', {
          willReadFrequently: true,
          alpha: false
        });
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        videoElement.currentTime = 0;
        videoElement.onseeked = () => {
          ctx.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);
          const img = new Image();
          img.onload = () => {
            const fabricVideo = new FabricVideo(img);
            fabricVideo.videoElement = videoElement;
            if (fabricVideo.videoElement) {
              fabricVideo.videoElement.volume = 1.0;
            }
            // Initialize temp canvas dimensions
            fabricVideo.tempCanvas.width = videoElement.videoWidth;
            fabricVideo.tempCanvas.height = videoElement.videoHeight;
            resolve(fabricVideo);
          };
          img.src = tempCanvas.toDataURL();
        };
      };

      videoElement.onerror = () => {
        reject(new Error('Failed to load video'));
      };
    });
  }

  updateFrame(timestamp: number) {
    if (!this.videoElement || !this.isPlaying || !this.tempCtx) return;

    // Calculate time since last frame
    const elapsed = timestamp - this.lastFrameTime;
    const frameInterval = 1000 / 60; // Target 60fps

    // Only update if enough time has passed
    if (elapsed >= frameInterval) {
      this.lastFrameTime = timestamp;

      // Draw to temp canvas
      this.tempCtx.drawImage(this.videoElement, 0, 0, this.tempCanvas.width, this.tempCanvas.height);
      
      // Update fabric object
      const dataUrl = this.tempCanvas.toDataURL('image/jpeg', 1.0);
      const img = new Image();
      img.onload = () => {
        this._element = img;
        this.dirty = true;
        this.canvas?.requestRenderAll();
      };
      img.src = dataUrl;
    }

    // Request next frame
    if (this.isPlaying) {
      this.frameRequestId = requestAnimationFrame(this.updateFrame.bind(this));
    }
  }

  play() {
    if (this.videoElement && !this.isPlaying) {
      const playPromise = this.videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Error playing video:', error);
          if (error.name === 'NotAllowedError') {
            this.videoElement!.muted = true;
            this.videoElement!.play().catch(e => {
              console.error('Error playing muted video:', e);
            });
          }
        });
      }
      this.isPlaying = true;
      this.lastFrameTime = performance.now();
      this.frameRequestId = requestAnimationFrame(this.updateFrame.bind(this));
    }
  }

  pause() {
    if (this.videoElement && this.isPlaying) {
      this.videoElement.pause();
      this.isPlaying = false;
      if (this.frameRequestId !== null) {
        cancelAnimationFrame(this.frameRequestId);
        this.frameRequestId = null;
      }
    }
  }

  dispose() {
    if (this.videoElement) {
      this.pause();
      URL.revokeObjectURL(this.videoElement.src);
      this.videoElement = null;
    }
    if (this.frameRequestId !== null) {
      cancelAnimationFrame(this.frameRequestId);
      this.frameRequestId = null;
    }
    // Clean up temp canvas
    this.tempCtx = null;
    super.dispose();
  }

  setVolume(volume: number) {
    if (this.videoElement) {
      this.videoElement.volume = Math.max(0, Math.min(1, volume));
    }
  }

  mute() {
    if (this.videoElement) {
      this.videoElement.muted = true;
    }
  }

  unmute() {
    if (this.videoElement) {
      this.videoElement.muted = false;
    }
  }

  toggleMute() {
    if (this.videoElement) {
      this.videoElement.muted = !this.videoElement.muted;
    }
  }
}

// Add this function before the App component
const isColorLight = (color: string): boolean => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<Canvas | null>(null);
  const [color, setColor] = useState('#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePopup, setShowSizePopup] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [tool, setTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(5);
  const brushPopupRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [activePopup, setActivePopup] = useState<ActivePopupType>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const uploadButtonRef = useRef<HTMLDivElement>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null);

  const initCanvas = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      isDrawingMode: true,
      backgroundColor: '#FFFFFF',
      selection: true,
      preserveObjectStacking: true,
    });

    // Initialize brush
    const brush = new PencilBrush(canvas);
    brush.width = 5;
    brush.color = '#000000';
    (brush as any).globalCompositeOperation = 'source-over';
    canvas.freeDrawingBrush = brush;

    setFabricCanvas(canvas);
    return canvas;
  }, []);

  const createFabricImage = useCallback((img: HTMLImageElement) => {
    if (!fabricCanvas) return;

    try {
      const fabricImg = new FabricImage(img);
      
      // Set initial properties
      fabricImg.set({
        cornerStyle: 'circle',
        cornerColor: '#2196F3',
        borderColor: '#2196F3',
        cornerSize: 12,
        transparentCorners: false,
        padding: 8,
        borderScaleFactor: 1,
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        visible: true,
        opacity: 1,
        lockUniScaling: true,
        centeredScaling: true,
        noScaleCache: false,
        strokeUniform: true,
        lockScalingFlip: true,
        crossOrigin: 'anonymous',
        erasable: false
      });

      // Only show corner controls
      fabricImg.setControlsVisibility({
        mtr: false,
        ml: false,
        mr: false,
        mt: false,
        mb: false
      });

      // Scale image to fit within canvas while maintaining aspect ratio
      const maxWidth = fabricCanvas.width! * 0.8;
      const maxHeight = fabricCanvas.height! * 0.8;
      const scale = Math.min(
        maxWidth / fabricImg.width!,
        maxHeight / fabricImg.height!,
        1
      );

      fabricImg.scale(scale);

      // Center the image on the canvas
      fabricImg.set({
        left: (fabricCanvas.width! - fabricImg.width! * scale) / 2,
        top: (fabricCanvas.height! - fabricImg.height! * scale) / 2,
      });

      // Add to canvas with animation
      fabricImg.set('opacity', 0);
      fabricCanvas.add(fabricImg);
      fabricCanvas.setActiveObject(fabricImg);
      fabricCanvas.renderAll();
      
      // Fade in the image
      gsap.to(fabricImg, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
        onUpdate: () => fabricCanvas.renderAll()
      });
      
      setTool('select');
      fabricCanvas.isDrawingMode = false;
    } catch (err) {
      console.error('Error creating Fabric image:', err);
    }
  }, [fabricCanvas, setTool]);

  const createFabricVideo = useCallback(async (file: File) => {
    if (!fabricCanvas) return;

    try {
      const fabricVideo = await FabricVideo.fromVideo(file);

      // Set initial properties
      fabricVideo.set({
        cornerStyle: 'circle',
        cornerColor: '#2196F3',
        borderColor: '#2196F3',
        cornerSize: 12,
        transparentCorners: false,
        padding: 8,
        borderScaleFactor: 1,
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockUniScaling: true,
        centeredScaling: true,
        noScaleCache: false,
        strokeUniform: true,
        lockScalingFlip: true,
        opacity: 0,
        erasable: false
      });

      // Only show corner controls
      fabricVideo.setControlsVisibility({
        mtr: false,
        ml: false,
        mr: false,
        mt: false,
        mb: false
      });

      // Scale video to fit within canvas
      const maxWidth = fabricCanvas.width! * 0.8;
      const maxHeight = fabricCanvas.height! * 0.8;
      const scale = Math.min(
        maxWidth / fabricVideo.getScaledWidth(),
        maxHeight / fabricVideo.getScaledHeight(),
        1
      );

      fabricVideo.scale(scale);

      // Center the video
      fabricVideo.set({
        left: (fabricCanvas.width! - fabricVideo.getScaledWidth()) / 2,
        top: (fabricCanvas.height! - fabricVideo.getScaledHeight()) / 2
      });

      // Add double-click handler for play/pause
      fabricVideo.on('mousedblclick', () => {
        if (fabricVideo.isPlaying) {
          fabricVideo.pause();
        } else {
          fabricVideo.play();
        }
      });

      // Add to canvas with animation
      fabricCanvas.add(fabricVideo);
      fabricCanvas.setActiveObject(fabricVideo);
      
      // Fade in the video
      gsap.to(fabricVideo, {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
        onUpdate: () => fabricCanvas.renderAll()
      });

      setTool('select');
      fabricCanvas.isDrawingMode = false;

    } catch (err) {
      console.error('Error creating fabric video:', err);
    }
  }, [fabricCanvas, setTool]);

  const handleImageUpload = useCallback((file: File) => {
    if (!fabricCanvas) {
      console.error('Canvas not initialized');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== 'string') {
        console.error('Invalid file data');
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          // Create a temporary canvas to resize the image if needed
          const MAX_DIMENSION = 4096; // Maximum dimension to prevent performance issues
          const MIN_DIMENSION = 1; // Minimum dimension for valid images
          let width = img.width;
          let height = img.height;

          // Validate image dimensions
          if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
            console.error('Image dimensions too small');
            return;
          }
          
          // Scale down the image if it's too large
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const ctx = tempCanvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) {
              console.error('Failed to get 2D context');
              return;
            }
            
            // Use better image scaling quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            try {
              ctx.drawImage(img, 0, 0, width, height);
              
              // Convert to blob to free memory
              tempCanvas.toBlob((blob) => {
                if (!blob) {
                  console.error('Failed to create blob');
                  return;
                }
                
                const url = URL.createObjectURL(blob);
                const newImg = new Image();
                newImg.crossOrigin = 'anonymous';
                
                newImg.onload = () => {
                  try {
                    createFabricImage(newImg);
                  } catch (err) {
                    console.error('Error creating fabric image:', err);
                  } finally {
                    URL.revokeObjectURL(url);
                  }
                };
                
                newImg.onerror = () => {
                  console.error('Failed to load processed image');
                  URL.revokeObjectURL(url);
                };

                newImg.src = url;
              }, file.type, 0.9);
            } catch (err) {
              console.error('Error drawing image to canvas:', err);
            }
            
            return;
          }

          createFabricImage(img);
        } catch (err) {
          console.error('Error processing image:', err);
        }
      };
      
      img.onerror = () => {
        console.error('Failed to load original image');
      };

      img.src = result;
    };

    reader.onerror = () => {
      console.error('Error reading file');
    };

    try {
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error starting file read:', err);
    }
  }, [fabricCanvas, createFabricImage]);

  const handleFileUpload = useCallback((file: File) => {
    if (!fabricCanvas) {
      console.error('Canvas not initialized');
      return;
    }

    if (file.type.startsWith('video/')) {
      createFabricVideo(file);
    } else if (file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  }, [fabricCanvas, createFabricVideo, handleImageUpload]);

  useEffect(() => {
    const canvas = initCanvas();
    if (!canvas) return;

    const handleResize = () => {
      canvas.setWidth(window.innerWidth);
      canvas.setHeight(window.innerHeight);
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, [initCanvas]);

  useEffect(() => {
    if (!fabricCanvas) return;

    const brush = fabricCanvas.freeDrawingBrush;
    if (!brush) return;

    // Configure brush based on tool
    if (tool === 'eraser') {
      brush.color = '#FFFFFF';
      brush.width = brushSize;
      (brush as any).globalCompositeOperation = 'destination-out';
    } else {
      brush.color = color;
      brush.width = brushSize;
      (brush as any).globalCompositeOperation = 'source-over';
    }

    // Set drawing mode
    fabricCanvas.isDrawingMode = tool === 'brush' || tool === 'eraser';
    fabricCanvas.selection = tool === 'select';

    // Update objects' interaction state
    fabricCanvas.getObjects().forEach((obj) => {
      obj.selectable = tool === 'select';
      obj.evented = tool === 'select';
    });

    // Handle path creation and cursor position
    const handlePathCreated = (e: any) => {
      if (!e.path) return;

      const path = e.path;
      if (tool === 'eraser') {
        path.set({
          stroke: '#FFFFFF',
          strokeWidth: brushSize,
          globalCompositeOperation: 'destination-out',
          selectable: false,
          evented: false,
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
          fill: null
        });

        // Get all objects and sort them so media stays on top
        const objects = fabricCanvas.getObjects();
        const mediaObjects = objects.filter(obj => 
          obj instanceof FabricImage || obj instanceof FabricVideo
        );
        const otherObjects = objects.filter(obj => 
          !(obj instanceof FabricImage) && !(obj instanceof FabricVideo)
        );

        // Clear canvas objects
        fabricCanvas.clear();

        // Add back in correct order: eraser paths at bottom, media on top
        otherObjects.forEach(obj => fabricCanvas.add(obj));
        mediaObjects.forEach(obj => fabricCanvas.add(obj));
      } else {
        path.set({
          stroke: color,
          strokeWidth: brushSize,
          globalCompositeOperation: 'source-over',
          selectable: false,
          evented: false,
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
          fill: null
        });
      }

      fabricCanvas.renderAll();
    };

    const handleMouseMove = (e: any) => {
      const pointer = fabricCanvas.getPointer(e.e);
      setCursorPosition({ x: pointer.x, y: pointer.y });
    };

    fabricCanvas.on('path:created', handlePathCreated);
    fabricCanvas.on('mouse:move', handleMouseMove);

    return () => {
      fabricCanvas.off('path:created', handlePathCreated);
      fabricCanvas.off('mouse:move', handleMouseMove);
    };
  }, [fabricCanvas, tool, color, brushSize]);

  useEffect(() => {
    if (!fabricCanvas) return;

    const handleMouseDown = (options: { e: MouseEvent | TouchEvent; pointer: { x: number; y: number } }) => {
      const target = fabricCanvas.findTarget(options.e as any);
      
      if (tool === 'brush') {
        fabricCanvas.isDrawingMode = true;
        fabricCanvas.selection = false;
        fabricCanvas.discardActiveObject();
        fabricCanvas.renderAll();
      } else if (target instanceof FabricImage && tool === 'select') {
        fabricCanvas.setActiveObject(target);
        target.set({
          hasControls: true,
          hasBorders: true,
          hoverCursor: 'move',
          lockMovementX: false,
          lockMovementY: false
        });
        fabricCanvas.isDrawingMode = false;
        fabricCanvas.renderAll();
      }
    };

    const handleSelectionCleared = () => {
      if (tool === 'brush') {
        fabricCanvas.isDrawingMode = true;
        fabricCanvas.selection = false;
        fabricCanvas.forEachObject((obj) => {
          if (obj instanceof FabricImage) {
            obj.selectable = false;
            obj.evented = false;
            obj.hoverCursor = 'crosshair';
          }
        });
      }
      fabricCanvas.renderAll();
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('selection:cleared', handleSelectionCleared);

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('selection:cleared', handleSelectionCleared);
    };
  }, [fabricCanvas, tool]);

  useEffect(() => {
    if (fabricCanvas) {
      fabricCanvas.selection = tool === 'select';
      fabricCanvas.defaultCursor = tool === 'select' ? 'default' : 'crosshair';
      fabricCanvas.hoverCursor = tool === 'select' ? 'move' : 'crosshair';
      
      // Update all objects' selection style
      fabricCanvas.getObjects().forEach(obj => {
        // Only allow selection of images and videos
        const isSelectableObject = obj instanceof FabricImage || obj instanceof FabricVideo;
        const isSelectTool = tool === 'select';
        
        obj.set({
          selectable: isSelectTool && isSelectableObject,
          evented: isSelectTool && isSelectableObject,
          hasControls: isSelectTool && isSelectableObject,
          hasBorders: isSelectTool && isSelectableObject,
          hoverCursor: isSelectTool && isSelectableObject ? 'move' : 'crosshair',
          visible: true,
          opacity: 1,
        });

        if (isSelectTool && isSelectableObject) {
          obj.setControlsVisibility({
            mtr: false,
            ml: false,
            mr: false,
            mt: false,
            mb: false
          });
        }
      });
      
      // Clear selection if switching to drawing tools
      if (tool === 'brush') {
        fabricCanvas.discardActiveObject();
      }
      
      fabricCanvas.renderAll();
    }
  }, [tool, fabricCanvas]);

  const clearCanvas = useCallback(() => {
    if (fabricCanvas) {
      // Store media objects to preserve them
      const mediaObjects = fabricCanvas.getObjects().filter(obj => 
        obj instanceof FabricImage || obj instanceof FabricVideo
      );

      // Properly dispose of video elements
      fabricCanvas.getObjects().forEach(obj => {
        if (obj instanceof FabricVideo) {
          obj.dispose(); // This will stop video playback and clean up resources
        }
      });

      // Create a snapshot for fade-out animation
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = fabricCanvas.width!;
      tempCanvas.height = fabricCanvas.height!;
      const tempCtx = tempCanvas.getContext('2d', {
        willReadFrequently: true,
        alpha: true
      })!;
      
      // Draw current canvas state to temp canvas
      const dataUrl = fabricCanvas.toDataURL({
        format: 'png',
        quality: 0.8,
        multiplier: 1
      });
      
      const img = new Image();
      img.onload = () => {
        tempCtx.drawImage(img, 0, 0);
        
        // Position the temp canvas
        tempCanvas.style.position = 'fixed';
        tempCanvas.style.top = '0';
        tempCanvas.style.left = '0';
        tempCanvas.style.zIndex = '30';
        tempCanvas.style.pointerEvents = 'none';
        document.body.appendChild(tempCanvas);
        
        // Animate and clear
        gsap.to(tempCanvas, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out',
          onComplete: () => {
            document.body.removeChild(tempCanvas);
            URL.revokeObjectURL(img.src);
          }
        });
        
        // Clear the canvas and restore media objects
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = '#FFFFFF';
        
        // Add back media objects
        mediaObjects.forEach(obj => {
          fabricCanvas.add(obj);
        });
        
        fabricCanvas.requestRenderAll();
      };
      
      img.src = dataUrl;
    }
  }, [fabricCanvas]);

  // Add a new effect for canvas performance optimization
  useEffect(() => {
    if (!fabricCanvas) return;

    // Optimize canvas rendering
    fabricCanvas.set({
      enableRetinaScaling: true,
      renderOnAddRemove: false,
      skipTargetFind: false,
      stopContextMenu: true
    });

    // Batch rendering for better performance
    let renderTimeout: NodeJS.Timeout;
    const debouncedRender = () => {
      clearTimeout(renderTimeout);
      renderTimeout = setTimeout(() => {
        fabricCanvas.renderAll();
      }, 5);
    };

    fabricCanvas.on('object:modified', debouncedRender);
    fabricCanvas.on('object:added', debouncedRender);
    fabricCanvas.on('object:removed', debouncedRender);

    // Optimize path rendering
    if (fabricCanvas.freeDrawingBrush) {
      const brush = fabricCanvas.freeDrawingBrush;
      // Set properties directly instead of using set method
      (brush as any).decimate = 2; // Reduce number of points in paths
      brush.strokeLineCap = 'round';
      brush.strokeLineJoin = 'round';
    }

    return () => {
      clearTimeout(renderTimeout);
      fabricCanvas.off('object:modified', debouncedRender);
      fabricCanvas.off('object:added', debouncedRender);
      fabricCanvas.off('object:removed', debouncedRender);
    };
  }, [fabricCanvas]);

  // Add memory cleanup on component unmount
  useEffect(() => {
    return () => {
      if (fabricCanvas) {
        // Cleanup all video elements
        fabricCanvas.getObjects().forEach(obj => {
          if (obj instanceof FabricVideo) {
            obj.dispose();
          }
        });
        
        // Clear canvas and dispose
        fabricCanvas.clear();
        fabricCanvas.dispose();
      }
    };
  }, [fabricCanvas]);

  // Close popups when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking inside the popups
      if (
        brushPopupRef.current?.contains(target) ||
        colorPickerRef.current?.contains(target)
      ) {
        return;
      }

      // Don't close if clicking the range input or its thumb
      if (target.closest('input[type="range"]')) {
        return;
      }

      setActivePopup(null);
      setShowSizePopup(false);
      setShowColorPicker(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const canvasElement = fabricCanvas.getElement();
    canvasElement.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvasElement.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [fabricCanvas]);

  useEffect(() => {
    if (!cursorCanvasRef.current) return;
    
    const cursorCanvas = cursorCanvasRef.current;
    const ctx = cursorCanvas.getContext('2d');
    if (!ctx) return;

    // Match cursor canvas size to window
    cursorCanvas.width = window.innerWidth;
    cursorCanvas.height = window.innerHeight;

    // Handle resize
    const handleResize = () => {
      cursorCanvas.width = window.innerWidth;
      cursorCanvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!cursorCanvasRef.current || !cursorPosition) return;
    
    const cursorCanvas = cursorCanvasRef.current;
    const ctx = cursorCanvas.getContext('2d');
    if (!ctx) return;

    // Clear previous cursor
    ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

    // Only show cursor for brush or eraser
    if ((tool === 'brush' || tool === 'eraser') && cursorPosition) {
      // Draw outer circle (stroke)
      ctx.beginPath();
      ctx.arc(
        cursorPosition.x,
        cursorPosition.y,
        brushSize / 2,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = tool === 'eraser' ? '#000000' : color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw inner circle (fill)
      ctx.beginPath();
      ctx.arc(
        cursorPosition.x,
        cursorPosition.y,
        brushSize / 2,
        0,
        Math.PI * 2
      );
      // For eraser, use a different fill style to make it visible
      ctx.fillStyle = tool === 'eraser' ? 'rgba(255, 255, 255, 0.2)' : `${color}33`;
      ctx.fill();

      // Draw center dot
      ctx.beginPath();
      ctx.arc(
        cursorPosition.x,
        cursorPosition.y,
        1,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = tool === 'eraser' ? '#000000' : color;
      ctx.fill();

      // For eraser, add a cross in the center
      if (tool === 'eraser') {
        const crossSize = 4;
        ctx.beginPath();
        ctx.moveTo(cursorPosition.x - crossSize, cursorPosition.y);
        ctx.lineTo(cursorPosition.x + crossSize, cursorPosition.y);
        ctx.moveTo(cursorPosition.x, cursorPosition.y - crossSize);
        ctx.lineTo(cursorPosition.x, cursorPosition.y + crossSize);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }, [cursorPosition, brushSize, tool, color]);

  const handleToolChange = useCallback((newTool: Tool) => {
    if (newTool === tool) return;
    
    setTool(newTool);
    if (fabricCanvas) {
      // Update canvas mode
      fabricCanvas.isDrawingMode = newTool === 'brush' || newTool === 'eraser';
      fabricCanvas.selection = newTool === 'select';

      // Configure brush if in drawing mode
      if (fabricCanvas.freeDrawingBrush) {
        const brush = fabricCanvas.freeDrawingBrush;
        if (newTool === 'eraser') {
          brush.color = fabricCanvas.backgroundColor as string;
          (brush as any).globalCompositeOperation = 'destination-out';
        } else {
          brush.color = color;
          (brush as any).globalCompositeOperation = 'source-over';
        }
        brush.width = brushSize;
      }

      // Update object properties
      fabricCanvas.getObjects().forEach(obj => {
        if (obj instanceof FabricImage) {
          const isSelected = fabricCanvas?.getActiveObject() === obj;
          obj.set({
            selectable: newTool === 'select',
            evented: newTool === 'select',
            hasControls: isSelected && newTool === 'select',
            hasBorders: isSelected && newTool === 'select',
            hoverCursor: newTool === 'select' ? (isSelected ? 'move' : 'default') : 'crosshair',
          });
        }
      });

      fabricCanvas.renderAll();
    }
  }, [fabricCanvas, color, brushSize, tool]);

  return (
    <div className="min-h-screen bg-gray-100 overflow-hidden">
      <canvas ref={canvasRef} className="touch-none" />
      <canvas 
        ref={cursorCanvasRef}
        className="fixed inset-0 pointer-events-none z-40"
        style={{
          display: (tool === 'brush' || tool === 'eraser') ? 'block' : 'none'
        }}
      />
      
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onSelectTool={handleToolChange}
          />
        )}
      </AnimatePresence>

      <div className="toolbar-container">
        <div className="toolbar">
          <div className="toolbar-content">
            <div className="size-popup-wrapper" ref={brushPopupRef}>
              <ToolButton
                isActive={tool === 'brush'}
                onClick={() => {
                  handleToolChange('brush');
                  setActivePopup('brush');
                  setShowSizePopup(true);
                  setShowColorPicker(false);
                }}
              >
                <PaintBrushIcon className="w-6 h-6" />
              </ToolButton>
              <SizePopup
                isOpen={showSizePopup && activePopup === 'brush'}
                onClose={() => {
                  setShowSizePopup(false);
                  setActivePopup(null);
                }}
                size={brushSize}
                onSizeChange={setBrushSize}
                tool={tool}
              />
            </div>

            <div className="size-popup-wrapper">
              <ToolButton
                isActive={tool === 'eraser'}
                onClick={() => {
                  handleToolChange('eraser');
                  setActivePopup('eraser');
                  setShowSizePopup(true);
                  setShowColorPicker(false);
                }}
              >
                <BackspaceIcon className="w-6 h-6" />
              </ToolButton>
              <SizePopup
                isOpen={showSizePopup && activePopup === 'eraser'}
                onClose={() => {
                  setShowSizePopup(false);
                  setActivePopup(null);
                }}
                size={brushSize}
                onSizeChange={setBrushSize}
                tool={tool}
              />
            </div>

            <div className="color-picker-wrapper" ref={colorPickerRef}>
              <ToolButton
                isActive={showColorPicker}
                onClick={() => {
                  setShowColorPicker(!showColorPicker);
                  setShowSizePopup(false);
                  setActivePopup('color');
                }}
                style={{ 
                  backgroundColor: color,
                  color: isColorLight(color) ? '#000000' : '#FFFFFF'
                }}
              >
                <SwatchIcon className="w-6 h-6" />
              </ToolButton>
              {showColorPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full mb-2 shadow-lg rounded-lg overflow-hidden"
                >
                  <HexColorPicker color={color} onChange={setColor} />
                </motion.div>
              )}
            </div>

            <div className="upload-wrapper" ref={uploadButtonRef}>
              <ToolButton
                isActive={false}
                onClick={() => setShowUploadModal(true)}
              >
                <PhotoIcon className="w-6 h-6" />
              </ToolButton>
            </div>

            <ToolButton
              isActive={false}
              onClick={clearCanvas}
            >
              <TrashIcon className="w-6 h-6" />
            </ToolButton>

            <ToolButton
              isActive={tool === 'select'}
              onClick={() => handleToolChange('select')}
            >
              <CursorArrowRaysIcon className="w-6 h-6" />
            </ToolButton>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showUploadModal && (
          <UploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onUpload={handleFileUpload}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
