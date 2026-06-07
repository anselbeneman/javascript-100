module.exports = function setupDevProjectFallback(app) {
  app.use((request, response, next) => {
    const isViewerRoute = request.method === 'GET'
      && /^\/project\/[^/.]+\/?$/.test(request.path || '');

    if (isViewerRoute) {
      request.url = '/index.html';
    }

    next();
  });
};
