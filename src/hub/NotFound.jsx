import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="viewer-error">
      <div className="error-content">
        <h1>404</h1>
        <p>Route "{location.pathname}" does not exist.</p>
        <button type="button" onClick={() => navigate('/')} className="back-button">
          Return to Hub
        </button>
      </div>
    </div>
  );
};

export default NotFound;
