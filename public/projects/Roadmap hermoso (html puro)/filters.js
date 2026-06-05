export function applyFilters() {
  const materiaSelected = document.getElementById('materias-selected').textContent.toLowerCase();
  const tipoSelected = document.getElementById('tipos-selected').textContent.toLowerCase();
  const semanaSelected = parseInt(document.getElementById('semana-input').value);
  const searchTerm = document.querySelector('.search-input').value.toLowerCase();

  document.querySelectorAll('.card').forEach(card => {
    let showCard = true;

    if (materiaSelected !== 'todos') {
      const cardMateria = card.dataset.materia.toLowerCase();
      if (cardMateria !== materiaSelected) showCard = false;
    }

    if (tipoSelected !== 'todos') {
      const cardTipo = card.dataset.tipo.toLowerCase();
      if (cardTipo !== tipoSelected) showCard = false;
    }

    if (semanaSelected > 0) {
      const cardSemanas = card.dataset.semanas.split(',').map(s => parseInt(s));
      if (!cardSemanas.includes(semanaSelected)) showCard = false;
    }

    if (searchTerm) {
      if (!card.textContent.toLowerCase().includes(searchTerm)) showCard = false;
    }

    card.classList.toggle('hidden', !showCard);
  });
}