/ ===========================
// THEME TOGGLE
// ===========================
const themeToggle = document.getElementById('theme-toggle');
const htmlElement = document.documentElement;

// Charger le thème sauvegardé (ou par défaut dark)
const savedTheme = localStorage.getItem('theme') || 'dark-mode';
htmlElement.classList.add(savedTheme);
updateThemeButton(savedTheme);

themeToggle.addEventListener('click', () => {
  const currentTheme = htmlElement.classList.contains('dark-mode') ? 'dark-mode' : 'light-mode';
  const newTheme = currentTheme === 'dark-mode' ? 'light-mode' : 'dark-mode';
  
  htmlElement.classList.remove(currentTheme);
  htmlElement.classList.add(newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeButton(newTheme);
});

function updateThemeButton(theme) {
  themeToggle.textContent = theme === 'dark-mode' ? 'LIGHT' : 'DARK';
}

// ===========================
// HAMBURGER MENU TOGGLE
// ===========================
const hamburger = document.getElementById('hamburger-toggle');
const sideNav = document.querySelector('.side-nav');

hamburger.addEventListener('click', () => {
  sideNav.classList.toggle('mobile-open');
  hamburger.classList.toggle('active');
});

// Fermer le menu quand on clique sur un lien
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    sideNav.classList.remove('mobile-open');
    hamburger.classList.remove('active');
  });
});

// ===========================
// ACTIVE NAV ITEM ON SCROLL
// ===========================
const sections = document.querySelectorAll('main > section');
const navLinks = document.querySelectorAll('.nav-links a');

function updateActiveNav() {
  let currentSection = '';
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    
    if (window.scrollY >= sectionTop - 100) {
      currentSection = section.id;
    }
  });
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('data-target') === currentSection) {
      link.classList.add('active');
    }
  });
}

window.addEventListener('scroll', updateActiveNav);
updateActiveNav(); // Appel initial

// ===========================
// SMOOTH SCROLL
// ===========================
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.getAttribute('data-target');
    const section = document.getElementById(target);
    
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ===========================
// FORM VALIDATION (Contact)
// ===========================
const contactForm = document.querySelector('form');

if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = contactForm.querySelector('input[name="name"]')?.value.trim();
    const email = contactForm.querySelector('input[name="email"]')?.value.trim();
    const message = contactForm.querySelector('textarea[name="message"]')?.value.trim();
    
    // Validation simple
    if (!name || !email || !message) {
      alert('Veuillez remplir tous les champs.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Veuillez entrer une adresse email valide.');
      return;
    }
    
    // Succès (tu peux intégrer un backend ici plus tard)
    alert('Message envoyé ! Merci de nous avoir contactés.');
    contactForm.reset();
  });
}

// ===========================
// INTERSECTION OBSERVER (pour animations au scroll)
// ===========================
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
    }
  });
}, observerOptions);

// Observer tous les éléments avec la classe 'fade-in' (optionnel)
document.querySelectorAll('.fade-in, section').forEach(el => {
  observer.observe(el);
});