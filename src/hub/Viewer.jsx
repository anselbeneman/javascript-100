import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const Viewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [projectExists, setProjectExists] = useState(true);
  const [projectName, setProjectName] = useState(id);
  const [manifestStatus, setManifestStatus] = useState('loading');
  const [iframeStatus, setIframeStatus] = useState('loading');
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    let active = true;

    setManifestStatus('loading');
    setProjectExists(true);
    setProjectName(id);
    setIframeStatus('loading');
    setIframeKey(0);

    fetch('/projects.json')
      .then(res => {
        if (!res.ok) throw new Error('Could not load projects manifest');
        return res.json();
      })
      .then(projects => {
        if (!active) return;

        const project = projects.find(p => p.id === id);
        setProjectExists(Boolean(project));
        setProjectName(project?.name || id);
        setManifestStatus('ready');
      })
      .catch(() => {
        if (!active) return;

        setProjectExists(false);
        setManifestStatus('error');
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (!projectExists || manifestStatus === 'error') {
    return (
      <div className="viewer-error">
        <div className="error-content">
          <h1>{manifestStatus === 'error' ? 'Error' : '404'}</h1>
          <p>
            {manifestStatus === 'error'
              ? 'Could not load the project registry.'
              : `Project "${id}" not found.`}
          </p>
          <button type="button" onClick={() => navigate('/')} className="back-button">
            Return to Hub
          </button>
        </div>
      </div>
    );
  }

  const retryIframe = () => {
    setIframeStatus('loading');
    setIframeKey(key => key + 1);
  };

  return (
    <div className={`viewer-container ${isFullscreen ? 'fullscreen' : ''}`}>
      {!isFullscreen && (
        <div className="viewer-toolbar" role="navigation" aria-label="Project viewer">
          <button type="button" onClick={() => navigate('/')} className="back-button">
            &lt; Back to Hub
          </button>
          <div className="project-title" aria-live="polite">{id} - {projectName}</div>
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="fullscreen-btn"
            aria-label="Enter fullscreen"
            title="Enter Fullscreen"
          >
            <span className="fullscreen-icon" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      )}
      <div className="viewer-content">
        {iframeStatus === 'loading' && (
          <div className="viewer-overlay" role="status" aria-live="polite">
            <span className="loader" aria-hidden="true" />
            <span>Loading {id} - {projectName}</span>
          </div>
        )}

        {iframeStatus === 'error' && (
          <div className="viewer-overlay viewer-overlay-error" role="alert">
            <strong>Project failed to load.</strong>
            <button type="button" onClick={retryIframe} className="overlay-action">
              Retry
            </button>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={`/projects/${id}/index.html`}
          title={`${id} - ${projectName}`}
          sandbox="allow-scripts allow-same-origin"
          className={`project-iframe ${iframeStatus !== 'ready' ? 'is-loading' : ''}`}
          onLoad={() => setIframeStatus('ready')}
          onError={() => setIframeStatus('error')}
        />
        {isFullscreen && (
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="exit-fullscreen-btn"
            aria-label="Exit fullscreen"
            title="Exit Fullscreen"
          >
            <span className="close-icon" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Viewer;
