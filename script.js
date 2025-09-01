const canvas = document.getElementById("background");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// параметры частиц
let particles = [];
const particleCount = 400;
const mouse = { x: null, y: null, radius: 100 };

// resize
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  initParticles();
});

// mouse move
window.addEventListener("mousemove", (e) => {
  mouse.x = e.x;
  mouse.y = e.y;
});

// создание частиц
function initParticles() {
  particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1.2,
      vy: (Math.random() - 0.5) * 1.2,
      size: Math.random() * 3 + 1
    });
  }
}

function ShowText() {
  // List of element IDs in the order they should appear
  const elementIds = [
    "title",
    "titleAnim",
    "hr1",
    "aboutme",
    "aboutmeList",
    "age",
    "aspiring",
    "setup",
    "diving",
    "lang",
    "hr2",
    "skills",
    "skillsList",
    "Know",
    "Learn",
    "hr3",
    "connect",
    "connectLinks",
    "githubLink",
    "telegramUSRN",
    "gmail",
    "tgk",
    "connectList",
    "discord",
    "hr4",
    "FeaturedProjects",
    "featuredProjectsList",
    "klang",
    "create-cardboard",
    "WebCum",
    "KLTOOL",
    "site",
    "hr5",
    "streak",
    "streakImg",
    "hr6",
    "mostUsed",
    "mostUsedImg",
    "stats",
    "statsImg",
    "hr7",
    "visitors",
    "visitorsImg",
    "hr8",
    "fact",
    "factText",
    "hr9",
    "footer"
  ];

  // Initially set all elements to opacity 0
  elementIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.3s"; // Smooth transition
    }
  });

  // Sequentially fade in each element
  let delay = 0;
  const step = 80; // ms between each fade-in, adjust for speed

  elementIds.forEach((id, i) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.style.opacity = "1";
    }, delay);
    delay += step;
  });
}

// рисуем частицы
function drawParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let p of particles) {
    // движение
    p.x += p.vx;
    p.y += p.vy;

    // отскок
    if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
    if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

    // круг
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fill();

    // линии к мышке
    if (mouse.x && mouse.y) {
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < mouse.radius) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255,255,255,${1 - dist/mouse.radius})`;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }
    }
  }
}

// анимация
function animate() {
  drawParticles();
  requestAnimationFrame(animate);
}

// init
initParticles();
animate();
ShowText()

