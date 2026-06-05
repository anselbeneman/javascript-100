import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Hub = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetch('/projects.json')
      .then(res => {
        if (!res.ok) throw new Error('Could not load projects manifest');
        return res.json();
      })
      .then(data => {
        setProjects(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const categories = ['All', ...new Set(projects.map(p => p.category).filter(Boolean))];

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="hub-status">Loading projects...</div>;
  if (error) return <div className="hub-status error">Error: {error}</div>;

  const emptyMessage = projects.length === 0
    ? 'No projects published yet. Project 001 is next.'
    : 'No projects found matching your criteria.';

  return (
    <div className="hub-container">
      <header className="hub-header">
        <h1>JS Project Hub</h1>
        <p>JavaScript practice projects organized in one viewer</p>

        <div className="hub-controls">
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="Search projects..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="category-filters">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="projects-grid">
        {filteredProjects.length > 0 ? (
          filteredProjects.map(project => (
            <Link
              key={project.id}
              to={`/project/${project.id}`}
              className="project-card"
            >
              <div className="project-info">
                <div className="card-header">
                  <span className="project-id">{project.id}</span>
                  {project.category && <span className="project-tag">{project.category}</span>}
                </div>
                <h3 className="project-name">{project.name}</h3>
                <p className="project-desc">{project.description}</p>
              </div>
            </Link>
          ))
        ) : (
          <div className="no-results">{emptyMessage}</div>
        )}
      </div>
    </div>
  );
};

export default Hub;
