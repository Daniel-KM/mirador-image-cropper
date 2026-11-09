Image Cropper (plugin for Mirador)
==================================

This [Mirador] plugin allows to select a region of an image and to get its
[IIIF Image API] url, to copy, open or download it.

## Features

- Region selection over the OpenSeadragon viewer: draw a region, then move or
  resize it with the pointer.
- Dialog with the IIIF url of the region (`pct:x,y,w,h`), with options:
  - size (percentage of the selected region, with the size in pixels);
  - rotation (0, 90, 180, 270);
  - quality (default, color, grayscale, bitonal);
  - format.
- Preview, copy to clipboard, open in a new tab and download.
- Support of the IIIF Image API 2 and 3.
- Translations: English, German, French and Breton.

## Compatibility

- Mirador 4.0 or later
- React 18 or 19
- MUI 7 or 9

## Installation

```sh
npm install https://gitlab.com/Sempia/mirador-image-cropper/-/archive/main/mirador-image-cropper-main.tar.gz
```

The release archives are published with the [module Mirador] for [Omeka S] too.

## Usage

```js
import Mirador from 'mirador';
import miradorImageCropperPlugin from 'mirador-image-cropper';

Mirador.viewer({
  id: 'viewer',
  windows: [{ manifestId: 'https://example.org/iiif/manifest.json' }],
}, [...miradorImageCropperPlugin]);
```

The plugin adds the item "Toggle image cropping" in the window menu. The
selection can be enabled by default with the window option `imageCropperEnabled`:

```js
window: {
  imageCropperEnabled: true,
},
```

## Code

This plugin is a full rewrite for Mirador 4 of the idea of [@dbmdz/mirador-imagecropper]
2.4.6, a plugin for Mirador 2 built with jQuery and Handlebars. This module is
written with React, MUI and the plugin api of Mirador 4.

It is a source-only ESM package: there is no build step, the bundler of the host
project (Vite, Webpack…) consumes `src/` directly, so the plugin shares the same
React, MUI and Mirador as the viewer.

## License

This plugin is published under the [MIT] license.

## Copyright

Copyright Daniel Berthereau, 2026 (see [Daniel-KM])

The original idea comes from the plugin [@dbmdz/mirador-imagecropper]
of the Bavarian State Library (dbmdz), published under the MIT license too.


[Mirador]: https://projectmirador.org
[IIIF Image API]: https://iiif.io/api/image/3.0
[@dbmdz/mirador-imagecropper]: https://github.com/dbmdz/mirador-plugins/tree/main/ImageCropper
[module Mirador]: https://gitlab.com/Daniel-KM/Omeka-S-module-Mirador
[OmekaS]: https://omeka.org/s
[MIT]: https://opensource.org/licenses/MIT
[Daniel-KM]: https://gitlab.com/Daniel-KM "Daniel Berthereau"
