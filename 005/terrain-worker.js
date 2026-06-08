importScripts('terrain-core.js');

self.onmessage = function handleTerrainMessage(event) {
  const message = event.data || {};

  if (message.type !== 'render') {
    return;
  }

  try {
    const result = self.TerrainCore.renderTerrain(message.config || {});

    self.postMessage(
      {
        type: 'terrain',
        jobId: message.jobId,
        pixels: result.pixels.buffer,
        heightMap: result.heightMap.buffer,
        moistureMap: result.moistureMap.buffer,
        slopeMap: result.slopeMap.buffer,
        config: result.config,
        stats: result.stats,
      },
      [
        result.pixels.buffer,
        result.heightMap.buffer,
        result.moistureMap.buffer,
        result.slopeMap.buffer,
      ],
    );
  } catch (error) {
    self.postMessage({
      type: 'error',
      jobId: message.jobId,
      message: error && error.message ? error.message : 'Unknown terrain error',
    });
  }
};
