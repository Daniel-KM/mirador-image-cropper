import { getWindow, getWindowConfig, updateWindow } from 'mirador';
import MiradorImageCropper from './plugins/MiradorImageCropper.jsx';
import MiradorImageCropperMenuItem from './plugins/MiradorImageCropperMenuItem.jsx';
import translations from './translations.js';

function selectCanvas(state, windowId) {
  try {
    const win = getWindow(state, { windowId });
    if (!win) return null;
    const manifest = state.manifests?.[win.manifestId]?.json;
    if (!manifest) return null;
    const items = manifest.items || manifest.sequences?.[0]?.canvases || [];
    return items.find((c) => (c.id || c['@id']) === win.canvasId) || items[0] || null;
  } catch (e) {
    return null;
  }
}

export const miradorImageCropperPlugin = [
  {
    target: 'OpenSeadragonViewer',
    mode: 'wrap',
    component: MiradorImageCropper,
    config: { translations },
    mapDispatchToProps: { updateWindow },
    mapStateToProps: (state, { targetProps: { windowId } }) => ({
      enabled: getWindowConfig(state, { windowId }).imageCropperEnabled || false,
      canvas: selectCanvas(state, windowId),
    }),
  },
  {
    target: 'WindowTopBarPluginMenu',
    mode: 'add',
    component: MiradorImageCropperMenuItem,
    config: { translations },
    mapDispatchToProps: { updateWindow },
    mapStateToProps: (state, { windowId }) => ({
      enabled: getWindowConfig(state, { windowId }).imageCropperEnabled || false,
    }),
  },
];

export default miradorImageCropperPlugin;
