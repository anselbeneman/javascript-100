import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Hub from './Hub';
import Viewer from './Viewer';

const AppRouter = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/project/:id" element={<Viewer />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
