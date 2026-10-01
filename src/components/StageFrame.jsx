import React, { forwardRef, useEffect, useRef, useState } from 'react';

const DESIGN_WIDTH = 2360;
const DESIGN_HEIGHT = 800;

function resolveAspectRatio(value) {
  if (value === '4:3') return '4 / 3';
  if (value === 'free') return '16 / 9';
  return '16 / 9';
}

function resolveAlign(value) {
  if (value === 'top') return 'flex-start';
  if (value === 'bottom') return 'flex-end';
  return 'center';
}

const StageFrame = forwardRef(function StageFrame(
  {
    id,
    className = '',
    settings = {},
    children,
    onDoubleClick,
  },
  forwardedRef
) {
  const localRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = localRef.current;
    if (!element) return undefined;

    const updateScale = () => {
      const rect = element.getBoundingClientRect();
      const availableWidth = Math.max(1, rect.width);
      const availableHeight = Math.max(1, rect.height);
      const nextScale = Math.min(
        availableWidth / DESIGN_WIDTH,
        availableHeight / DESIGN_HEIGHT
      );
      setScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    window.addEventListener('resize', updateScale);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  const assignRef = (node) => {
    localRef.current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  return (
    <div
      id={id}
      ref={assignRef}
      className={`stagePreview stageFrame ${className}`.trim()}
      style={{
        background: settings.publicBackground || '#000000',
        '--stage-aspect-ratio': resolveAspectRatio(settings.publicAspectRatio),
      }}
      onDoubleClick={onDoubleClick}
    >
      <div
        className="stageDesignCanvas"
        style={{
          width: `${DESIGN_WIDTH}px`,
          height: `${DESIGN_HEIGHT}px`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          background: settings.publicBackground || '#000000',
          alignItems: resolveAlign(settings.publicVerticalAlign),
          paddingTop: settings.publicPaddingTop || '0vh',
        }}
      >
        {children}
      </div>
    </div>
  );
});

export default StageFrame;
