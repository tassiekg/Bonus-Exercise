/* ============================================================
   Miami Freshman Field Guide | Hands-on JavaScript demonstrations
   No framework needed beyond Materialize CSS component library.
   Each feature checks for its own page elements before running.
   ============================================================ */
'use strict';

// Initialize Materialize's interactive components once the HTML has loaded.
document.addEventListener('DOMContentLoaded', function () {
  if (window.M) {
    M.Sidenav.init(document.querySelectorAll('.sidenav'), { edge: 'right' });
    M.Dropdown.init(document.querySelectorAll('.dropdown-trigger'), {
      coverTrigger: false,
      constrainWidth: false,
      alignment: 'left'
    });
    M.Collapsible.init(document.querySelectorAll('.collapsible'), { accordion: true });
    M.Tabs.init(document.querySelectorAll('.tabs'));
    M.Modal.init(document.querySelectorAll('.modal'));
    M.Tooltip.init(document.querySelectorAll('.tooltipped'));
    M.FormSelect.init(document.querySelectorAll('select'));
  }

  initializeCampusCarousel();
  initializeChecklist();
  initializeDiningFilter();
  initializeCampusSearch();
  initializeRoommatePrompt();
  initializeClubFinder();
  initializeFAQForm();
});

function showToast(message) {
  if (window.M && typeof M.toast === 'function') {
    M.toast({ html: message, classes: 'rounded', displayLength: 2400 });
  }
}

/* 0. HERO CAMPUS SLIDESHOW: Materialize Carousel Slider with autoplay & controls */
function initializeCampusCarousel() {
  const carouselEl = document.querySelector('[data-campus-carousel]');
  if (!carouselEl || !window.M || !M.Carousel) return;

  const instance = M.Carousel.init(carouselEl, {
    fullWidth: true,
    indicators: true,
    duration: 320
  });

  const prevBtn = document.getElementById('heroSlidePrev');
  const nextBtn = document.getElementById('heroSlideNext');
  const frame = carouselEl.closest('.hero-visual-frame') || carouselEl;
  const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let autoplayTimer = null;

  function startAutoplay() {
    if (prefersReducedMotion || autoplayTimer) return;
    autoplayTimer = window.setInterval(function () {
      instance.next();
    }, 4500);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      stopAutoplay();
      instance.prev();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      stopAutoplay();
      instance.next();
    });
  }

  frame.addEventListener('mouseenter', stopAutoplay);
  frame.addEventListener('mouseleave', startAutoplay);
  frame.addEventListener('focusin', stopAutoplay);
  frame.addEventListener('focusout', startAutoplay);

  window.addEventListener('resize', function () {
    if (instance && typeof instance.set === 'function') {
      instance.set(instance.center);
    }
  });

  startAutoplay();
}

/* 1. CHECKLIST: conditionals, arrays, localStorage, DOM updates */
function initializeChecklist() {
  const checklist = document.querySelector('[data-checklist]');
  if (!checklist) return; // Do nothing if this isn't checklist.html.

  const boxes = Array.from(checklist.querySelectorAll('input[type="checkbox"]'));
  const number = document.getElementById('completedNumber');
  const percent = document.getElementById('completedPercent');
  const progress = document.getElementById('checklistProgress');
  const donut = document.getElementById('progressDonut');
  const announcement = document.getElementById('checklistAnnouncement');
  const storageKey = 'miami-freshman-guide-checklist-v1';

  // A defensive wrapper: some private browser modes can disallow localStorage.
  function readSaved() {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); }
    catch (error) { return {}; }
  }
  function saveCurrent() {
    const state = {};
    boxes.forEach(function (box) { state[box.id] = box.checked; });
    try { localStorage.setItem(storageKey, JSON.stringify(state)); }
    catch (error) { /* The checklist still works during this visit. */ }
  }
  function updateProgress() {
    const complete = boxes.filter(function (box) { return box.checked; }).length;
    const value = Math.round((complete / boxes.length) * 100);
    number.textContent = complete + ' of ' + boxes.length + ' completed';
    percent.textContent = value + '%';
    progress.style.width = value + '%';
    donut.style.setProperty('--progress', value + '%');
    donut.setAttribute('aria-valuenow', String(value));
    announcement.textContent = value === 100
      ? 'You completed every practice checklist item. Great job!'
      : 'You have completed ' + complete + ' of ' + boxes.length + ' items.';
  }

  const saved = readSaved();
  boxes.forEach(function (box) {
    if (Object.prototype.hasOwnProperty.call(saved, box.id)) {
      box.checked = Boolean(saved[box.id]);
    }
    box.addEventListener('change', function () {
      saveCurrent();
      updateProgress();
    });
  });
  document.getElementById('resetChecklist').addEventListener('click', function () {
    boxes.forEach(function (box) { box.checked = false; });
    saveCurrent();
    updateProgress();
    showToast('Checklist reset');
  });
  updateProgress();
}

