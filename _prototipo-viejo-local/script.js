// 1. HAMBURGER MENU TOGGLE
const hamburger = document.getElementById('hamburger-btn');
const navMenu = document.getElementById('nav-menu');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
    });
}

function toggleMenu() {
    if (navMenu && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
    }
}

// 2. CHICAGO TIME CHECK (Central Time)
function checkShopStatus() {
    const options = { timeZone: 'America/Chicago', hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' };
    const formatter = new Intl.DateTimeFormat([], options);
    const parts = formatter.formatToParts(new Date());
    
    let weekday = '', hour = 0;
    parts.forEach(p => {
        if (p.type === 'weekday') weekday = p.value;
        if (p.type === 'hour') hour = parseInt(p.value, 10);
    });

    // Schedule: Tue - Sat, 12 PM - 7 PM (12:00 to 19:00)
    const isOpenDay = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'].includes(weekday);
    const isOpenHour = hour >= 12 && hour < 19;
    const isOpen = isOpenDay && isOpenHour;

    const dot = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    const footerText = document.getElementById('footer-status');

    if (isOpen) {
        if (dot) dot.style.backgroundColor = 'var(--status-open)';
        if (text) text.innerText = 'Open Now (Tue-Sat 12-7pm)';
        if (footerText) footerText.innerText = '● Open Now - Walk-ins Welcome';
    } else {
        if (dot) dot.style.backgroundColor = 'var(--status-closed)';
        if (text) text.innerText = 'Closed Now (Opens Tue at 12pm)';
        if (footerText) footerText.innerText = '● Closed Now - Opens Tuesday at 12:00 PM';
    }
}

// Run status check on load
checkShopStatus();

// 3. GALLERY FILTERS
function filterGallery(category, evt) {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (evt && evt.target) {
        evt.target.classList.add('active');
    }

    const items = document.querySelectorAll('.gallery-item');
    items.forEach(item => {
        if (category === 'all' || item.getAttribute('data-category') === category) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// 4. LIGHTBOX VIA CLONE NODE
function openLightbox(element) {
    const lightbox = document.getElementById('lightbox');
    const target = document.getElementById('lightbox-target');
    if (lightbox && target) {
        target.innerHTML = ''; 
        const clone = element.cloneNode(true);
        clone.style.width = '100%';
        clone.style.height = 'auto';
        clone.style.maxHeight = '80vh';
        target.appendChild(clone);
        lightbox.classList.add('active');
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('active');
    }
}