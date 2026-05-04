import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  Radio,
  RadioGroup,
  Slider,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DownloadIcon from '@mui/icons-material/Download';
import { useTranslation } from 'mirador';
import { buildIiifUrl, pixelDimensions } from '../utils/iiif.js';

const FORMATS = ['jpg', 'png', 'webp', 'tif', 'gif'];
const PREVIEW_MAX_SIDE = 400;
const SOURCE_SIZE_HINT = 1024;

const QUALITY_FILTER = {
  default: 'none',
  color: 'none',
  gray: 'grayscale(1)',
  bitonal: 'grayscale(1) contrast(8) brightness(1)',
};

function sourceUrl(baseUrl) {
  if (!baseUrl) return '';
  return `${baseUrl}/full/!${SOURCE_SIZE_HINT},${SOURCE_SIZE_HINT}/0/default.jpg`;
}

function drawPreview(canvas, img, region, rotation, scale) {
  if (!canvas || !img) return;
  const cw = img.naturalWidth;
  const ch = img.naturalHeight;
  const r = region || { x: 0, y: 0, w: 100, h: 100 };
  const sx = (r.x / 100) * cw;
  const sy = (r.y / 100) * ch;
  const sw = (r.w / 100) * cw;
  const sh = (r.h / 100) * ch;
  if (sw <= 0 || sh <= 0) return;

  const aspect = sw / sh;
  let outW;
  let outH;
  if (aspect >= 1) {
    outW = Math.min(PREVIEW_MAX_SIDE, sw);
    outH = outW / aspect;
  } else {
    outH = Math.min(PREVIEW_MAX_SIDE, sh);
    outW = outH * aspect;
  }
  // Apply user scale (visual hint of output size).
  outW = Math.max(1, Math.round((outW * scale) / 100));
  outH = Math.max(1, Math.round((outH * scale) / 100));

  const rot = ((rotation % 360) + 360) % 360;
  const swapped = rot === 90 || rot === 270;
  canvas.width = swapped ? outH : outW;
  canvas.height = swapped ? outW : outH;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(img, sx, sy, sw, sh, -outW / 2, -outH / 2, outW, outH);
  ctx.restore();
}

