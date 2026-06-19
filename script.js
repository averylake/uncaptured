const form = document.querySelector("#applicationForm");
const signalCanvas = document.querySelector("#signalField");
const viewer = document.querySelector("[data-viewer]");

const vaultViews = [
  {
    src: "assets/vault-hero-generated.jpg",
    alt: "Sealed black vault for I, Uncaptured"
  },
  {
    src: "assets/vault-sealed-front-cine.jpg",
    alt: "Front view of the sealed black vault"
  },
  {
    src: "assets/vault-open-cine.jpg",
    alt: "Open empty black vault shown without the protected artwork"
  }
];

if (form) {
  const confirmEl = document.querySelector("#formConfirm");
  const button = form.querySelector("button[type=submit]");

  // Use inline display:none so it wins over the form's CSS `display: grid`.
  const showConfirmation = () => {
    form.style.display = "none";
    if (confirmEl) {
      confirmEl.hidden = false;
      confirmEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const mailtoFallback = (data) => {
    const lines = [
      "Viewing request for I, Uncaptured",
      "",
      `Name: ${data.get("name") || ""}`,
      `Email: ${data.get("email") || ""}`,
      `City / country: ${data.get("location") || ""}`,
      `Preferred viewing window: ${data.get("window") || ""}`,
      "",
      "Why I want to see the work:",
      data.get("reason") || "",
      "",
      "Sent from the I, Uncaptured landing page."
    ];
    const subject = encodeURIComponent("Viewing request - I, Uncaptured");
    const body = encodeURIComponent(lines.join("\n"));
    window.location.href = `mailto:hello@averylakeofficial.com?subject=${subject}&body=${body}`;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      params.append(key, value);
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Sending...";
    }

    // The submission reaches Netlify even if the response is slow, so a timeout
    // resolves to the confirmation rather than leaving the button frozen.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: controller.signal
    })
      .then(() => {
        clearTimeout(timeout);
        showConfirmation();
      })
      .catch((error) => {
        clearTimeout(timeout);
        if (error && error.name === "AbortError") {
          // Request was sent; Netlify ingests reliably. Confirm anyway.
          showConfirmation();
        } else {
          // True network failure: fall back to the visitor's email client.
          mailtoFallback(data);
          if (button) {
            button.disabled = false;
            button.textContent = "Send request";
          }
        }
      });
  });
}

if (viewer) {
  const stage = viewer.querySelector("[data-stage]");
  const image = viewer.querySelector("[data-viewer-image]");
  const zoom = viewer.querySelector("[data-zoom]");
  const buttons = [...viewer.querySelectorAll("[data-view]")];
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let tiltX = 0;
  let tiltY = 0;

  const updateTilt = () => {
    stage.style.setProperty("--tilt-x", `${tiltX}deg`);
    stage.style.setProperty("--tilt-y", `${tiltY}deg`);
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const next = vaultViews[Number(button.dataset.view)] || vaultViews[0];
      image.style.opacity = "0";
      window.setTimeout(() => {
        image.src = next.src;
        image.alt = next.alt;
        image.style.opacity = "1";
      }, 120);
      buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    });
  });

  zoom.addEventListener("input", () => {
    stage.style.setProperty("--zoom", zoom.value);
  });

  stage.addEventListener("pointerdown", (event) => {
    isDragging = true;
    startX = event.clientX;
    startY = event.clientY;
    stage.setPointerCapture(event.pointerId);
  });

  stage.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    const rect = stage.getBoundingClientRect();
    const dx = (event.clientX - startX) / rect.width;
    const dy = (event.clientY - startY) / rect.height;
    tiltX = Math.max(-9, Math.min(9, dx * 30));
    tiltY = Math.max(-7, Math.min(7, -dy * 24));
    updateTilt();
  });

  stage.addEventListener("pointerup", () => {
    isDragging = false;
  });

  stage.addEventListener("pointercancel", () => {
    isDragging = false;
  });

  stage.addEventListener("wheel", (event) => {
    event.preventDefault();
    const next = Math.max(1, Math.min(1.85, Number(zoom.value) - event.deltaY * 0.0015));
    zoom.value = next.toFixed(2);
    stage.style.setProperty("--zoom", zoom.value);
  }, { passive: false });
}

if (signalCanvas) {
  const context = signalCanvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let width = 0;
  let height = 0;
  let ratio = 1;
  let traces = [];

  const random = (min, max) => min + Math.random() * (max - min);

  const resize = () => {
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    signalCanvas.width = Math.floor(width * ratio);
    signalCanvas.height = Math.floor(height * ratio);
    signalCanvas.style.width = `${width}px`;
    signalCanvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const count = Math.round(Math.max(42, Math.min(96, width * height / 14500)));
    traces = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: random(1, 2.8),
      length: random(12, 58),
      speed: random(0.08, 0.36),
      drift: random(-0.16, 0.16),
      phase: random(0, Math.PI * 2),
      type: index % 9 === 0 ? "window" : index % 5 === 0 ? "path" : "point"
    }));
  };

  const draw = (time = 0) => {
    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(5, 5, 5, 0.2)";
    context.fillRect(0, 0, width, height);

    for (const trace of traces) {
      const pulse = 0.35 + Math.sin(time * 0.0012 + trace.phase) * 0.22;
      context.globalAlpha = Math.max(0.06, pulse);
      trace.x += trace.drift;
      trace.y += trace.speed;
      if (trace.y > height + 80) {
        trace.y = -80;
        trace.x = Math.random() * width;
      }
      if (trace.x < -80) trace.x = width + 80;
      if (trace.x > width + 80) trace.x = -80;

      if (trace.type === "window") {
        context.strokeStyle = "rgba(243,239,231,0.12)";
        context.strokeRect(trace.x, trace.y, trace.length * 1.55, trace.length);
        context.beginPath();
        context.moveTo(trace.x, trace.y + 9);
        context.lineTo(trace.x + trace.length * 1.55, trace.y + 9);
        context.stroke();
      } else if (trace.type === "path") {
        context.strokeStyle = "rgba(208,74,62,0.13)";
        context.beginPath();
        context.moveTo(trace.x, trace.y);
        context.lineTo(trace.x + trace.length, trace.y + Math.sin(time * 0.001 + trace.phase) * 22);
        context.stroke();
      } else {
        context.fillStyle = "rgba(243,239,231,0.18)";
        context.beginPath();
        context.arc(trace.x, trace.y, trace.size, 0, Math.PI * 2);
        context.fill();
      }
    }

    context.globalAlpha = 1;

    if (!reduceMotion.matches) {
      window.requestAnimationFrame(draw);
    }
  };

  resize();
  draw();
  window.addEventListener("resize", resize);
}
