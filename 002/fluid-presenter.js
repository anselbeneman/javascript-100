(function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function clamp01(value) {
    return clamp(Number.isFinite(value) ? value : 0, 0, 1);
  }

  function hexToRgb(hex) {
    const value = String(hex || '#ffffff').replace('#', '');
    const normalized = /^[0-9a-f]{6}$/i.test(value) ? value : 'ffffff';
    const number = Number.parseInt(normalized, 16);

    return [
      ((number >> 16) & 255) / 255,
      ((number >> 8) & 255) / 255,
      (number & 255) / 255,
    ];
  }

  function fitCanvasToDisplay(canvas, devicePixelRatio, maxPixelRatio = 2) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, maxPixelRatio);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    const changed = canvas.width !== width || canvas.height !== height;

    if (changed) {
      canvas.width = width;
      canvas.height = height;
    }

    return {
      changed,
      width,
      height,
      ratio,
    };
  }

  function pointFromRect(event, rect) {
    const width = Math.max(1, rect.width || 1);
    const height = Math.max(1, rect.height || 1);

    return {
      x: clamp01((event.clientX - rect.left) / width),
      y: clamp01((event.clientY - rect.top) / height),
    };
  }

  function pickPaletteColor(palette, random = Math.random) {
    const colors = Array.isArray(palette) && palette.length > 0 ? palette : ['#ffffff'];
    const index = clamp(Math.floor(random() * colors.length), 0, colors.length - 1);
    return hexToRgb(colors[index]);
  }

  function createSplat({ x, y, dx = 0, dy = 0, pressure = 0.75, palette, random }) {
    return {
      x: clamp01(x),
      y: clamp01(y),
      dx: clamp(Number.isFinite(dx) ? dx : 0, -1, 1),
      dy: clamp(Number.isFinite(dy) ? dy : 0, -1, 1),
      pressure: clamp(Number.isFinite(pressure) ? pressure : 0.75, 0, 2),
      color: pickPaletteColor(palette, random),
    };
  }

  function drawPlaceholder(context, canvas) {
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'rgba(242, 201, 76, 0.24)');
    gradient.addColorStop(0.52, 'rgba(61, 220, 151, 0.14)');
    gradient.addColorStop(1, 'rgba(116, 216, 255, 0.12)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawObstacleOverlay(context, canvas, settings) {
    if (!settings.obstacle) {
      return;
    }

    const radius = Math.min(canvas.width, canvas.height) * 0.132;
    const x = canvas.width * 0.5;
    const y = canvas.height * 0.52;

    context.save();
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = 'rgba(8, 8, 7, 0.55)';
    context.strokeStyle = 'rgba(242, 201, 76, 0.48)';
    context.lineWidth = Math.max(1, canvas.width / 640);
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  }

  function drawVectorOverlay(context, canvas, settings, vectorSamples) {
    if (!settings.vectorOverlay || !vectorSamples) {
      return;
    }

    const vectors = vectorSamples.data;
    const sourceWidth = vectorSamples.width;
    const sourceHeight = vectorSamples.height;

    context.save();
    context.globalCompositeOperation = 'screen';
    context.strokeStyle = 'rgba(242, 201, 76, 0.62)';
    context.lineWidth = Math.max(1, canvas.width / 840);

    for (let index = 0; index < vectors.length; index += 4) {
      const x = vectors[index] * canvas.width;
      const y = vectors[index + 1] * canvas.height;
      const vx = vectors[index + 2];
      const vy = vectors[index + 3];
      const magnitude = Math.hypot(vx, vy);

      if (magnitude < 0.0008) {
        continue;
      }

      const length = Math.min(26, 6 + magnitude * 220) * (canvas.width / sourceWidth) * 0.08;
      const nx = vx / magnitude;
      const ny = vy / magnitude;
      const x2 = x + nx * length;
      const y2 = y + ny * length * (sourceWidth / sourceHeight);

      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x2, y2);
      context.stroke();
    }

    context.restore();
  }

  function drawBrushOverlay(context, canvas, settings, cursorPoint) {
    if (!settings.brushOverlay || !cursorPoint) {
      return;
    }

    const radius = Math.max(10, settings.radius * Math.min(canvas.width, canvas.height));
    const x = cursorPoint.x * canvas.width;
    const y = cursorPoint.y * canvas.height;

    context.save();
    context.strokeStyle = 'rgba(255, 255, 255, 0.34)';
    context.lineWidth = 1.5;
    context.setLineDash([6, 8]);
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function drawTraceOverlay(context, canvas, settings, replayTools, traceSource, progressIndex) {
    if (!settings.traceOverlay || !replayTools) {
      return;
    }

    const trace = replayTools.normalizeTrace(traceSource);

    if (!trace || trace.events.length === 0) {
      return;
    }

    const events = trace.events;
    const safeProgressIndex = Number.isFinite(progressIndex)
      ? clamp(Math.round(progressIndex), 0, events.length - 1)
      : events.length - 1;
    const first = events[0];
    const last = events[events.length - 1];
    const startX = first.x * canvas.width;
    const startY = first.y * canvas.height;
    const endX = last.x * canvas.width;
    const endY = last.y * canvas.height;
    const lineWidth = Math.max(2, canvas.width / 420);

    context.save();
    context.globalCompositeOperation = 'screen';
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.shadowColor = 'rgba(116, 216, 255, 0.45)';
    context.shadowBlur = Math.max(8, canvas.width / 110);
    context.lineWidth = lineWidth;

    if (events.length > 1) {
      const gradient = context.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, 'rgba(61, 220, 151, 0.22)');
      gradient.addColorStop(0.55, 'rgba(116, 216, 255, 0.62)');
      gradient.addColorStop(1, 'rgba(242, 201, 76, 0.72)');
      context.strokeStyle = gradient;
      context.beginPath();
      events.forEach((event, index) => {
        const x = event.x * canvas.width;
        const y = event.y * canvas.height;

        if (index === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      });
      context.stroke();
    }

    context.shadowBlur = 0;
    context.fillStyle = 'rgba(61, 220, 151, 0.86)';
    context.beginPath();
    context.arc(startX, startY, Math.max(4, lineWidth * 1.9), 0, Math.PI * 2);
    context.fill();

    context.fillStyle = 'rgba(242, 201, 76, 0.92)';
    context.beginPath();
    context.arc(endX, endY, Math.max(4, lineWidth * 2.1), 0, Math.PI * 2);
    context.fill();

    const progressEvent = events[safeProgressIndex];
    context.strokeStyle = 'rgba(255, 255, 255, 0.86)';
    context.lineWidth = Math.max(1.5, lineWidth * 0.5);
    context.beginPath();
    context.arc(
      progressEvent.x * canvas.width,
      progressEvent.y * canvas.height,
      Math.max(7, lineWidth * 3),
      0,
      Math.PI * 2,
    );
    context.stroke();

    context.restore();
  }

  function createCanvasPresenter({ canvas, context, renderCanvas, renderContext, replayTools }) {
    return {
      resize(devicePixelRatio) {
        return fitCanvasToDisplay(canvas, devicePixelRatio).changed;
      },
      drawFrame({ settings, imageData, vectorSamples, cursorPoint, trace, traceProgressIndex }) {
        context.fillStyle = settings.background;
        context.fillRect(0, 0, canvas.width, canvas.height);

        if (!imageData) {
          drawPlaceholder(context, canvas);
          return;
        }

        if (renderCanvas.width !== imageData.width || renderCanvas.height !== imageData.height) {
          renderCanvas.width = imageData.width;
          renderCanvas.height = imageData.height;
        }

        renderContext.putImageData(imageData, 0, 0);
        context.imageSmoothingEnabled = true;
        context.drawImage(renderCanvas, 0, 0, canvas.width, canvas.height);
        drawObstacleOverlay(context, canvas, settings);
        drawVectorOverlay(context, canvas, settings, vectorSamples);
        drawBrushOverlay(context, canvas, settings, cursorPoint);
        drawTraceOverlay(context, canvas, settings, replayTools, trace, traceProgressIndex);
      },
    };
  }

  window.FluidPresenterTools = Object.freeze({
    clamp01,
    createCanvasPresenter,
    createSplat,
    fitCanvasToDisplay,
    hexToRgb,
    pickPaletteColor,
    pointFromRect,
  });
}());