export default function CropperDialog({
  open,
  onClose,
  baseUrl,
  region,
  canvas,
  defaultQuality,
}) {
  const { t } = useTranslation();
  const [scale, setScale] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [quality, setQuality] = useState(defaultQuality);
  const [format, setFormat] = useState('jpg');
  const [copied, setCopied] = useState(false);

  const [sourceImg, setSourceImg] = useState(null);
  const [sourceState, setSourceState] = useState('idle'); // idle, loading, ready, error
  const previewCanvasRef = useRef(null);

  useEffect(() => {
    if (open) {
      setScale(100);
      setRotation(0);
      setQuality(defaultQuality);
      setFormat('jpg');
      setCopied(false);
    }
  }, [open, defaultQuality]);

  // Load the source image once per dialog session.
  useEffect(() => {
    if (!open || !baseUrl) return undefined;
    setSourceImg(null);
    setSourceState('loading');
    const img = new Image();
    // No crossOrigin: the IIIF endpoint may redirect to a non-CORS file
    // location, which would taint the canvas read APIs. Visual drawing
    // via drawImage still works on a tainted canvas, which is all the
    // preview needs.
    let cancelled = false;
    img.onload = () => {
      if (cancelled) return;
      setSourceImg(img);
      setSourceState('ready');
    };
    img.onerror = () => {
      if (cancelled) return;
      setSourceState('error');
    };
    img.src = sourceUrl(baseUrl);
    return () => { cancelled = true; };
  }, [open, baseUrl]);

  // Redraw the preview whenever source or parameters change.
  useEffect(() => {
    if (sourceState !== 'ready') return;
    drawPreview(previewCanvasRef.current, sourceImg, region, rotation, scale);
  }, [sourceImg, sourceState, region, rotation, scale]);

  const sizeStr = scale === 100 ? 'full' : `pct:${scale}`;

  const url = useMemo(
    () => buildIiifUrl({ baseUrl, region, size: sizeStr, rotation, quality, format }),
    [baseUrl, region, sizeStr, rotation, quality, format]
  );

  const pixels = pixelDimensions(canvas, region);
  const w = Math.round((pixels.w * scale) / 100);
  const h = Math.round((pixels.h * scale) / 100);
  const dimsLabel = (rotation === 90 || rotation === 270) ? `${h}×${w}` : `${w}×${h}`;

  const handleCopy = async () => {
    if (!url) return;
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        ok = true;
      }
    } catch (e) {
      ok = false;
    }
    if (!ok) {
      // Fallback for non-secure contexts (HTTP): use a transient textarea
      // and execCommand('copy'), which is still supported by every browser.
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand('copy');
      } catch (e) {
        ok = false;
      }
      document.body.removeChild(ta);
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const hasRegion = !!region;
  const filter = QUALITY_FILTER[quality] || 'none';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t('imageCropper_dialogTitle')}</DialogTitle>
      <DialogContent sx={{ overflowX: 'hidden' }}>
        {!hasRegion && (
          <Typography variant="body2" sx={{ mb: 2, color: 'warning.main' }}>
            {t('imageCropper_noRegion')}
          </Typography>
        )}
        <Box sx={{ mb: 2 }}>
          <FormLabel sx={{ display: 'block', mb: 0.5 }}>
            {t('imageCropper_url')}
          </FormLabel>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              value={url}
              fullWidth
              size="small"
              InputProps={{ readOnly: true }}
              onFocus={(e) => e.target.select()}
            />
            <IconButton
              onClick={handleCopy}
              aria-label={t('imageCropper_copy')}
              title={copied ? t('imageCropper_copied') : t('imageCropper_copy')}
              disabled={!url}
            >
              <ContentCopyIcon />
            </IconButton>
          </Box>
          {copied && (
            <Typography
              variant="caption"
              role="status"
              aria-live="polite"
              sx={{ display: 'block', mt: 0.5, color: 'success.main' }}
            >
              {t('imageCropper_copied')}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 3,
            alignItems: 'flex-start',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('imageCropper_options')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <FormLabel>{t('imageCropper_size')}</FormLabel>
                <Slider
                  value={scale}
                  onChange={(_, v) => setScale(v)}
                  min={1}
                  max={100}
                  valueLabelDisplay="auto"
                  valueLabelFormat={(v) => `${v}%`}
                />
                <Typography variant="caption">
                  {t('imageCropper_selectedSize')}: {scale}%
                  {hasRegion ? ` (${t('imageCropper_approx')} ${dimsLabel} ${t('imageCropper_pixel')})` : ''}
                </Typography>
              </Box>
              <FormControl>
                <FormLabel>{t('imageCropper_rotation')}</FormLabel>
                <RadioGroup
                  row
                  value={String(rotation)}
                  onChange={(e) => setRotation(Number(e.target.value))}
                >
                  {[0, 90, 180, 270].map((r) => (
                    <FormControlLabel
                      key={r}
                      value={String(r)}
                      control={<Radio size="small" />}
                      label={`${r}°`}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
              <FormControl>
                <FormLabel>{t('imageCropper_quality')}</FormLabel>
                <RadioGroup
                  row
                  value={quality}
                  onChange={(e) => setQuality(e.target.value)}
                >
                  <FormControlLabel value={defaultQuality} control={<Radio size="small" />} label={t('imageCropper_qualityDefault')} />
                  <FormControlLabel value="color" control={<Radio size="small" />} label={t('imageCropper_qualityColor')} />
                  <FormControlLabel value="gray" control={<Radio size="small" />} label={t('imageCropper_qualityGray')} />
                  <FormControlLabel value="bitonal" control={<Radio size="small" />} label={t('imageCropper_qualityBitonal')} />
                </RadioGroup>
              </FormControl>
              <FormControl>
                <FormLabel>{t('imageCropper_format')}</FormLabel>
                <RadioGroup
                  row
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  {FORMATS.map((f) => (
                    <FormControlLabel
                      key={f}
                      value={f}
                      control={<Radio size="small" />}
                      label={f}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </Box>
          </Box>
          <Box
            sx={{
              flex: { xs: '0 0 auto', md: '0 0 320px' },
              width: { xs: '100%', md: 320 },
            }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {t('imageCropper_preview')}
            </Typography>
            <Box
              sx={{
                width: '100%',
                height: 320,
                border: '1px solid #ddd',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fafafa',
                overflow: 'hidden',
              }}
            >
              {sourceState === 'loading' && <CircularProgress size={20} />}
              {sourceState === 'error' && (
                <Typography variant="body2" color="error">
                  {t('imageCropper_preview')}: ✗
                </Typography>
              )}
              {sourceState === 'ready' && hasRegion && (
                <canvas
                  ref={previewCanvasRef}
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    filter,
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          startIcon={<DownloadIcon />}
          href={url}
          download
          target="_blank"
          rel="noreferrer"
          disabled={!url}
          size="small"
        >
          {t('imageCropper_download')}
        </Button>
        <Button
          startIcon={<OpenInNewIcon />}
          href={url}
          target="_blank"
          rel="noreferrer"
          disabled={!url}
          size="small"
        >
          {t('imageCropper_openInNewTab')}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>{t('imageCropper_close')}</Button>
      </DialogActions>
    </Dialog>
  );
}
