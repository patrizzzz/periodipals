// Mascot pose/state logic for lively mascot

// Get mascot sprite element
const mascotSprite = document.querySelector('.mascot-sprite');

// Set mascot state/pose (neutral, pointing, presenting, listening)
function setMascotState(state) {
    if (!mascotSprite) return;
    mascotSprite.classList.remove('neutral', 'pointing', 'presenting', 'listening');
    mascotSprite.classList.add(state);
}

// Example: Change pose on hover/click (customize as needed)
document.addEventListener('DOMContentLoaded', function() {
    if (!mascotSprite) return;
    mascotSprite.classList.add('neutral'); // Default pose
    mascotSprite.addEventListener('mouseenter', () => setMascotState('presenting'));
    mascotSprite.addEventListener('mouseleave', () => setMascotState('neutral'));
    mascotSprite.addEventListener('click', () => setMascotState('pointing'));
});