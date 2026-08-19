// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Charger la préférence sauvegardée
const savedTheme = localStorage.getItem('theme') || 'dark-mode';
body.classList.add(savedTheme);

// Toggle du thème
themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    body.classList.toggle('light-mode');
    
    const newTheme = body.classList.contains('dark-mode') ? 'dark-mode' : 'light-mode';
    localStorage.setItem('theme', newTheme);
});

// Smooth Scroll pour les ancres
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Accessibility: Clavier
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll(':focus').forEach(el => el.blur());
    }
});