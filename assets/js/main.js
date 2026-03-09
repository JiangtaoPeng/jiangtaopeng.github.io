// 🌿 Green Healing Blog - Main JavaScript

document.addEventListener('DOMContentLoaded', () => {

  // --- Mobile Menu Toggle ---
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      const isOpen = navLinks.classList.contains('active');
      menuToggle.setAttribute('aria-expanded', isOpen);
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('active');
      }
    });
  }

  // --- Scroll Header Shadow ---
  const header = document.querySelector('.site-header');
  if (header) {
    const updateHeaderShadow = () => {
      if (window.scrollY > 10) {
        header.style.boxShadow = '0 2px 16px rgba(46, 61, 47, 0.08)';
      } else {
        header.style.boxShadow = 'none';
      }
    };
    window.addEventListener('scroll', updateHeaderShadow, { passive: true });
    updateHeaderShadow();
  }

  // --- Smooth Scroll to Anchors ---
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // --- Image Lazy Loading Enhancement ---
  if ('IntersectionObserver' in window) {
    const imgObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'scale(1)';
          imgObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.prose img, .post-cover img').forEach(img => {
      img.style.opacity = '0';
      img.style.transform = 'scale(0.98)';
      img.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      imgObserver.observe(img);
    });
  }

  // --- Reading Progress Bar for Posts ---
  const postContent = document.querySelector('.post-content');
  if (postContent) {
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      position: fixed; top: 0; left: 0; height: 3px; z-index: 200;
      background: linear-gradient(to right, #81c784, #66bb6a, #43a047);
      width: 0%; transition: width 0.1s ease;
      border-radius: 0 2px 2px 0;
    `;
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
      const rect = postContent.getBoundingClientRect();
      const total = postContent.scrollHeight;
      const visible = window.innerHeight;
      const scrolled = -rect.top;
      const progress = Math.min(Math.max(scrolled / (total - visible) * 100, 0), 100);
      progressBar.style.width = progress + '%';
    }, { passive: true });
  }

  console.log('🌿 Green Healing Blog loaded successfully');
});

