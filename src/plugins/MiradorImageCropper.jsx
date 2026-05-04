import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton } from '@mui/material';
import CropIcon from '@mui/icons-material/Crop';
import OpenSeadragon from 'openseadragon';
import { OSDReferences, useTranslation } from 'mirador';
import {
  defaultQuality,
  getImageBaseUrl,
  getImageService,
} from '../utils/iiif.js';
import CropperDialog from './CropperDialog.jsx';

const MIN_SIZE_PX = 30;

function MiradorImageCropper({
  TargetComponent,
  targetProps,
  enabled,
  canvas,
  updateWindow,
}) {
  const { windowId } = targetProps;
  const { t } = useTranslation();
  const wrapperRef = useRef(null);
  const [region, setRegion] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const stateRef = useRef({ mode: null, start: null, init: null });

  const service = useMemo(() => getImageService(canvas), [canvas]);
  const baseUrl = getImageBaseUrl(service);
  const dq = defaultQuality(service);

  useEffect(() => {
    if (!enabled) {
      setRegion(null);
    }
  }, [enabled]);

  // Wrapper-level pointermove/pointerup are window listeners so the gesture
  // continues even when the cursor leaves the cropping layer.
  useEffect(() => {
    if (!enabled) return undefined;

    const onPointerMove = (e) => {
      const st = stateRef.current;
      if (!st.mode) return;
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const cx = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const cy = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      if (st.mode === 'create') {
        const x = Math.min(st.start.x, cx);
        const y = Math.min(st.start.y, cy);
        const w = Math.abs(cx - st.start.x);
        const h = Math.abs(cy - st.start.y);
        setRegion({ x, y, w, h });
      } else if (st.mode === 'move') {
        const dx = cx - st.start.x;
        const dy = cy - st.start.y;
        setRegion({
          ...st.init,
          x: Math.max(0, Math.min(rect.width - st.init.w, st.init.x + dx)),
          y: Math.max(0, Math.min(rect.height - st.init.h, st.init.y + dy)),
        });
      } else if (st.mode.startsWith('resize:')) {
        const dir = st.mode.slice('resize:'.length);
        const dx = cx - st.start.x;
        const dy = cy - st.start.y;
        let { x, y, w, h } = st.init;
        if (dir.includes('e')) w = Math.max(MIN_SIZE_PX, st.init.w + dx);
        if (dir.includes('s')) h = Math.max(MIN_SIZE_PX, st.init.h + dy);
        if (dir.includes('w')) {
          const newX = Math.min(st.init.x + dx, st.init.x + st.init.w - MIN_SIZE_PX);
          w = st.init.w + (st.init.x - newX);
          x = newX;
        }
        if (dir.includes('n')) {
          const newY = Math.min(st.init.y + dy, st.init.y + st.init.h - MIN_SIZE_PX);
          h = st.init.h + (st.init.y - newY);
          y = newY;
        }
        setRegion({ x, y, w, h });
      }
    };
    const onPointerUp = () => {
      const st = stateRef.current;
      if (st.mode === 'create') {
        setRegion((r) => (
          !r || r.w < MIN_SIZE_PX || r.h < MIN_SIZE_PX ? null : r
        ));
      }
      stateRef.current = { mode: null, start: null, init: null };
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [enabled]);

  const startCreate = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    stateRef.current = {
      mode: 'create',
      start: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      init: null,
    };
    setRegion({ x: stateRef.current.start.x, y: stateRef.current.start.y, w: 0, h: 0 });
  };

  const startMove = (e) => {
    if (e.button !== 0 || !region) return;
    // No preventDefault here: it would suppress the click/dblclick chain
    // and the IconButton inside the rectangle would no longer respond.
    e.stopPropagation();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    stateRef.current = {
      mode: 'move',
      start: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      init: { ...region },
    };
  };

  const startResize = (dir) => (e) => {
    if (e.button !== 0 || !region) return;
    e.preventDefault();
    e.stopPropagation();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    stateRef.current = {
      mode: `resize:${dir}`,
      start: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      init: { ...region },
    };
  };

  const regionPct = useMemo(() => {
    if (!region || !canvas) return null;
    const viewer = OSDReferences.get(windowId)?.current;
    if (!viewer || !viewer.viewport) return null;
    const tiledImage = viewer.world?.getItemAt(0);
    if (!tiledImage) return null;
    try {
      const tl = tiledImage.viewerElementToImageCoordinates(
        new OpenSeadragon.Point(region.x, region.y)
      );
      const br = tiledImage.viewerElementToImageCoordinates(
        new OpenSeadragon.Point(region.x + region.w, region.y + region.h)
      );
      const cw = canvas.width || 1;
      const ch = canvas.height || 1;
      return {
        x: Math.max(0, Math.min(100, (tl.x / cw) * 100)),
        y: Math.max(0, Math.min(100, (tl.y / ch) * 100)),
        w: Math.max(0, Math.min(100, ((br.x - tl.x) / cw) * 100)),
        h: Math.max(0, Math.min(100, ((br.y - tl.y) / ch) * 100)),
      };
    } catch (e) {
      return null;
    }
  }, [region, windowId, canvas]);

  const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

  const openDialog = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setDialogOpen(true);
  };

  return (
    <Box
      ref={wrapperRef}
      sx={{ position: 'relative', display: 'flex', flex: 1, minHeight: 0, width: '100%' }}
    >
      <TargetComponent {...targetProps} />
      {enabled && (
        <Box
          // Capture layer above OSD when cropping is active. Pointer events
          // never reach OSD's MouseTracker, so panning / zoom-on-click are
          // suspended for the duration of the cropping mode.
          sx={{
            position: 'absolute',
            inset: 0,
            cursor: 'crosshair',
            zIndex: 3,
          }}
          onPointerDown={(e) => {
            // Only start a new region if the click is on the empty layer,
            // not on the rectangle or its handles (they stop propagation).
            startCreate(e);
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {region && (
            <Box
              sx={{
                position: 'absolute',
                left: region.x,
                top: region.y,
                width: region.w,
                height: region.h,
                border: '2px dashed #fff',
                outline: '1px solid rgba(0,0,0,0.6)',
                cursor: 'move',
                zIndex: 4,
                backgroundColor: 'rgba(0,0,0,0.05)',
              }}
              onPointerDown={startMove}
              onDoubleClick={openDialog}
            >
              <IconButton
                size="small"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={openDialog}
                sx={{
                  position: 'absolute', top: 4, right: 4, zIndex: 6,
                  backgroundColor: 'rgba(255,255,255,0.85)',
                  '&:hover': { backgroundColor: 'rgba(255,255,255,1)' },
                }}
                aria-label="open"
              >
                <CropIcon fontSize="small" />
              </IconButton>
              {handles.map((dir) => {
                const pos = {
                  nw: { left: '-5px', top: '-5px', cursor: 'nwse-resize' },
                  n: { left: '50%', top: '-5px', transform: 'translateX(-50%)', cursor: 'ns-resize' },
                  ne: { right: '-5px', top: '-5px', cursor: 'nesw-resize' },
                  e: { right: '-5px', top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' },
                  se: { right: '-5px', bottom: '-5px', cursor: 'nwse-resize' },
                  s: { left: '50%', bottom: '-5px', transform: 'translateX(-50%)', cursor: 'ns-resize' },
                  sw: { left: '-5px', bottom: '-5px', cursor: 'nesw-resize' },
                  w: { left: '-5px', top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' },
                }[dir];
                return (
                  <Box
                    key={dir}
                    onPointerDown={startResize(dir)}
                    sx={{
                      position: 'absolute', width: 10, height: 10,
                      backgroundColor: '#fff', border: '1px solid #333',
                      borderRadius: '2px', zIndex: 5,
                      ...pos,
                    }}
                  />
                );
              })}
            </Box>
          )}
        </Box>
      )}
      <CropperDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        baseUrl={baseUrl}
        region={regionPct}
        canvas={canvas}
        defaultQuality={dq}
      />
    </Box>
  );
}

export default MiradorImageCropper;
