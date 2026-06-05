import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const Viewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [projectExists, setProjectExists] = useState(true);

  useEffect(() => {
    fetch('/projects.json')
      .then(res => res.json())
      .then(projects => {
        const exists = projects.some(p => p.id === id);
        setProjectExists(exists);
      })
      .catch(() => setProjectExists(false));
  }, [id]);

  if (!projectExists) {
    return (
      <div className="viewer-error">
        <div className="error-content">
          <h1>404</h1>
          <p>Project "{id}" not found.</p>
          <button onClick={() => navigate('/')} className="back-button">
            Return to Hub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`viewer-container ${isFullscreen ? 'fullscreen' : ''}`}>
      {!isFullscreen && (
        <div className="viewer-toolbar">
          <button onClick={() => navigate('/')} className="back-button">
            ← Back to Hub
          </button>
          <div className="project-title">Project: {id}</div>
          <button
            onClick={() => setIsFullscreen(true)}
            className="fullscreen-btn"
            title="Enter Fullscreen"
          >
            ⛶
          </button>
        </div>
      )}
      <div className="viewer-content">
        <iframe
          src={`/projects/${id}/index.html`}
          title={`Project ${id}`}
          sandbox="allow-scripts allow-same-origin"
          className="project-iframe"
        />
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="exit-fullscreen-btn"
            title="Exit Fullscreen"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default Viewer;
