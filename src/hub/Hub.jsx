import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Hub = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetch('/projects.json', { cache: 'no-store' })
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
    const searchableText = [
      p.name,
      p.description,
      p.category,
      p.status,
      p.difficulty,
      ...(p.tech || []),
    ].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = searchableText.includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="hub-status" role="status">Loading projects...</div>;
  if (error) return <div className="hub-status error" role="alert">Error: {error}</div>;

  const emptyMessage = projects.length === 0
    ? 'No projects published yet.'
    : 'No projects found matching your criteria.';
  const projectCountLabel = `${filteredProjects.length} of ${projects.length} projects shown`;

  return (
    <div className="hub-container">
      <header className="hub-header" aria-labelledby="hub-title">
        <span className="hub-kicker">Vanilla JavaScript Portfolio</span>
        <h1 id="hub-title">JavaScript 100</h1>
        <p id="hub-description">Standalone browser projects by Ansel, organized as one public portfolio hub.</p>

        <div className="hub-controls">
          <div className="search-wrapper">
            <input
              type="search"
              aria-label="Search JavaScript projects"
              placeholder="Search JavaScript projects..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="category-filters" role="toolbar" aria-label="Filter projects by category">
            {categories.map(cat => (
              <button
                type="button"
                key={cat}
                className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                aria-pressed={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <p className="project-count" aria-live="polite">{projectCountLabel}</p>
      </header>

      <section className="projects-grid" aria-labelledby="projects-heading">
        <h2 id="projects-heading" className="sr-only">Projects</h2>
        {filteredProjects.length > 0 ? (
          filteredProjects.map(project => {
            const descriptionId = `project-${project.id}-description`;

            return (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="project-card"
                aria-label={`Open ${project.id} - ${project.name}`}
                aria-describedby={descriptionId}
              >
                <div className="project-info">
                  <div className="card-header">
                    <span className="project-id">{project.id}</span>
                    {project.category && <span className="project-tag">{project.category}</span>}
                  </div>
                  <h3 className="project-name">{project.name}</h3>
                  <p className="project-desc" id={descriptionId}>{project.description}</p>
                  <div className="project-footer">
                    <div className="project-meta" aria-label={`${project.status}, ${project.difficulty}`}>
                      {project.status && <span>{project.status}</span>}
                      {project.difficulty && <span>{project.difficulty}</span>}
                    </div>
                    {Array.isArray(project.tech) && (
                      <ul className="tech-list" aria-label="Technologies">
                        {project.tech.map(tech => (
                          <li key={tech}>{tech}</li>
                        ))}
                      </ul>
                    )}
                    <span className="project-action">Open project</span>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="no-results" role="status">{emptyMessage}</div>
        )}
      </section>
    </div>
  );
};

export default Hub;
