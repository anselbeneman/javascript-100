(function exposeCanvasPresenter(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.RayCanvasPresenter = api;
}(typeof self !== 'undefined' ? self : globalThis, function createCanvasPresenterModule() {
  'use strict';

  /**
   * Creates a presentation layer for progressive path tracing samples.
   * @param {Object} options
   * @param {CanvasRenderingContext2D} options.context
   * @param {function(number, number, number): number} options.toByte
   * @param {function(function(): void): number} options.requestFrame
   * @returns {Object}
   */
  function createCanvasPresenter(options) {
    const context = options.context;
    const toByte = options.toByte;
    const requestFrame = options.requestFrame;
    const presenter = {
      width: 0,
      height: 0,
      accumulation: null,
      sampleCounts: null,
      imageData: null,
      denoiseBuffer: null,
      dirtyBounds: null,
      paintScheduled: false,
    };

    function reset(width, height) {
      presenter.width = width;
      presenter.height = height;
      presenter.accumulation = new Float32Array(width * height * 3);
      presenter.sampleCounts = new Uint16Array(width * height);
      presenter.imageData = context.createImageData(width, height);
      presenter.denoiseBuffer = context.createImageData(width, height);
      presenter.dirtyBounds = null;
      presenter.paintScheduled = false;
      context.fillStyle = '#050608';
      context.fillRect(0, 0, width, height);
    }

    function mergeTile(tile, pixels) {
      const tileWidth = tile.x1 - tile.x0;
      let sourceIndex = 0;

      for (let y = tile.y0; y < tile.y1; y += 1) {
        for (let x = tile.x0; x < tile.x1; x += 1) {
          const pixelIndex = y * presenter.width + x;
          const targetIndex = pixelIndex * 3;
          presenter.accumulation[targetIndex] += pixels[sourceIndex];
          presenter.accumulation[targetIndex + 1] += pixels[sourceIndex + 1];
          presenter.accumulation[targetIndex + 2] += pixels[sourceIndex + 2];
          presenter.sampleCounts[pixelIndex] += 1;
          sourceIndex += 3;
        }

        sourceIndex += (tileWidth - (tile.x1 - tile.x0)) * 3;
      }
    }

    function drawAccumulation(settings) {
      const data = presenter.imageData.data;
      const exposure = settings.exposure;
      const contrast = settings.contrast;

      for (let i = 0, j = 0; i < presenter.accumulation.length; i += 3, j += 4) {
        const pixelIndex = i / 3;
        const invSample = 1 / Math.max(1, presenter.sampleCounts[pixelIndex]);
        data[j] = toByte(presenter.accumulation[i] * invSample, exposure, contrast);
        data[j + 1] = toByte(presenter.accumulation[i + 1] * invSample, exposure, contrast);
        data[j + 2] = toByte(presenter.accumulation[i + 2] * invSample, exposure, contrast);
        data[j + 3] = 255;
      }

      if (settings.denoiseEnabled && settings.sample >= 4) {
        applyDenoise();
      }

      presenter.dirtyBounds = null;
      presenter.paintScheduled = false;
      context.putImageData(presenter.imageData, 0, 0);
    }

    function drawTile(tile, settings) {
      const data = presenter.imageData.data;
      const exposure = settings.exposure;
      const contrast = settings.contrast;

      for (let y = tile.y0; y < tile.y1; y += 1) {
        for (let x = tile.x0; x < tile.x1; x += 1) {
          const pixelIndex = y * presenter.width + x;
          const accumulationIndex = pixelIndex * 3;
          const imageIndex = pixelIndex * 4;
          const invSample = 1 / Math.max(1, presenter.sampleCounts[pixelIndex]);
          data[imageIndex] = toByte(presenter.accumulation[accumulationIndex] * invSample, exposure, contrast);
          data[imageIndex + 1] = toByte(presenter.accumulation[accumulationIndex + 1] * invSample, exposure, contrast);
          data[imageIndex + 2] = toByte(presenter.accumulation[accumulationIndex + 2] * invSample, exposure, contrast);
          data[imageIndex + 3] = 255;
        }
      }

      markDirty(tile);
    }

    function markDirty(tile) {
      if (!presenter.dirtyBounds) {
        presenter.dirtyBounds = {
          x0: tile.x0,
          y0: tile.y0,
          x1: tile.x1,
          y1: tile.y1,
        };
      } else {
        presenter.dirtyBounds.x0 = Math.min(presenter.dirtyBounds.x0, tile.x0);
        presenter.dirtyBounds.y0 = Math.min(presenter.dirtyBounds.y0, tile.y0);
        presenter.dirtyBounds.x1 = Math.max(presenter.dirtyBounds.x1, tile.x1);
        presenter.dirtyBounds.y1 = Math.max(presenter.dirtyBounds.y1, tile.y1);
      }

      schedulePaint();
    }

    function schedulePaint() {
      if (presenter.paintScheduled) {
        return;
      }

      presenter.paintScheduled = true;
      requestFrame(flushPaint);
    }

    function flushPaint() {
      presenter.paintScheduled = false;
      if (!presenter.dirtyBounds) {
        return;
      }

      const bounds = presenter.dirtyBounds;
      presenter.dirtyBounds = null;
      context.putImageData(
        presenter.imageData,
        0,
        0,
        bounds.x0,
        bounds.y0,
        bounds.x1 - bounds.x0,
        bounds.y1 - bounds.y0
      );
    }

    function applyDenoise() {
      const source = presenter.imageData.data;
      const target = presenter.denoiseBuffer.data;
      target.set(source);

      for (let y = 1; y < presenter.height - 1; y += 1) {
        for (let x = 1; x < presenter.width - 1; x += 1) {
          const pixelIndex = y * presenter.width + x;

          if (presenter.sampleCounts[pixelIndex] < 4) {
            continue;
          }

          const imageIndex = pixelIndex * 4;
          const centerLuma = byteLuminance(source, imageIndex);
          let weightSum = 0;
          let red = 0;
          let green = 0;
          let blue = 0;

          for (let oy = -1; oy <= 1; oy += 1) {
            for (let ox = -1; ox <= 1; ox += 1) {
              const neighborPixel = (y + oy) * presenter.width + (x + ox);

              if (presenter.sampleCounts[neighborPixel] === 0) {
                continue;
              }

              const neighborIndex = neighborPixel * 4;
              const spatialWeight = ox === 0 && oy === 0 ? 4 : (ox === 0 || oy === 0 ? 2 : 1);
              const lumaDistance = Math.abs(byteLuminance(source, neighborIndex) - centerLuma) / 255;
              const edgeWeight = Math.max(0.12, 1 - lumaDistance * 3.2);
              const weight = spatialWeight * edgeWeight;

              red += source[neighborIndex] * weight;
              green += source[neighborIndex + 1] * weight;
              blue += source[neighborIndex + 2] * weight;
              weightSum += weight;
            }
          }

          target[imageIndex] = Math.round(red / weightSum);
          target[imageIndex + 1] = Math.round(green / weightSum);
          target[imageIndex + 2] = Math.round(blue / weightSum);
          target[imageIndex + 3] = 255;
        }
      }

      source.set(target);
    }

    function getSampleCount(pixelIndex) {
      return presenter.sampleCounts[pixelIndex];
    }

    return {
      drawAccumulation,
      drawTile,
      getSampleCount,
      mergeTile,
      reset,
    };
  }

  /**
   * @param {Uint8ClampedArray} data
   * @param {number} index
   * @returns {number}
   */
  function byteLuminance(data, index) {
    return data[index] * 0.2126 + data[index + 1] * 0.7152 + data[index + 2] * 0.0722;
  }

  return {
    byteLuminance,
    createCanvasPresenter,
  };
}));
