(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  if (isTouch) document.body.classList.add("is-touch");

  /* ---------- Smooth scroll (Lenis + GSAP) ---------- */
  let lenis;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -20 });
      else target.scrollIntoView({ behavior: "smooth", block: "start" });
      closeMobileNav();
    });
  });

  /* ---------- Progress + header state ---------- */
  const progressEl = document.querySelector(".page-progress span");
  const header = document.querySelector(".header");
  const heroEl = document.querySelector(".hero");
  const updateProgress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const value = max > 0 ? (window.scrollY / max) * 100 : 0;
    if (progressEl) progressEl.style.width = `${value}%`;
    const switchAt = heroEl ? Math.max(160, heroEl.offsetHeight * 0.45) : 80;
    header?.classList.toggle("is-scrolled", window.scrollY > switchAt);
  };
  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();

  /* ---------- Custom cursor ---------- */
  const cursor = document.querySelector(".cursor");
  const cursorDot = document.querySelector(".cursor-dot");
  if (!isTouch && !reduceMotion && cursor && cursorDot) {
    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const mouse = { x: pos.x, y: pos.y };

    window.addEventListener("mousemove", (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      cursorDot.style.transform = `translate(${mouse.x}px, ${mouse.y}px) translate(-50%, -50%)`;
    });

    gsap.ticker.add(() => {
      pos.x += (mouse.x - pos.x) * 0.18;
      pos.y += (mouse.y - pos.y) * 0.18;
      cursor.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
    });

    document.querySelectorAll("a, button, .pass-option, .route-card, .icon-btn").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (!isTouch && !reduceMotion) {
    document.querySelectorAll("[data-magnetic]").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(btn, { x: x * 0.22, y: y * 0.28, duration: 0.35, ease: "power3.out" });
      });
      btn.addEventListener("mouseleave", () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.55, ease: "elastic.out(1, 0.4)" });
      });
    });
  }

  /* ---------- Mobile nav ---------- */
  const toggle = document.querySelector(".nav-toggle");
  const mobileNav = document.getElementById("mobileNav");

  function closeMobileNav() {
    if (!mobileNav || !toggle) return;
    mobileNav.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  }

  if (toggle && mobileNav) {
    toggle.addEventListener("click", () => {
      const open = mobileNav.hidden;
      mobileNav.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---------- Widget tabs ---------- */
  const tabs = document.querySelectorAll(".widget-tab");
  const panelPass = document.getElementById("panelPass");
  const panelTo = document.getElementById("panelTo");

  function switchTab(name) {
    tabs.forEach((tab) => {
      const active = tab.dataset.tab === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });

    const showPass = name === "pass";
    panelPass.hidden = !showPass;
    panelTo.hidden = showPass;
    panelPass.classList.toggle("is-active", showPass);
    panelTo.classList.toggle("is-active", !showPass);

    if (!reduceMotion) {
      const active = showPass ? panelPass : panelTo;
      gsap.fromTo(
        active,
        { autoAlpha: 0, y: 16 },
        { autoAlpha: 1, y: 0, duration: 0.45, ease: "power3.out" }
      );
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  document.querySelectorAll("[data-switch-tab]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab(el.getAttribute("data-switch-tab"));
      const widget = document.getElementById("widget");
      if (lenis) lenis.scrollTo(widget, { offset: -20 });
      else widget.scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ---------- Tariff selection & pricing ---------- */
  const tariffs = {
    single: 450,
    day: 1290,
    month: 4900,
  };

  const vehicleMul = {
    car: 1,
    suv: 1.15,
    van: 1.35,
    truck: 1.8,
  };

  const routeMul = {
    m11: 1,
    m12: 1.1,
    ckad: 0.85,
    m4: 0.95,
    western: 1.05,
  };

  const passPriceEl = document.getElementById("passPrice");
  const passForm = document.getElementById("panelPass");

  function formatRub(n) {
    return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
  }

  function updatePassPrice() {
    if (!passForm || !passPriceEl) return;
    const tariff = passForm.querySelector('input[name="tariff"]:checked')?.value || "single";
    const vehicle = passForm.querySelector('select[name="vehicle"]')?.value || "car";
    const route = passForm.querySelector('select[name="route"]')?.value || "m11";
    const price = tariffs[tariff] * (vehicleMul[vehicle] || 1) * (routeMul[route] || 1);
    passPriceEl.textContent = formatRub(price);
  }

  passForm?.querySelectorAll('input[name="tariff"]').forEach((input) => {
    input.addEventListener("change", () => {
      passForm.querySelectorAll(".pass-option").forEach((opt) => {
        opt.classList.toggle("is-selected", opt.querySelector("input").checked);
      });
      updatePassPrice();
    });
  });

  passForm?.querySelectorAll("select").forEach((sel) => {
    sel.addEventListener("change", updatePassPrice);
  });

  updatePassPrice();

  /* Default date = tomorrow */
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const iso = tomorrow.toISOString().slice(0, 10);
  passForm?.querySelector('input[name="date"]')?.setAttribute("value", iso);
  panelTo?.querySelector('input[name="visit"]')?.setAttribute("value", iso);

  /* ---------- Forms ---------- */
  const toast = document.getElementById("toast");
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.hidden = false;
    toast.textContent = message;
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => {
        toast.hidden = true;
      }, 300);
    }, 3200);
  }

  function normalizePlate(value) {
    return value.trim().toUpperCase().replace(/\s+/g, " ");
  }

  passForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(passForm);
    const plate = normalizePlate(String(data.get("plate") || ""));
    if (plate.length < 6) {
      showToast("Укажите корректный госномер");
      return;
    }
    showToast(`Пропуск оформлен для ${plate}. Чек отправлен на почту.`);
    passForm.reset();
    passForm.querySelector('input[name="date"]').value = iso;
    passForm.querySelector('input[name="tariff"][value="single"]').checked = true;
    passForm.querySelectorAll(".pass-option").forEach((opt) => {
      opt.classList.toggle("is-selected", opt.querySelector("input").checked);
    });
    updatePassPrice();
  });

  panelTo?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(panelTo);
    const phone = String(data.get("phone") || "").trim();
    const time = data.get("time");
    if (phone.replace(/\D/g, "").length < 11) {
      showToast("Укажите телефон в формате +7…");
      return;
    }
    showToast(`Запись на техосмотр подтверждена на ${time}.`);
    panelTo.reset();
    panelTo.querySelector('input[name="visit"]').value = iso;
  });

  /* ---------- Routes slider ---------- */
  const track = document.getElementById("routesTrack");
  document.getElementById("routesPrev")?.addEventListener("click", () => {
    track?.scrollBy({ left: -320, behavior: "smooth" });
  });
  document.getElementById("routesNext")?.addEventListener("click", () => {
    track?.scrollBy({ left: 320, behavior: "smooth" });
  });

  /* ---------- Lead modal ---------- */
  const leadModal = document.getElementById("leadModal");
  const leadForm = document.getElementById("leadForm");
  const leadType = document.getElementById("leadType");
  const leadTitle = document.getElementById("leadTitle");

  const leadCopy = {
    pass: {
      title: "Получить пропуск",
      text: "Оставьте контакты — подберём тариф и отправим пропуск.",
    },
    to: {
      title: "Запись на техосмотр",
      text: "Перезвоним, подтвердим пункт и удобный слот.",
    },
    callback: {
      title: "Оставить заявку",
      text: "Перезвоним за 2 минуты и поможем оформить услугу.",
    },
  };

  function openLead(type = "callback") {
    if (!leadModal) return;
    const conf = leadCopy[type] || leadCopy.callback;
    if (leadType) leadType.value = type;
    if (leadTitle) leadTitle.textContent = conf.title;
    const textEl = leadModal.querySelector(".lead-modal__text");
    if (textEl) textEl.textContent = conf.text;
    leadModal.hidden = false;
    document.body.classList.add("lead-open");
    if (!reduceMotion) {
      gsap.fromTo(
        ".lead-modal__dialog",
        { y: 28, autoAlpha: 0, scale: 0.96 },
        { y: 0, autoAlpha: 1, scale: 1, duration: 0.4, ease: "power3.out" }
      );
      gsap.fromTo(".lead-modal__backdrop", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 });
    }
    leadForm?.querySelector('input[name="name"]')?.focus();
  }

  function closeLead() {
    if (!leadModal) return;
    const finish = () => {
      leadModal.hidden = true;
      document.body.classList.remove("lead-open");
    };
    if (reduceMotion) {
      finish();
      return;
    }
    gsap.to(".lead-modal__dialog", {
      y: 16,
      autoAlpha: 0,
      duration: 0.25,
      ease: "power2.in",
    });
    gsap.to(".lead-modal__backdrop", {
      autoAlpha: 0,
      duration: 0.25,
      onComplete: finish,
    });
  }

  document.querySelectorAll("[data-lead-open]").forEach((btn) => {
    btn.addEventListener("click", () => openLead(btn.getAttribute("data-lead-type") || "callback"));
  });
  document.querySelectorAll("[data-lead-close]").forEach((el) => {
    el.addEventListener("click", closeLead);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && leadModal && !leadModal.hidden) closeLead();
  });

  leadForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(leadForm);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    if (name.length < 2) {
      showToast("Укажите имя");
      return;
    }
    if (phone.replace(/\D/g, "").length < 11) {
      showToast("Укажите телефон в формате +7…");
      return;
    }
    closeLead();
    leadForm.reset();
    showToast(`${name}, заявка принята. Мы скоро свяжемся.`);
  });

  /* ---------- GSAP animations ---------- */
  gsap.registerPlugin(ScrollTrigger);

  if (reduceMotion) {
    document.querySelectorAll("[data-reveal]").forEach((el) => {
      el.style.opacity = "1";
      el.style.transform = "none";
    });
    return;
  }

  const heroTl = gsap.timeline({ defaults: { ease: "power3.out" } });
  heroTl
    .from(".header__inner > *", { y: -16, autoAlpha: 0, duration: 0.5, stagger: 0.05 }, 0)
    .from(".hero__col", {
      yPercent: 34,
      autoAlpha: 0,
      scaleY: 0.82,
      duration: 1.25,
      stagger: 0.1,
      ease: "expo.out",
      transformOrigin: "50% 100%",
    }, 0.08)
    .from(".hero__slit", {
      scaleY: 0,
      autoAlpha: 0,
      duration: 0.9,
      stagger: 0.1,
      ease: "expo.out",
      transformOrigin: "50% 50%",
    }, 0.28)
    .from(".hero__title", { y: 36, autoAlpha: 0, duration: 0.75 }, 0.5)
    .from(".hero__lead", { y: 20, autoAlpha: 0, duration: 0.55 }, 0.62)
    .from(".hero__actions .btn", { y: 18, autoAlpha: 0, duration: 0.5, stagger: 0.08 }, 0.72)
    .from(".hero__words li", { y: 16, autoAlpha: 0, duration: 0.45, stagger: 0.06 }, 0.68);

  /* Idle float of columns */
  gsap.utils.toArray(".hero__col").forEach((col, i) => {
    gsap.to(col, {
      y: i % 2 === 0 ? -10 : 8,
      duration: 3.2 + i * 0.35,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
      delay: i * 0.2,
    });
  });

  /* Slits breathe / wave */
  gsap.utils.toArray(".hero__slit-beam").forEach((beam, i) => {
    gsap.to(beam, {
      scaleX: 1.35,
      opacity: 0.95,
      duration: 1.8 + i * 0.25,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
      delay: i * 0.3,
    });
  });

  gsap.to(".hero__col-media img", {
    yPercent: 12,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });

  /* Interactive hero: mouse parallax, hot slits, column focus */
  const heroSection = document.querySelector(".hero");
  const heroGlow = document.querySelector(".hero__glow");
  const heroCols = gsap.utils.toArray(".hero__col");
  const heroSlits = gsap.utils.toArray(".hero__slit");
  const heroWords = gsap.utils.toArray(".hero__words li");

  if (heroSection && !isTouch) {
    const onMove = (e) => {
      const rect = heroSection.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      if (heroGlow) {
        gsap.to(heroGlow, {
          left: `${e.clientX - rect.left}px`,
          top: `${e.clientY - rect.top}px`,
          opacity: 0.75,
          duration: 0.6,
          ease: "power2.out",
          overwrite: "auto",
        });
      }

      heroCols.forEach((col, i) => {
        const img = col.querySelector("img");
        const offsetX = (x - 0.5) * 18 * (i % 2 === 0 ? 1 : -1);
        const offsetY = (y - 0.5) * 14;
        gsap.to(img, {
          x: offsetX,
          y: offsetY,
          scale: 1.08,
          duration: 0.7,
          ease: "power3.out",
          overwrite: "auto",
        });
        gsap.to(col, {
          y: (y - 0.5) * (6 + i * 2) * (i % 2 === 0 ? -1 : 1),
          duration: 0.7,
          ease: "power3.out",
          overwrite: "auto",
        });
      });

      heroSlits.forEach((slit, i) => {
        const slitRect = slit.getBoundingClientRect();
        const cx = slitRect.left + slitRect.width / 2;
        const dist = Math.abs(e.clientX - cx);
        const hot = dist < 90;
        slit.classList.toggle("is-hot", hot);
        gsap.to(slit.querySelector(".hero__slit-beam"), {
          scaleX: hot ? 1.8 : 1,
          opacity: hot ? 1 : 0.65,
          duration: 0.35,
          overwrite: "auto",
        });
        if (heroWords[i]) heroWords[i].classList.toggle("is-active", hot);
      });
    };

    heroSection.addEventListener("mousemove", onMove);
    heroSection.addEventListener("mouseleave", () => {
      heroSlits.forEach((slit) => slit.classList.remove("is-hot"));
      heroWords.forEach((w) => w.classList.remove("is-active"));
      heroCols.forEach((col) => col.classList.remove("is-hot"));
      if (heroGlow) gsap.to(heroGlow, { opacity: 0.4, duration: 0.5 });
      gsap.to(".hero__col-media img", { x: 0, y: 0, scale: 1.04, duration: 0.8, ease: "power3.out" });
    });

    heroCols.forEach((col) => {
      col.addEventListener("mouseenter", () => {
        heroCols.forEach((c) => c.classList.toggle("is-hot", c === col));
        gsap.to(col, { scaleY: 1.03, duration: 0.45, ease: "power3.out" });
        heroCols.filter((c) => c !== col).forEach((c) => {
          gsap.to(c, { scaleY: 0.97, opacity: 0.82, duration: 0.45, ease: "power3.out" });
        });
      });
      col.addEventListener("mouseleave", () => {
        col.classList.remove("is-hot");
        gsap.to(heroCols, { scaleY: 1, opacity: 1, duration: 0.5, ease: "power3.out" });
      });
      col.addEventListener("click", () => openLead("pass"));
    });
  }

  gsap.utils.toArray(".stat").forEach((stat) => {
    const strong = stat.querySelector("strong");
    if (!strong) return;
    const raw = strong.textContent.trim();
    const num = parseFloat(raw.replace(/[^\d.]/g, ""));
    const suffix = raw.replace(/[\d.\s]/g, "");
    if (!num) return;

    ScrollTrigger.create({
      trigger: stat,
      start: "top 85%",
      once: true,
      onEnter: () => {
        const obj = { val: 0 };
        gsap.to(obj, {
          val: num,
          duration: 1.4,
          ease: "power2.out",
          onUpdate: () => {
            const rounded = Number.isInteger(num) ? Math.round(obj.val) : obj.val.toFixed(0);
            strong.textContent = `${rounded}${suffix}`;
          },
        });
      },
    });
  });

  gsap.from(".about__copy > *", {
    scrollTrigger: { trigger: ".about", start: "top 75%" },
    y: 28,
    autoAlpha: 0,
    duration: 0.7,
    stagger: 0.1,
    ease: "power3.out",
  });

  gsap.from(".stat", {
    scrollTrigger: { trigger: ".stats", start: "top 80%" },
    y: 36,
    autoAlpha: 0,
    duration: 0.7,
    stagger: 0.1,
    ease: "power3.out",
  });

  gsap.from(".trust__logos span", {
    scrollTrigger: { trigger: ".trust", start: "top 85%" },
    y: 12,
    autoAlpha: 0,
    duration: 0.45,
    stagger: 0.06,
    ease: "power2.out",
  });

  gsap.from(".bento__main", {
    scrollTrigger: { trigger: ".widget-section", start: "top 70%" },
    y: 40,
    autoAlpha: 0,
    duration: 0.85,
    ease: "power3.out",
  });

  gsap.from(".side-card", {
    scrollTrigger: { trigger: ".bento__side", start: "top 75%" },
    y: 40,
    autoAlpha: 0,
    duration: 0.75,
    stagger: 0.12,
    ease: "power3.out",
  });

  gsap.from(".route-card", {
    scrollTrigger: { trigger: ".routes", start: "top 75%" },
    y: 48,
    autoAlpha: 0,
    duration: 0.75,
    stagger: 0.1,
    ease: "power3.out",
  });

  gsap.from(".process__visual", {
    scrollTrigger: { trigger: ".process", start: "top 70%" },
    x: -40,
    autoAlpha: 0,
    duration: 0.9,
    ease: "power3.out",
  });

  gsap.from(".process__list li", {
    scrollTrigger: { trigger: ".process__list", start: "top 75%" },
    x: 30,
    autoAlpha: 0,
    duration: 0.65,
    stagger: 0.12,
    ease: "power3.out",
  });

  gsap.from(".process__badge", {
    scrollTrigger: { trigger: ".process__visual", start: "top 70%" },
    scale: 0.6,
    autoAlpha: 0,
    duration: 0.8,
    ease: "back.out(1.6)",
    delay: 0.2,
  });

  gsap.from(".cta-band__inner", {
    scrollTrigger: { trigger: ".cta-band", start: "top 80%" },
    y: 36,
    autoAlpha: 0,
    duration: 0.8,
    ease: "power3.out",
  });

})();
