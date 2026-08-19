// ===== THEME TOGGLE =====
const themeToggle = document.querySelector('.theme-toggle');
const body = document.body;

themeToggle.addEventListener('click', () => {
    const isDarkMode = body.classList.toggle('dark-mode');
    body.classList.toggle('light-mode');
    themeToggle.setAttribute('aria-pressed', isDarkMode);
    themeToggle.querySelector('.theme-icon').textContent = isDarkMode ? '🌙' : '☀️';
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
});

// Charger le thème sauvegardé
const savedTheme = localStorage.getItem('theme') || 'dark';
if (savedTheme === 'light') {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
    themeToggle.setAttribute('aria-pressed', false);
    themeToggle.querySelector('.theme-icon').textContent = '☀️';
}

// ===== NAVIGATION ACTIVE =====
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('section');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - sectionHeight / 3) {
            current = section.getAttribute('id');
        }
    });

    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('href').slice(1) === current) {
            item.classList.add('active');
            item.setAttribute('aria-current', 'page');
        } else {
            item.removeAttribute('aria-current');
        }
    });
});

// ===== CARROUSEL FONCTIONNALITÉS =====
const carousel = document.querySelector('.carousel');
const carouselItems = document.querySelectorAll('.carousel-item');
const prevBtn = document.querySelector('.carousel-prev');
const nextBtn = document.querySelector('.carousel-next');
const indicators = document.querySelectorAll('.indicator');

let currentIndex = 0;
const itemWidth = 280 + 24; // largeur + gap

function updateCarouselPosition() {
    carousel.scrollLeft = currentIndex * itemWidth;
    updateIndicators();
}

function updateIndicators() {
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentIndex);
    });
}

prevBtn?.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + carouselItems.length) % carouselItems.length;
    updateCarouselPosition();
});

nextBtn?.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % carouselItems.length;
    updateCarouselPosition();
});

indicators.forEach((indicator) => {
    indicator.addEventListener('click', (e) => {
        currentIndex = parseInt(e.target.getAttribute('data-index'));
        updateCarouselPosition();
    });
});

// Clavier : flèches gauche/droite
document.addEventListener('keydown', (e) => {
    if (document.activeElement === carousel || carousel.contains(document.activeElement)) {
        if (e.key === 'ArrowLeft') {
            prevBtn?.click();
        } else if (e.key === 'ArrowRight') {
            nextBtn?.click();
        }
    }
});

// ===== ONGLETS SOUS-NAV =====
const tabs = document.querySelectorAll('.tab');
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
    });

    // Clavier : Tab + Flèches
    tab.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            const nextTab = tab.nextElementSibling;
            if (nextTab?.classList.contains('tab')) nextTab.click();
        } else if (e.key === 'ArrowLeft') {
            const prevTab = tab.previousElementSibling;
            if (prevTab?.classList.contains('tab')) prevTab.click();
        }
    });
});