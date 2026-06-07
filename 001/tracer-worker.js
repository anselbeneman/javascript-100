importScripts('render-core.js');

const { renderTile } = self.RayTracerCore;

let cancelledJobId = -1;

self.onmessage = (event) => {
  const message = event.data;

  if (message.type === 'cancel') {
    cancelledJobId = Math.max(cancelledJobId, message.jobId);
    return;
  }

  if (message.type === 'render') {
    const result = renderTile(message, {
      shouldCancel: jobId => jobId <= cancelledJobId,
    });

    if (result) {
      self.postMessage(result, [result.pixels.buffer]);
    }
  }
};
