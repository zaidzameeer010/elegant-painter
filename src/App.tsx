import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, PencilBrush, Image as FabricImage } from 'fabric';
import { HexColorPicker } from 'react-colorful';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PaintBrushIcon,
  BackspaceIcon as EraserIcon,
  SwatchIcon,
  TrashIcon,
  PhotoIcon,
  CursorArrowRaysIcon,
} from '@heroicons/react/24/outline';
import { gsap } from 'gsap';
import UploadModal from './components/UploadModal';

type Tool = 'brush' | 'eraser' | 'select';

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

  constructor(element: HTMLImageElement) {
    super(element);
    this.videoElement = null;
    this.isPlaying = false;
  }

  static async fromVideo(file: File): Promise<FabricVideo> {
    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video');
      videoElement.crossOrigin = 'anonymous';
      videoElement.muted = true;
      videoElement.src = URL.createObjectURL(file);

      videoElement.onloadedmetadata = () => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = videoElement.videoWidth;
        tempCanvas.height = videoElement.videoHeight;
        const ctx = tempCanvas.getContext('2d');
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

  play() {
    if (this.videoElement && !this.isPlaying) {
      this.videoElement.play();
      this.isPlaying = true;
    }
  }

  pause() {
    if (this.videoElement && this.isPlaying) {
      this.videoElement.pause();
      this.isPlaying = false;
    }
  }

  updateFrame() {
    if (this.videoElement && this.isPlaying) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.videoElement.videoWidth;
      tempCanvas.height = this.videoElement.videoHeight;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(this.videoElement, 0, 0, tempCanvas.width, tempCanvas.height);
        const img = new Image();
        img.onload = () => {
          this._element = img;
          this.dirty = true;
        };
        img.src = tempCanvas.toDataURL();
      }
    }
  }

  dispose() {
    if (this.videoElement) {
      this.pause();
      URL.revokeObjectURL(this.videoElement.src);
      this.videoElement = null;
    }
    super.dispose();
  }
}

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
  const eraserPopupRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [activePopup, setActivePopup] = useState<'brush' | 'eraser' | 'color' | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const uploadButtonRef = useRef<HTMLDivElement>(null);

  const initCanvas = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight - 100,
      isDrawingMode: true,
      backgroundColor: '#F3F4F6',
      selection: true,
      preserveObjectStacking: true,
    });

    canvas.freeDrawingBrush = new PencilBrush(canvas);
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
        crossOrigin: 'anonymous'
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
        opacity: 0
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

      // Update video frames
      const updateVideoFrame = () => {
        if (fabricVideo.isPlaying) {
          fabricVideo.updateFrame();
          fabricCanvas.renderAll();
          requestAnimationFrame(updateVideoFrame);
        }
      };

      if (fabricVideo.videoElement) {
        fabricVideo.videoElement.addEventListener('play', () => {
          updateVideoFrame();
        });
      }

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
      canvas.setHeight(window.innerHeight - 100);
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

    const updateObjectProperties = () => {
      const objects = fabricCanvas.getObjects();
      const isSelectTool = tool === 'select';
      
      objects.forEach(obj => {
        if (obj instanceof FabricImage) {
          obj.set({
            hasControls: isSelectTool,
            hasBorders: isSelectTool,
            selectable: isSelectTool,
            evented: isSelectTool,
            hoverCursor: isSelectTool ? 'move' : 'crosshair'
          });
        }
      });
      fabricCanvas.renderAll();
    };

    // Update object properties when tool changes
    updateObjectProperties();

    // Handle selection events
    fabricCanvas.on('selection:created', (e) => {
      const selectedObject = e.selected?.[0];
      if (selectedObject && selectedObject instanceof FabricImage) {
        setTool('select');
      }
    });

    fabricCanvas.on('selection:updated', (e) => {
      const selectedObject = e.selected?.[0];
      if (selectedObject && selectedObject instanceof FabricImage) {
        setTool('select');
      }
    });

    fabricCanvas.on('selection:cleared', () => {
      // Don't change the tool here, just update object properties based on current tool
      updateObjectProperties();
    });

    return () => {
      fabricCanvas.off('selection:created');
      fabricCanvas.off('selection:updated');
      fabricCanvas.off('selection:cleared');
    };
  }, [fabricCanvas, tool]);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = tool === 'brush' || tool === 'eraser';
    
    // Initialize freeDrawingBrush if it doesn't exist
    if (!fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush = new PencilBrush(fabricCanvas);
    }
    
    // Configure brush properties
    const brush = fabricCanvas.freeDrawingBrush;
    if (brush) {
      if (tool === 'brush') {
        brush.color = color;
        brush.width = brushSize;
      } else if (tool === 'eraser') {
        brush.color = '#F3F4F6'; // background color
        brush.width = brushSize;
      }
    }

    // Configure canvas and object properties
    fabricCanvas.getObjects().forEach(obj => {
      if (obj instanceof FabricImage) {
        const isSelected = fabricCanvas?.getActiveObject() === obj;
        obj.set({
          selectable: tool === 'select',
          evented: tool === 'select',
          hasControls: isSelected && tool === 'select',
          hasBorders: isSelected && tool === 'select',
          hoverCursor: tool === 'select' ? 'move' : 'default',
          lockMovementX: tool !== 'select',
          lockMovementY: tool !== 'select',
          perPixelTargetFind: true,
          lockScalingFlip: true,
          crossOrigin: 'anonymous'
        });
      } else {
        // For non-image objects (like brush strokes)
        obj.set({
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          hoverCursor: 'default',
          lockMovementX: true,
          lockMovementY: true
        });
      }
    });

    // Prevent eraser from affecting images
    fabricCanvas.on('path:created', (e: any) => {
      if (tool === 'eraser') {
        const path = e.path;
        path.set({
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false
        });
        
        const objects = fabricCanvas.getObjects();
        
        // Move eraser path to the bottom (index 0)
        const currentIndex = objects.indexOf(path);
        if (currentIndex > 0) {
          objects.splice(currentIndex, 1);
          objects.unshift(path);
          fabricCanvas._objects = objects;
        }
        
        // Move all images to the top
        const images = objects.filter(obj => obj instanceof FabricImage);
        images.forEach(img => {
          const imgIndex = objects.indexOf(img);
          if (imgIndex < objects.length - 1) {
            objects.splice(imgIndex, 1);
            objects.push(img);
          }
        });
        
        fabricCanvas._objects = objects;
        fabricCanvas.renderAll();
      } else {
        // For brush strokes
        const path = e.path;
        path.set({
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          hoverCursor: 'default',
          lockMovementX: true,
          lockMovementY: true
        });
      }
    });
    
    fabricCanvas.renderAll();

    return () => {
      fabricCanvas.off('path:created');
    };
  }, [fabricCanvas, tool, color, brushSize]);

  useEffect(() => {
    if (!fabricCanvas) return;

    const handleMouseDown = (options: { e: MouseEvent | TouchEvent; pointer: { x: number; y: number } }) => {
      const target = fabricCanvas.findTarget(options.e as any);
      
      if (target instanceof FabricImage && tool === 'select') {
        // Clicked on an image while in select mode
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
      } else {
        // Clicked outside image or not in select mode
        if (tool === 'brush' || tool === 'eraser') {
          fabricCanvas.discardActiveObject();
          fabricCanvas.isDrawingMode = true;
          fabricCanvas.renderAll();
        }
      }
    };

    const handleSelectionCleared = () => {
      fabricCanvas.getObjects().forEach(obj => {
        if (obj instanceof FabricImage) {
          obj.set({
            hasControls: false,
            hasBorders: false,
            hoverCursor: tool === 'select' ? 'move' : 'default',
            lockMovementX: tool !== 'select',
            lockMovementY: tool !== 'select'
          });
        }
      });
      
      if (tool === 'brush' || tool === 'eraser') {
        fabricCanvas.isDrawingMode = true;
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
        if (obj instanceof FabricImage) {
          const isSelectTool = tool === 'select';
          obj.set({
            selectable: isSelectTool,
            evented: isSelectTool,
            hasControls: isSelectTool,
            hasBorders: isSelectTool,
            hoverCursor: isSelectTool ? 'move' : 'crosshair',
            visible: true,
            opacity: 1,
          });

          if (isSelectTool) {
            obj.setControlsVisibility({
              mtr: false,
              ml: false,
              mr: false,
              mt: false,
              mb: false
            });
          }
        }
      });
      
      // Clear selection if switching to drawing tools
      if (tool === 'brush' || tool === 'eraser') {
        fabricCanvas.discardActiveObject();
      }
      
      fabricCanvas.renderAll();
    }
  }, [tool, fabricCanvas]);

  const clearCanvas = useCallback(() => {
    if (fabricCanvas) {
      // Create a snapshot of current canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = fabricCanvas.width!;
      tempCanvas.height = fabricCanvas.height!;
      const tempCtx = tempCanvas.getContext('2d')!;
      
      // Draw current canvas state to temp canvas
      const dataUrl = fabricCanvas.toDataURL();
      const img = new Image();
      img.onload = () => {
        tempCtx.drawImage(img, 0, 0);
        
        // Position the temp canvas over the fabric canvas
        tempCanvas.style.position = 'absolute';
        tempCanvas.style.top = canvasRef.current?.offsetTop + 'px';
        tempCanvas.style.left = canvasRef.current?.offsetLeft + 'px';
        tempCanvas.style.zIndex = '1000';
        document.body.appendChild(tempCanvas);
        
        // Animate and clear
        gsap.to(tempCanvas, {
          opacity: 0,
          duration: 0.5,
          onComplete: () => {
            document.body.removeChild(tempCanvas);
          }
        });
        
        // Clear the actual canvas
        fabricCanvas.clear();
        fabricCanvas.backgroundColor = '#F3F4F6';
        fabricCanvas.renderAll();
      };
      img.src = dataUrl;
    }
  }, [fabricCanvas]);

  const handleToolChange = useCallback((newTool: Tool) => {
    if (newTool === tool) return;
    
    setTool(newTool);
    if (fabricCanvas) {
      const activeObject = fabricCanvas.getActiveObject();
      
      if (newTool === 'brush' || newTool === 'eraser') {
        if (!activeObject) {
          fabricCanvas.isDrawingMode = true;
        }
        if (fabricCanvas.freeDrawingBrush) {
          fabricCanvas.freeDrawingBrush.color = newTool === 'eraser' ? '#F3F4F6' : color;
          fabricCanvas.freeDrawingBrush.width = brushSize;
        }
      } else {
        fabricCanvas.isDrawingMode = false;
      }
      
      // Update image properties
      fabricCanvas.getObjects().forEach(obj => {
        if (obj instanceof FabricImage) {
          const isSelected = fabricCanvas?.getActiveObject() === obj;
          obj.set({
            selectable: true,
            evented: true,
            hasControls: isSelected,
            hasBorders: isSelected,
            hoverCursor: isSelected ? 'move' : 'default',
            lockMovementX: !isSelected,
            lockMovementY: !isSelected,
            perPixelTargetFind: true
          });
        }
      });
      
      fabricCanvas.renderAll();
    }
  }, [fabricCanvas, color, tool, brushSize]);

  // Close popups when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Don't close if clicking inside the popups
      if (
        brushPopupRef.current?.contains(target) ||
        eraserPopupRef.current?.contains(target) ||
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

  return (
    <div className="min-h-screen bg-gray-100 overflow-hidden">
      <canvas ref={canvasRef} className="touch-none" />
      
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

            <div className="size-popup-wrapper" ref={eraserPopupRef}>
              <ToolButton
                isActive={tool === 'eraser'}
                onClick={() => {
                  handleToolChange('eraser');
                  setActivePopup('eraser');
                  setShowSizePopup(true);
                  setShowColorPicker(false);
                }}
              >
                <EraserIcon className="w-6 h-6" />
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
                  setActivePopup(showColorPicker ? null : 'color');
                  setShowSizePopup(false);
                }}
                style={{ 
                  backgroundColor: color,
                  color: color === '#000000' ? 'white' : 'black'
                }}
              >
                <SwatchIcon className="w-6 h-6" />
              </ToolButton>

              <AnimatePresence>
                {showColorPicker && (
                  <motion.div
                    className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 
                             bg-white rounded-2xl p-3 shadow-xl z-50"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <HexColorPicker color={color} onChange={setColor} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="size-popup-wrapper" ref={uploadButtonRef}>
              <ToolButton
                isActive={showUploadModal}
                onClick={() => {
                  setShowUploadModal(!showUploadModal);
                  setShowSizePopup(false);
                  setShowColorPicker(false);
                  setActivePopup(null);
                }}
              >
                <PhotoIcon className="w-6 h-6" />
              </ToolButton>

              <AnimatePresence>
                {showUploadModal && (
                  <div className="popup-container">
                    <motion.div
                      className="size-popup"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <UploadModal
                        isOpen={showUploadModal}
                        onClose={() => setShowUploadModal(false)}
                        onUpload={handleFileUpload}
                      />
                      <div className="popup-arrow" />
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
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
    </div>
  );
}

export default App;
