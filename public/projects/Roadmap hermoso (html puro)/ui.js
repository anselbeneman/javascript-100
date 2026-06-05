import { applyFilters } from './filters.js';

// Toggle dropdown y seleccionar opción
document.querySelectorAll('.dropdown-select').forEach(dropdown => {
  dropdown.addEventListener('click', () => {
    const dropdownId = dropdown.dataset.dropdown;
    toggleDropdown(dropdownId);
  });
});

document.querySelectorAll('.dropdown-option').forEach(option => {
  option.addEventListener('click', (e) => {
    const dropdown = option.closest('.dropdown-menu');
    const dropdownId = dropdown.id.replace('-menu', '');
    selectOption(dropdownId, option.dataset.value, option);
  });
});

// Input semana y búsqueda
document.getElementById('semana-input').addEventListener('input', applyFilters);
document.querySelector('.search-input').addEventListener('input', applyFilters);

// Cerrar dropdowns al hacer click fuera
document.addEventListener('click', function(event) {
  if (!event.target.closest('.dropdown-container')) {
    document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('active'));
  }
});

function toggleDropdown(dropdownId) {
  const menu = document.getElementById(dropdownId + '-menu');
  const allMenus = document.querySelectorAll('.dropdown-menu');
  
  allMenus.forEach(m => { if (m !== menu) m.classList.remove('active'); });
  menu.classList.toggle('active');
}

function selectOption(dropdownId, value, element) {
  document.getElementById(dropdownId + '-selected').textContent = value;

  const menu = document.getElementById(dropdownId + '-menu');
  menu.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('selected'));
  element.classList.add('selected');
  menu.classList.remove('active');

  applyFilters();
}