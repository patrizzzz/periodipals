// menu-carousel.js: Dota 2 hero picker style carousel effect

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.module-grid');
  const cards = Array.from(document.querySelectorAll('.module-card'));

  function updateActiveCard() {
    const gridRect = grid.getBoundingClientRect();
    let minDist = Infinity;
    let activeIdx = 0;
    cards.forEach((card, idx) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const gridCenter = gridRect.left + gridRect.width / 2;
      const dist = Math.abs(cardCenter - gridCenter);
      if (dist < minDist) {
        minDist = dist;
        activeIdx = idx;
      }
    });
    cards.forEach((card, idx) => {
      card.classList.remove('active', 'left', 'right');
      if (idx === activeIdx) {
        card.classList.add('active');
      } else if (idx === activeIdx - 1) {
        card.classList.add('left');
      } else if (idx === activeIdx + 1) {
        card.classList.add('right');
      }
    });
  }

  // Initial state
  updateActiveCard();

  // Update on scroll
  grid.addEventListener('scroll', () => {
    window.requestAnimationFrame(updateActiveCard);
  });

  // Optional: Snap to center on click
  cards.forEach(card => {
    card.addEventListener('click', e => {
      const gridRect = grid.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const scrollLeft = grid.scrollLeft + (cardRect.left + cardRect.width/2) - (gridRect.left + gridRect.width/2);
      grid.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    });
  });
});