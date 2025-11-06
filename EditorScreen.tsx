import React from 'react';
// FIX: Use namespace import for fabric to resolve module loading error.
import * as fabric from 'fabric';
import { ImageInfo } from './types.ts';
import { GREETING_CATEGORIES, FONT_OPTIONS, TEXT_TEMPLATES } from './data.ts';


const { useState, useEffect, useRef } = React;

interface EditorScreenProps {
    imageInfo: ImageInfo;
    onClose: () => void;
    onComplete: (
        dataUrl: string, 
        metadata: {
            sourceCategory: string;
            fontsUsed: string[];
            isVertical: boolean;
            imageSrc: string;
            editorData: any;
        }, 
        isPublic: boolean,
        title: string,
        description: string
    ) => void;
    onFontChange: (fontFamily: string) => void;
}

const hexToRgba = (hex: string, alpha: number = 1) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return `rgba(0, 0, 0, ${alpha})`; // Fallback for invalid hex
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};


type EditorMode = 'text' | 'handwriting' | null;

const EditorScreen = ({ imageInfo, onClose, onComplete, onFontChange }: EditorScreenProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const [activeObject, setActiveObject] = useState<fabric.Object | null>(null);

    const [editorMode, setEditorMode] = useState<EditorMode>(null);
    const isDrawingMode = editorMode === 'handwriting';
    
    const [brushWidth, setBrushWidth] = useState(5);
    const [brushColor, setBrushColor] = useState('#FFFFFF');
    const [activeBrush, setActiveBrush] = useState('pencil');
    
    const [textValue, setTextValue] = useState('');
    const [textColor, setTextColor] = useState('#FFFFFF');
    const [objectSize, setObjectSize] = useState(36);
    const [textAngle, setTextAngle] = useState(0);
    const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0].value);
    const [isBold, setIsBold] = useState(false);
    const [hasShadow, setHasShadow] = useState(false);
    const [strokeWidth, setStrokeWidth] = useState(0);
    const [strokeColor, setStrokeColor] = useState('#000000');
    const [isVertical, setIsVertical] = useState(false);
    
    // Finalize Modal State
    const [showFinalizeModal, setShowFinalizeModal] = useState(false);
    const [creationTitle, setCreationTitle] = useState('');
    const [creationDesc, setCreationDesc] = useState('');
    const [isPublic, setIsPublic] = useState(true);

    const [isGreetingsModalOpen, setIsGreetingsModalOpen] = useState(false);
    const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
    const [isFontsModalOpen, setIsFontsModalOpen] = useState(false);
    const [activeGreetingCategory, setActiveGreetingCategory] = useState(Object.keys(GREETING_CATEGORIES)[0]);
    
    const isDrawingModeRef = useRef(isDrawingMode);
    
    const isSwitchingToAddText = useRef(false);

    const verticalGuideRef = useRef<fabric.Line | null>(null);
    const horizontalGuideRef = useRef<fabric.Line | null>(null);
    
    // --- Effects ---

    useEffect(() => {
        const canvasEl = canvasRef.current;
        if (!canvasEl) return;

        const container = canvasEl.parentElement;
        if (!container) return;

        const canvas = new fabric.Canvas(canvasEl);
        fabricCanvasRef.current = canvas;
        
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        
        // --- Centering Guidelines ---
        const ALIGNMENT_THRESHOLD = 6;
        const guideLineOptions = {
            stroke: '#ff4757', // A bright red color
            strokeWidth: 1,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
            visible: false,
        };
        const center = canvas.getCenter();
        const vertLine = new fabric.Line(
            [center.left, 0, center.left, canvas.getHeight()],
            guideLineOptions
        );
        const horizLine = new fabric.Line(
            [0, center.top, canvas.getWidth(), center.top],
            guideLineOptions
        );
        canvas.add(vertLine, horizLine);
        verticalGuideRef.current = vertLine;
        horizontalGuideRef.current = horizLine;
        
        const hideGuides = () => {
            if (verticalGuideRef.current) verticalGuideRef.current.visible = false;
            if (horizontalGuideRef.current) horizontalGuideRef.current.visible = false;
            canvas.renderAll();
        };
        
        // FIX: The `fabric.IEvent` type is deprecated or not exported in recent versions.
        // Replaced with a specific type `{ target?: fabric.Object }` for the event object.
        const handleObjectMoving = (e: { target?: fabric.Object }) => {
            const target = e.target;
            if (!target) return;

            target.setCoords();
            const canvasCenter = canvas.getCenter();
            
            let snappedToV = false;
            let snappedToH = false;

            // Vertical snapping
            if (Math.abs(target.left! - canvasCenter.left) < ALIGNMENT_THRESHOLD) {
                target.set({ left: canvasCenter.left }).setCoords();
                verticalGuideRef.current!.visible = true;
                snappedToV = true;
            }

            // Horizontal snapping
            if (Math.abs(target.top! - canvasCenter.top) < ALIGNMENT_THRESHOLD) {
                target.set({ top: canvasCenter.top }).setCoords();
                horizontalGuideRef.current!.visible = true;
                snappedToH = true;
            }
            
            if (!snappedToV && verticalGuideRef.current) verticalGuideRef.current.visible = false;
            if (!snappedToH && horizontalGuideRef.current) horizontalGuideRef.current.visible = false;
        };
        
        const handlePathCreated = (e: { path: fabric.Path }) => {
            const path = e.path;
            if (path && isDrawingModeRef.current) {
                // Add a temporary marker for the current session's strokes
                path.set('isNewHandwriting', true);
                // Add a persistent marker for all handwriting strokes
                path.set('isHandwritingStroke', true);
            }
        };

        const updateControls = (target: fabric.Object | undefined) => {
            if (!target) return;
            setTextAngle(target.angle || 0);

            if (target.type === 'i-text') {
                const textObj = target as fabric.IText;
                const visualFontSize = (textObj.fontSize || 24) * (textObj.scaleY || 1);
                setObjectSize(Math.round(visualFontSize));
            } else if (target.type === 'group') {
                 setObjectSize(Math.round(((target as fabric.Group).scaleX || 1) * 50));
            }
        };

        const handleObjectModified = (e: { target?: fabric.Object }) => {
            const target = e.target;
            hideGuides();
            if (!target) return;

            if (target.type === 'i-text') {
                const textObj = target as fabric.IText;
                const newFontSize = (textObj.fontSize || 1) * (textObj.scaleY || 1);
                textObj.set({
                    fontSize: Math.round(newFontSize),
                    scaleX: 1,
                    scaleY: 1,
                });
                setObjectSize(Math.round(newFontSize)); // Ensure state is synced
            }
            canvas.renderAll();
        };


        canvas.on('path:created', handlePathCreated as any);
        canvas.on('object:moving', handleObjectMoving);
        canvas.on('mouse:up', hideGuides);


        const updateCanvasAndImage = (width: number, height: number) => {
            canvas.setWidth(width);
            canvas.setHeight(height);

            const updateGuides = () => {
                const center = canvas.getCenter();
                if (verticalGuideRef.current) {
                    verticalGuideRef.current.set({ x1: center.left, y1: 0, x2: center.left, y2: height }).setCoords();
                }
                if (horizontalGuideRef.current) {
                    horizontalGuideRef.current.set({ x1: 0, y1: center.top, x2: width, y2: center.top }).setCoords();
                }
            };

            // FIX: If editorData exists, load the canvas state from it for re-editing.
            // Otherwise, set up a new background image for a new creation.
            if (imageInfo.editorData) {
                // Re-editing a creation. This loads all objects, including the background image.
                // NOTE: This does not automatically scale content if canvas dimensions differ from when saved.
                canvas.loadFromJSON(imageInfo.editorData, () => {
                    canvas.renderAll();
                    updateGuides();
                });
            } else {
                // New creation: set the background image from src.
                const setupBackgroundImage = async () => {
                    try {
                        const img = await fabric.Image.fromURL(imageInfo.src, { crossOrigin: 'anonymous' });
                        const imgWidth = img.width || 1;
                        const imgHeight = img.height || 1;
                        const scale = Math.max(width / imgWidth, height / imgHeight);
                        img.scale(scale);
                        img.set({
                            originX: 'center',
                            originY: 'center',
                            left: width / 2,
                            top: height / 2,
                        });
                        canvas.backgroundImage = img;
                        canvas.renderAll();
                        updateGuides();
                    } catch (error) {
                        console.error("Error loading image into canvas:", error);
                    }
                };
                setupBackgroundImage();
            }
        };
    
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    updateCanvasAndImage(width, height);
                }
            }
        });

        resizeObserver.observe(container);
        
        // FIX: Replaced deprecated fabric.IEvent with a specific type for selection events.
        const handleSelection = (e: { selected?: fabric.Object[] }) => {
            const selected = e.selected?.[0];
            setActiveObject(selected || null);
            if (selected) {
                 if (selected.type === 'i-text' || selected.type === 'group') {
                    setEditorMode('text');
                    updateControls(selected);
                } else {
                    setEditorMode(null);
                }
            }
        };

        canvas.on('selection:created', handleSelection);
        canvas.on('selection:updated', handleSelection);
        canvas.on('selection:cleared', () => {
             setActiveObject(null);
             if (isSwitchingToAddText.current) {
                isSwitchingToAddText.current = false; // Reset flag and do nothing else
                return;
             }
             if (editorMode !== 'handwriting') {
                setEditorMode(null);
             }
        });

        canvas.on('object:scaling', (e) => updateControls(e.target));
        canvas.on('object:rotating', (e) => updateControls(e.target));
        canvas.on('object:modified', handleObjectModified);


        return () => {
            resizeObserver.unobserve(container);
            canvas.off('selection:created');
            canvas.off('selection:updated');
            canvas.off('selection:cleared');
            canvas.off('object:scaling');
            canvas.off('object:rotating');
            canvas.off('object:modified');
            canvas.off('path:created', handlePathCreated as any);
            canvas.off('object:moving', handleObjectMoving);
            canvas.off('mouse:up', hideGuides);
            canvas.dispose();
        };
    }, [imageInfo.src, imageInfo.editorData]);

    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
    
        const wasDrawing = isDrawingModeRef.current;
        const isNowDrawing = editorMode === 'handwriting';
    
        canvas.isDrawingMode = isNowDrawing;
    
        if (isNowDrawing && !wasDrawing) {
            // Entering drawing mode: disable selection on other objects
            canvas.selection = false;
            canvas.getObjects().forEach(obj => {
                obj.evented = false;
            });
            canvas.discardActiveObject();
            setActiveObject(null);
            canvas.renderAll();
        } else if (!isNowDrawing && wasDrawing) {
            // Exiting drawing mode: group all strokes
            canvas.selection = true;
    
            // Defer grouping to the next tick to prevent race conditions with canvas state
            setTimeout(() => {
                if (!fabricCanvasRef.current) return;
                const canvas = fabricCanvasRef.current;
    
                // 1. Find and "explode" all existing handwriting groups.
                // This modifies the canvas, so we do it first.
                const groups = canvas.getObjects().filter(o => (o as any).isHandwritingGroup) as fabric.Group[];
                groups.forEach(group => {
                    // FIX: The `destroy` method on `fabric.Group` was removed in recent Fabric.js versions.
                    // The correct way to ungroup objects is to convert the group to an `ActiveSelection`
                    // and then discard it, leaving the individual objects on the canvas.
                    // FIX: The `toActiveSelection` property might not exist on the `Group` type due to outdated
                    // typings. Cast to `any` to bypass the compile-time error. The runtime check remains.
                    if ((group as any).toActiveSelection) {
                      (group as any).toActiveSelection();
                      canvas.discardActiveObject();
                    }
                });
    
                // 2. Now, the canvas contains all strokes as individual objects. Let's collect them.
                const strokesToGroup: fabric.Object[] = [];
                canvas.getObjects().forEach(obj => {
                    if ((obj as any).isHandwritingStroke) {
                        strokesToGroup.push(obj);
                    }
                });
    
                // 3. Remove the individual strokes from the canvas before re-grouping.
                strokesToGroup.forEach(stroke => canvas.remove(stroke));
    
                // 4. Create a new single group from all collected strokes.
                if (strokesToGroup.length > 0) {
                    // Ensure all strokes are not considered "new" anymore for undo purposes.
                    strokesToGroup.forEach(stroke => stroke.set('isNewHandwriting', false));
                    
                    const newGroup = new fabric.Group(strokesToGroup, {
                        cornerSize: 12,
                        cornerColor: '#3498db',
                        transparentCorners: false,
                        originX: 'center',
                        originY: 'center',
                    });
                    newGroup.set('isHandwritingGroup', true); // Mark the new group.
                    
                    canvas.add(newGroup);
                    canvas.setActiveObject(newGroup);
                }
    
                // 5. Re-enable events for all objects on the canvas.
                canvas.getObjects().forEach(obj => {
                    obj.evented = true;
                });
                canvas.renderAll();
            }, 0);
        }
    
        isDrawingModeRef.current = isNowDrawing;
    }, [editorMode]);


    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (canvas && canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush.strokeLineCap = 'round';
            let color = brushColor;

            switch (activeBrush) {
                case 'marker':
                    canvas.freeDrawingBrush.strokeLineCap = 'square';
                    break;
                case 'highlighter':
                    canvas.freeDrawingBrush.strokeLineCap = 'square';
                    color = hexToRgba(brushColor, 0.5);
                    break;
                case 'pen':
                case 'pencil':
                default:
                    break;
            }
            
            canvas.freeDrawingBrush.width = parseInt(brushWidth.toString(), 10);
            canvas.freeDrawingBrush.color = color;
        }
    }, [brushWidth, brushColor, activeBrush]);

    useEffect(() => {
        if (activeObject) {
            setTextAngle(activeObject.angle || 0);
            setStrokeWidth(activeObject.strokeWidth || 0);
            setStrokeColor(activeObject.stroke as string || '#000000');
            
            if (activeObject.type === 'i-text') {
                const textObj = activeObject as fabric.IText;
                const originalText = (textObj as any)._originalText || textObj.text;
                setTextValue(originalText || '');
                setTextColor(textObj.fill as string || '#FFFFFF');
                setSelectedFont(textObj.fontFamily || FONT_OPTIONS[0].value);
                setIsBold(textObj.fontWeight === 'bold');
                setHasShadow(!!textObj.shadow);
                setIsVertical(!!(textObj as any)._isVertical);
                setObjectSize(textObj.fontSize || 24);
            } else if (activeObject.type === 'group') {
                const groupObj = activeObject as fabric.Group;
                setTextValue('');
                setObjectSize(Math.round((groupObj.scaleX || 1) * 50));
            } else {
                 setTextValue('');
            }
        } else {
             setTextValue('');
        }
    }, [activeObject]);

    const handleAddText = (greeting: string = '輕觸此處編輯文字', styles: any = {}) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const text = new fabric.IText(greeting, {
            left: canvas.getWidth()! / 2,
            top: canvas.getHeight()! / 2,
            fontFamily: selectedFont,
            fontSize: 20,
            fill: textColor,
            originX: 'center',
            originY: 'center',
            padding: 5,
            paintFirst: 'stroke',
            cornerSize: 12,
            cornerColor: '#3498db',
            transparentCorners: false,
            ...styles
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        return text;
    };

    const updateActiveObject = (props: any) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || !activeObject) return;
        activeObject.set(props);
        canvas.renderAll();
    };
    
    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = e.target.value;
        setTextValue(newText);
        if (isVertical) {
            const strippedText = newText.replace(/\n/g, '');
            updateActiveObject({ text: strippedText.split('').join('\n') });
            (activeObject as any)._originalText = strippedText;
        } else {
            updateActiveObject({ text: newText });
        }
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTextColor(e.target.value);
        updateActiveObject({ fill: e.target.value });
    };

    const handleFontChange = (font: string) => {
        setSelectedFont(font);
        updateActiveObject({ fontFamily: font });
        onFontChange(font);
        setIsFontsModalOpen(false);
    };

    const handleDeleteObject = () => {
        const canvas = fabricCanvasRef.current;
        if (canvas && activeObject) {
            canvas.remove(activeObject);
            setActiveObject(null);
        }
    };
    
    const handleBrushColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBrushColor(e.target.value);
    };
    
    const handleUndoDrawing = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
    
        const allObjects = canvas.getObjects();
        // Find the last object that is a new handwriting stroke and remove it
        for (let i = allObjects.length - 1; i >= 0; i--) {
            if ((allObjects[i] as any).isNewHandwriting) {
                canvas.remove(allObjects[i]);
                canvas.renderAll();
                return; // Exit after removing one
            }
        }
    };

    const handleClearDrawings = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
    
        const newPaths = canvas.getObjects().filter(obj => (obj as any).isNewHandwriting);
    
        if (newPaths.length > 0) {
            if (window.confirm('確定要清除本次所有手寫筆跡嗎？')) {
                newPaths.forEach(path => canvas.remove(path));
                canvas.renderAll();
            }
        }
    };
    
    const handleSizeChange = (value: number) => {
        setObjectSize(value);
        if (!activeObject) return;
        if (activeObject.type === 'i-text') {
            updateActiveObject({ 
                fontSize: value,
                scaleX: 1, // Ensure scale is reset
                scaleY: 1
            });
        } else if (activeObject.type === 'group') {
            const newScale = value / 50;
            updateActiveObject({ scaleX: newScale, scaleY: newScale });
        }
    };
    const handleAngleChange = (value: number) => {
        setTextAngle(value);
        updateActiveObject({ angle: value });
    };
    const handleStrokeWidthChange = (value: number) => {
        setStrokeWidth(value);
        updateActiveObject({ strokeWidth: value });
    };

    const handleStrokeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setStrokeColor(e.target.value);
        updateActiveObject({ stroke: e.target.value });
    };

    const handleToggleBold = () => {
        const newWeight = !isBold ? 'bold' : 'normal';
        setIsBold(!isBold);
        updateActiveObject({ fontWeight: newWeight });
    };
    
    const handleToggleShadow = () => {
        const newShadow = !hasShadow ? new fabric.Shadow({
            color: 'rgba(0,0,0,0.5)',
            blur: 7,
            offsetX: 5,
            offsetY: 5
        }) : null;
        setHasShadow(!hasShadow);
        updateActiveObject({ shadow: newShadow });
    };
    
    const handleToggleVertical = () => {
        if (!activeObject || activeObject.type !== 'i-text') return;
        const textObj = activeObject as fabric.IText;
        const currentOriginalText = (textObj as any)._originalText || textObj.text || '';
        
        const newIsVertical = !isVertical;
        if (newIsVertical) {
            (textObj as any)._originalText = currentOriginalText.replace(/\n/g, '');
            const verticalText = currentOriginalText.replace(/\n/g, '').split('').join('\n');
            updateActiveObject({ text: verticalText });
        } else {
            const horizontalText = (textObj as any)._originalText || '';
            updateActiveObject({ text: horizontalText });
            delete (textObj as any)._originalText;
        }
        (textObj as any)._isVertical = newIsVertical;
        setIsVertical(newIsVertical);
    };

    const handleFinalizeAndComplete = () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        canvas.discardActiveObject();
        canvas.renderAll();
        
        const dataURL = canvas.toDataURL({
            format: 'jpeg',
            quality: 0.95,
            multiplier: 3
        });
        
        const textObjects = canvas.getObjects('i-text') as fabric.IText[];
        const fontsUsed = textObjects
            .map(obj => obj.fontFamily || '')
            .filter((value, index, self) => self.indexOf(value) === index);
            
        const hasVerticalText = textObjects.some(obj => (obj as any)._isVertical);

        const metadata = {
            fontsUsed,
            sourceCategory: imageInfo.sourceCategory,
            isVertical: hasVerticalText,
            imageSrc: imageInfo.src,
            editorData: canvas.toJSON(),
        };

        onComplete(dataURL, metadata, isPublic, creationTitle, creationDesc);
    };
    
    const handleGreetingSelect = (greeting: string) => {
        handleAddText(greeting);
        setIsGreetingsModalOpen(false);
    };

    const handleTemplateSelect = (template: any) => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        let target = canvas.getActiveObject() as fabric.IText;

        if (!target || target.type !== 'i-text') {
            target = handleAddText('範例文字');
        }

        const stylesToApply = JSON.parse(JSON.stringify(template.styles));
        
        if (stylesToApply.shadow) {
            stylesToApply.shadow = new fabric.Shadow(stylesToApply.shadow);
        } else {
            stylesToApply.shadow = null;
        }

        const isTargetVertical = stylesToApply._isVertical;
        delete stylesToApply._isVertical;

        target.set(stylesToApply);

        const currentText = (target as any)._originalText || target.text || '範例文字';
        const horizontalText = currentText.replace(/\n/g, '');

        if (isTargetVertical) {
            (target as any)._originalText = horizontalText;
            target.set('text', horizontalText.split('').join('\n'));
        } else {
            target.set('text', horizontalText);
            delete (target as any)._originalText;
        }
        (target as any)._isVertical = isTargetVertical;

        canvas.renderAll();
        setActiveObject(target); 
        setIsTemplatesModalOpen(false);
        setEditorMode('text'); // Ensure text panel is open
    };


    const handleBrushSelect = (brushType: string) => {
        setActiveBrush(brushType);
        switch (brushType) {
            case 'marker':
                setBrushWidth(20);
                break;
            case 'highlighter':
                setBrushWidth(30);
                break;
            case 'pen':
                setBrushWidth(2);
                break;
            case 'pencil':
            default:
                setBrushWidth(5);
                break;
        }
    };
    
    const toggleEditorMode = (mode: EditorMode) => {
        setEditorMode(prev => prev === mode ? null : mode);
    };

    const handleTextButtonClick = () => {
        if (activeObject) {
            isSwitchingToAddText.current = true;
            fabricCanvasRef.current?.discardActiveObject();
            fabricCanvasRef.current?.renderAll();
            setEditorMode('text');
        } else {
            toggleEditorMode('text');
        }
    };

    const getPanelTitle = () => {
        switch (editorMode) {
            case 'text': return activeObject ? '編輯物件' : '新增文字';
            case 'handwriting': return '手寫塗鴉';
            default: return '';
        }
    };

    const handleDoneEditing = () => {
        setEditorMode(null);
    };

    const renderSlider = (label: string, value: number, min: number, max: number, onChange: (val: number) => void, id?: string) => (
        React.createElement('div', { id, className: 'slider-control' },
            React.createElement('label', { className: 'label' }, label),
            React.createElement('input', { 
                type: 'range', 
                min, max, value, 
                onChange: (e) => onChange(parseInt(e.target.value, 10)),
                disabled: !activeObject && !isDrawingMode
            }),
            React.createElement('input', { 
                type: 'number', 
                min, max, value, 
                onChange: (e) => onChange(parseInt(e.target.value, 10)),
                disabled: !activeObject && !isDrawingMode
            })
        )
    );

    const renderGreetingsModal = () => (
        React.createElement('div', { className: 'modal-overlay', onClick: () => setIsGreetingsModalOpen(false) },
            React.createElement('div', { className: 'greetings-modal-content', onClick: (e: React.MouseEvent) => e.stopPropagation() },
                React.createElement('h3', { className: 'greetings-modal-title' }, '選擇一句祝福語'),
                React.createElement('div', { className: 'greetings-modal-body' },
                    React.createElement('div', { className: 'greetings-categories' },
                        Object.keys(GREETING_CATEGORIES).map(category =>
                            React.createElement('button', {
                                key: category,
                                className: `greeting-category-btn ${activeGreetingCategory === category ? 'active' : ''}`,
                                onClick: () => setActiveGreetingCategory(category)
                            }, category)
                        )
                    ),
                    React.createElement('div', { className: 'greetings-list' },
                        GREETING_CATEGORIES[activeGreetingCategory].map(greeting =>
                            React.createElement('button', {
                                key: greeting,
                                className: 'greeting-item-btn',
                                onClick: () => handleGreetingSelect(greeting)
                            }, greeting)
                        )
                    )
                )
            )
        )
    );
    
    const renderTemplatesModal = () => {
        const fabricToCss = (styles: any): React.CSSProperties => {
            const css: React.CSSProperties = {};
            if (styles.fill) css.color = styles.fill;
            if (styles.fontFamily) css.fontFamily = styles.fontFamily;
            if (styles.fontWeight) css.fontWeight = styles.fontWeight;
            if (styles.stroke && styles.strokeWidth) {
                 css.textShadow = `
                    ${styles.strokeWidth}px ${styles.strokeWidth}px 0 ${styles.stroke},
                    -${styles.strokeWidth}px ${styles.strokeWidth}px 0 ${styles.stroke},
                    -${styles.strokeWidth}px -${styles.strokeWidth}px 0 ${styles.stroke},
                    ${styles.strokeWidth}px -${styles.strokeWidth}px 0 ${styles.stroke}
                `;
            }
            if (styles.shadow && styles.shadow.color) {
                 const s = styles.shadow;
                 const existingShadow = css.textShadow ? `${css.textShadow}, ` : '';
                 css.textShadow = existingShadow + `${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.color}`;
            }
             if (styles._isVertical) {
                css.writingMode = 'vertical-rl';
                css.lineHeight = '1.2';
                css.padding = '10px 5px';
            }
            return css;
        };

        return React.createElement('div', { className: 'modal-overlay', onClick: () => setIsTemplatesModalOpen(false) },
            React.createElement('div', { className: 'templates-modal-content', onClick: (e: React.MouseEvent) => e.stopPropagation() },
                React.createElement('h3', { className: 'templates-modal-title' }, '選擇文字模板'),
                React.createElement('div', { className: 'templates-modal-body' },
                    React.createElement('div', { className: 'templates-grid' },
                        TEXT_TEMPLATES.map(template =>
                            React.createElement('button', {
                                key: template.name,
                                className: 'template-item',
                                onClick: () => handleTemplateSelect(template)
                            }, 
                                React.createElement('span', {
                                    className: 'template-preview',
                                    style: fabricToCss(template.styles)
                                }, template.styles._isVertical ? '樣式' : '文字樣式'),
                                React.createElement('span', { className: 'template-name' }, template.name)
                            )
                        )
                    )
                )
            )
        )
    };

    const renderFontsModal = () => (
        React.createElement('div', { className: 'modal-overlay', onClick: () => setIsFontsModalOpen(false) },
            React.createElement('div', { className: 'greetings-modal-content', onClick: (e: React.MouseEvent) => e.stopPropagation() },
                React.createElement('h3', { className: 'greetings-modal-title' }, '選擇字體'),
                React.createElement('div', { className: 'fonts-list' },
                    FONT_OPTIONS.map(font =>
                        React.createElement('button', {
                            key: font.value,
                            className: 'font-item-btn',
                            onClick: () => handleFontChange(font.value),
                            style: { fontFamily: font.value }
                        }, font.name)
                    )
                )
            )
        )
    );
    
    const renderFinalizeModal = () => {
        // FIX: Extracted props for input and textarea to separate variables to resolve TypeScript error.
        const titleInputProps = {
            type: 'text',
            placeholder: '作品標題 (選填)',
            className: 'finalize-input',
            value: creationTitle,
            onChange: (e: React.ChangeEvent<HTMLInputElement>) => setCreationTitle(e.target.value),
            maxLength: 50
        };
        const descTextareaProps = {
            placeholder: '作品說明 (選填)',
            className: 'finalize-input',
            rows: 3,
            value: creationDesc,
            onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => setCreationDesc(e.target.value),
            maxLength: 300
        };

        return React.createElement('div', { className: 'modal-overlay', onClick: () => setShowFinalizeModal(false) },
            React.createElement('div', { className: 'modal-content', onClick: (e: React.MouseEvent) => e.stopPropagation() },
                React.createElement('h2', { className: 'modal-title' }, '儲存作品'),
                React.createElement('div', { className: 'finalize-form' },
                    React.createElement('input', titleInputProps),
                    React.createElement('textarea', descTextareaProps),
                    React.createElement('div', { className: 'public-toggle-wrapper', onClick: () => setIsPublic(p => !p), style: { padding: '10px 0'} },
                        React.createElement('label', { className: 'public-toggle-label' }, '公開分享到「首頁動態」'),
                        React.createElement('label', { className: 'toggle-switch' },
                            React.createElement('input', {
                                type: 'checkbox',
                                checked: isPublic,
                                readOnly: true,
                            }),
                            React.createElement('span', { className: 'toggle-slider' })
                        )
                    )
                ),
                React.createElement('div', { className: 'modal-buttons' },
                    React.createElement('button', { className: 'modal-btn primary', onClick: handleFinalizeAndComplete }, '確認儲存'),
                    React.createElement('button', { className: 'modal-btn secondary', onClick: () => setShowFinalizeModal(false) }, '返回編輯')
                )
            )
        );
    };


    const renderDrawingControls = () => (
        React.createElement(React.Fragment, { key: 'drawing-controls' },
            React.createElement('div', { className: 'controls-row four-cols' },
                React.createElement('button', { onClick: () => handleBrushSelect('pencil'), className: `control-btn ${activeBrush === 'pencil' ? 'active' : ''}` }, '鉛筆'),
                React.createElement('button', { onClick: () => handleBrushSelect('pen'), className: `control-btn ${activeBrush === 'pen' ? 'active' : ''}` }, '鋼筆'),
                React.createElement('button', { onClick: () => handleBrushSelect('marker'), className: `control-btn ${activeBrush === 'marker' ? 'active' : ''}` }, '麥克筆'),
                React.createElement('button', { onClick: () => handleBrushSelect('highlighter'), className: `control-btn ${activeBrush === 'highlighter' ? 'active' : ''}` }, '螢光筆')
            ),
            React.createElement('div', { className: 'controls-row' },
                React.createElement('label', { className: 'color-control-label' }, '顏色', 
                    React.createElement('input', { 
                        type: 'color', 
                        value: brushColor, 
                        onChange: handleBrushColorChange 
                    })
                ),
                React.createElement('button', { onClick: handleUndoDrawing }, '復原'),
                React.createElement('button', { className: 'danger', onClick: handleClearDrawings }, '清除')
            ),
            renderSlider('粗細', brushWidth, 1, 50, setBrushWidth)
        )
    );
    
    const renderAddTextControls = () => (
        React.createElement(React.Fragment, { key: 'add-text-controls' },
            React.createElement('div', { className: 'controls-row two-cols' },
                 React.createElement('button', { className: 'control-btn-large', onClick: () => handleAddText() }, '+ 新增文字'),
                 React.createElement('button', { className: 'control-btn-large', onClick: () => setIsGreetingsModalOpen(true) }, '💬 祝福語')
            )
        )
    );

    const renderTextEditingControls = () => {
        const isTextSelected = activeObject?.type === 'i-text';
        const selectedFontName = FONT_OPTIONS.find(f => f.value === selectedFont)?.name || FONT_OPTIONS[0].name;

        return React.createElement(React.Fragment, { key: 'text-editing-controls' },
            isTextSelected && React.createElement('textarea', { 
                className: 'text-input-main',
                value: textValue, 
                onChange: handleTextChange, 
                placeholder: '輸入文字...',
                rows: 2,
            }),
            React.createElement('div', { className: 'controls-row four-cols' },
                React.createElement('button', {
                    onClick: () => setIsFontsModalOpen(true),
                    disabled: !isTextSelected,
                    className: 'control-btn font-select-btn',
                    title: selectedFontName
                }, React.createElement('span', null, selectedFontName)),
                React.createElement('button', { onClick: handleToggleBold, disabled: !isTextSelected, className: `control-btn ${isBold ? 'active' : ''}` }, '粗體'),
                React.createElement('button', { onClick: handleToggleShadow, disabled: !isTextSelected, className: `control-btn ${hasShadow ? 'active' : ''}` }, '陰影'),
                React.createElement('button', { onClick: handleToggleVertical, disabled: !isTextSelected, className: `control-btn ${isVertical ? 'active' : ''}` }, '直式')
            ),
             React.createElement('div', { className: 'controls-row two-cols' },
                React.createElement('label', { className: 'color-control-label' }, '文字顏色', React.createElement('input', { type: 'color', value: textColor, onChange: handleColorChange, disabled: !isTextSelected })),
                React.createElement('label', { className: 'color-control-label' }, '邊框顏色', React.createElement('input', { type: 'color', value: strokeColor, onChange: handleStrokeColorChange, disabled: !activeObject, title: '選擇邊框顏色' }))
            ),
            renderSlider('大小', Math.round(objectSize), 8, 200, handleSizeChange),
            renderSlider('角度', Math.round(textAngle), -180, 180, handleAngleChange),
            renderSlider('邊框', strokeWidth, 0, 20, handleStrokeWidthChange)
        )
    };
    
    const renderFunctionPanelContent = () => {
        switch (editorMode) {
            case 'text':
                return activeObject ? renderTextEditingControls() : renderAddTextControls();
            case 'handwriting':
                return renderDrawingControls();
            default:
                return null;
        }
    };
    
    return (
        React.createElement('div', { className: `screen editor-screen ${editorMode ? 'editing-active' : ''}` },
            React.createElement('div', { className: 'editor-header' },
                React.createElement('button', { className: 'header-btn', onClick: onClose }, '取消'),
                React.createElement('h2', null, '編輯創作'),
                React.createElement('button', { className: 'header-btn primary', onClick: () => setShowFinalizeModal(true) }, '完成')
            ),
            React.createElement('div', { className: 'editor-canvas-container' },
                 React.createElement('div', { className: 'canvas-aspect-wrapper' },
                    React.createElement('canvas', { ref: canvasRef })
                )
            ),
            React.createElement('div', { className: 'editor-footer-container' },
                editorMode ? (
                    React.createElement('div', { className: 'function-panel' },
                        React.createElement('div', { className: 'function-panel-header' },
                            React.createElement('h3', null, getPanelTitle()),
                            React.createElement('button', { className: 'panel-done-btn', onClick: handleDoneEditing }, '完成')
                        ),
                        React.createElement('div', { className: 'function-panel-content' },
                            renderFunctionPanelContent()
                        )
                    )
                ) : (
                    React.createElement('div', { className: 'main-toolbar' },
                        React.createElement('button', {
                            className: `toolbar-btn ${editorMode === 'text' && !activeObject ? 'active' : ''}`,
                            onClick: handleTextButtonClick,
                        }, 
                            React.createElement('span', { className: 'toolbar-icon' }, 'T'),
                            React.createElement('span', { className: 'toolbar-label' }, '文字')
                        ),
                        React.createElement('button', {
                            className: `toolbar-btn ${editorMode === 'handwriting' ? 'active' : ''}`,
                            onClick: () => toggleEditorMode('handwriting')
                        },
                            React.createElement('span', { className: 'toolbar-icon' }, '✍️'),
                            React.createElement('span', { className: 'toolbar-label' }, '手寫')
                        ),
                        React.createElement('button', {
                            className: 'toolbar-btn',
                            onClick: () => setIsTemplatesModalOpen(true)
                        },
                            React.createElement('span', { className: 'toolbar-icon' }, '✨'),
                            React.createElement('span', { className: 'toolbar-label' }, '模板')
                        ),
                        React.createElement('button', {
                            className: 'toolbar-btn danger',
                            onClick: handleDeleteObject,
                            disabled: !activeObject
                        },
                            React.createElement('span', { className: 'toolbar-icon' }, '🗑️'),
                            React.createElement('span', { className: 'toolbar-label' }, '刪除')
                        )
                    )
                )
            ),
            isGreetingsModalOpen && renderGreetingsModal(),
            isFontsModalOpen && renderFontsModal(),
            isTemplatesModalOpen && renderTemplatesModal(),
            showFinalizeModal && renderFinalizeModal()
        )
    );
};

export default EditorScreen;