/* 2. DINING: filter cards by category AND typed search */
function initializeDiningFilter() {
  const root = document.querySelector('[data-dining-root]');
  if (!root) return;

  const filterButtons = Array.from(root.querySelectorAll('[data-filter]'));
  const cards = Array.from(root.querySelectorAll('[data-dining-category]'));
  const searchInput = document.getElementById('diningSearch');
  const count = document.getElementById('diningResultCount');
  const empty = document.getElementById('diningNoResults');
  let selectedCategory = 'all';

  function filterDining() {
    const term = searchInput.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach(function (card) {
      const categoryMatches = selectedCategory === 'all' || card.dataset.diningCategory === selectedCategory;
      const wordsMatch = (card.textContent + ' ' + (card.dataset.keywords || '')).toLowerCase().includes(term);
      card.hidden = !(categoryMatches && wordsMatch);
      if (!card.hidden) visible += 1;
    });
    count.textContent = 'Showing ' + visible + ' of ' + cards.length + ' places';
    empty.hidden = visible !== 0;
  }

  filterButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      selectedCategory = button.dataset.filter;
      filterButtons.forEach(function (item) {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      filterDining();
    });
  });
  searchInput.addEventListener('input', filterDining);
  filterDining();
}

/* 3. CAMPUS: instant directory search using DOM elements */
function initializeCampusSearch() {
  const input = document.getElementById('campusSearch');
  if (!input) return;
  const cards = Array.from(document.querySelectorAll('[data-campus-place]'));
  const count = document.getElementById('campusResultCount');
  const empty = document.getElementById('campusNoResults');

  function searchCampus() {
    const term = input.value.trim().toLowerCase();
    let matches = 0;
    cards.forEach(function (card) {
      const text = (card.textContent + ' ' + (card.dataset.keywords || '')).toLowerCase();
      card.hidden = !text.includes(term);
      if (!card.hidden) matches += 1;
    });
    count.textContent = matches + ' of ' + cards.length + ' places displayed';
    empty.hidden = matches !== 0;
  }
  input.addEventListener('input', searchCampus);
  searchCampus();
}

/* 4. HOUSING: random roommate icebreaker prompt */
function initializeRoommatePrompt() {
  const button = document.getElementById('roommatePromptButton');
  if (!button) return;
  const output = document.getElementById('roommatePromptOutput');
  const questions = [
    'What helps you focus when you are studying?',
    'What time do you usually like to go to sleep?',
    'How should we handle guests and quiet hours?',
    'What is one thing that makes a room feel like home?',
    'Would you rather plan shared cleaning or take turns?',
    'How should we communicate when something is bothering us?'
  ];
  let lastIndex = -1;
  button.addEventListener('click', function () {
    let index = Math.floor(Math.random() * questions.length);
    if (questions.length > 1 && index === lastIndex) index = (index + 1) % questions.length;
    lastIndex = index;
    output.textContent = questions[index];
  });
}

/* 5. CLUB FINDER: an array of recommendations + a select input */
function initializeClubFinder() {
  const picker = document.getElementById('clubInterest');
  if (!picker) return;
  const output = document.getElementById('clubRecommendation');
  const recommendations = {
    service: 'Start with a service or volunteer organization. Look for community projects and leadership opportunities at Mega Fair.',
    creative: 'Explore creative clubs: photography, music, theater, writing, film, or visual design. Meet students who love making things.',
    technology: 'Try a technology, analytics, coding, or entrepreneurship organization. Attend an introductory meeting and ask about beginner-friendly projects.',
    sports: 'Check out club sports, intramural activities, and recreation programs. Beginners are welcome in many groups.',
    culture: 'Explore international and cultural student groups, language communities, and heritage celebrations to build connections.'
  };
  picker.addEventListener('change', function () {
    const value = picker.value;
    output.textContent = recommendations[value] || 'Choose an interest above to see a starting idea.';
  });
}

/* 6. FAQ PRACTICE FORM: local validation only; NO message is sent */
function initializeFAQForm() {
  const form = document.getElementById('faqPracticeForm');
  if (!form) return;
  const status = document.getElementById('formStatus');
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const name = document.getElementById('formName').value.trim();
    const email = document.getElementById('formEmail').value.trim();
    const question = document.getElementById('formQuestion').value.trim();
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!name || !emailValid || question.length < 12) {
      status.style.color = '#a01632';
      status.textContent = 'Please enter your name, a valid email, and a question of at least 12 characters.';
      return;
    }
    status.style.color = '#1b7359';
    status.textContent = 'Form validated for ' + name + '. This is a class demo; your message was NOT sent.';
    showToast('Practice form validated — not sent');
    form.reset();
    if (window.M) M.updateTextFields();
  });
}