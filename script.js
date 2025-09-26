/* ===========================================================
   Expansia – Front JS
   Conecta interacciones de UI y deja hooks listos para backend
   =========================================================== */

(function () {
  "use strict";

  /* -----------------------------------------
   * Config – editar cuando se conecte el dominio
   * ----------------------------------------- */
  const CONFIG = {
    DOMAIN: "https://www.expansia.com.ar",      // <-- cambiar cuando esté online
    API_BASE: "https://www.expansia.com.ar/api",// <-- ejemplo; ajustar
    CONTACT_ENDPOINT: "/contact",               // POST JSON {name,email,company,interest,message,utm}
    ENABLE_NETWORK: false,                      // poner true cuando el endpoint esté listo
  };

  /* -----------------------------------------
   * Helpers
   * ----------------------------------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const throttle = (fn, wait = 150) => {
    let waiting = false;
    return (...args) => {
      if (waiting) return;
      waiting = true;
      requestAnimationFrame(() => {
        fn(...args);
        setTimeout(() => (waiting = false), wait);
      });
    };
  };

  const getHeaderHeight = () => {
    const header = $(".site-header");
    return header ? header.offsetHeight : 0;
  };

  const smoothScrollTo = (targetEl) => {
    const headerOffset = getHeaderHeight() + 8; // pequeño margen
    const rect = targetEl.getBoundingClientRect();
    const offsetTop = window.pageYOffset + rect.top - headerOffset;

    window.scrollTo({
      top: offsetTop,
      behavior: "smooth",
    });
  };

  const getUTMs = () => {
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach((k) => {
      const v = params.get(k);
      if (v) utm[k] = v;
    });
    return utm;
  };

  const storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) { /* nada */ }
    },
  };

  /* -----------------------------------------
   * 1) Menú móvil
   * ----------------------------------------- */
  const initMobileMenu = () => {
    const toggle = $(".menu-toggle");
    const nav = $(".nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", () => {
      nav.classList.toggle("is-open");
    });

    // Cerrar nav al hacer click en un link
    nav.addEventListener("click", (e) => {
      if (e.target.tagName.toLowerCase() === "a") {
        nav.classList.remove("is-open");
      }
    });
  };

  /* -----------------------------------------
   * 2) Scroll suave con offset de header
   * ----------------------------------------- */
  const initSmoothScroll = () => {
    $$('a[href^="#"]').forEach((a) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;
      const target = $(href);
      if (!target) return;

      a.addEventListener("click", (e) => {
        e.preventDefault();
        smoothScrollTo(target);
        history.pushState(null, "", href);
      });
    });
  };

  /* -----------------------------------------
   * 3) Scroll Spy (resaltar sección activa)
   * ----------------------------------------- */
  const initScrollSpy = () => {
    const sections = [
      "#quienes-somos",
      "#servicios",
      "#inversores",
      "#expansion",
      "#logistica",
      "#oficinas",
      "#desarrollo",
      "#asset-management",
      "#marcas",
      "#contacto",
    ]
      .map((id) => $(id))
      .filter(Boolean);

    const navLinks = new Map();
    $$(".nav a").forEach((a) => {
      const href = a.getAttribute("href");
      if (href && href.startsWith("#")) navLinks.set(href, a);
    });

    const activate = (id) => {
      navLinks.forEach((link) => link.classList.remove("is-active"));
      const link = navLinks.get(id);
      if (link) link.classList.add("is-active");
    };

    const onScroll = throttle(() => {
      const headerOffset = getHeaderHeight() + 12;
      let currentId = "";
      sections.forEach((sec) => {
        const top = sec.getBoundingClientRect().top;
        if (top - headerOffset <= 0) currentId = `#${sec.id}`;
      });
      if (currentId) activate(currentId);
    }, 100);

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  };

  /* -----------------------------------------
   * 4) Año dinámico del footer
   * ----------------------------------------- */
  const initYear = () => {
    const y = $("#y");
    if (y) y.textContent = new Date().getFullYear();
  };

  /* -----------------------------------------
   * 5) UTM tracking (guarda en localStorage)
   * ----------------------------------------- */
  const initUTMTracking = () => {
    const utm = getUTMs();
    if (Object.keys(utm).length) {
      storage.set("expansia_utm", utm);
    }
  };

  /* -----------------------------------------
   * 6) Formulario de contacto
   * - Validación simple
   * - Guarda últimos datos en localStorage
   * - Hook preparado para POST a API cuando esté el dominio
   * ----------------------------------------- */
  const initContactForm = () => {
    const form = $("#contacto form");
    if (!form) return;

    // Prefill con datos previos (si existen)
    const last = storage.get("expansia_form", {});
    const [nameI, emailI, companyI, interestS, messageT] = form.querySelectorAll(
      "input, select, textarea"
    );
    if (last.name) nameI.value = last.name;
    if (last.email) emailI.value = last.email;
    if (last.company) companyI.value = last.company;
    if (last.interest) interestS.value = last.interest;
    if (last.message) messageT.value = last.message;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = {
        name: nameI.value.trim(),
        email: emailI.value.trim(),
        company: companyI.value.trim(),
        interest: interestS.value,
        message: messageT.value.trim(),
        utm: storage.get("expansia_utm", {}),
        timestamp: new Date().toISOString(),
        page: window.location.href,
      };

      // Validación mínima
      const errors = [];
      if (!data.name) errors.push("Ingresá tu nombre");
      if (!data.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email))
        errors.push("Ingresá un email válido");
      if (errors.length) {
        alert("Revisá el formulario:\n• " + errors.join("\n• "));
        return;
      }

      // Persistimos localmente para UX
      storage.set("expansia_form", {
        name: data.name,
        email: data.email,
        company: data.company,
        interest: data.interest,
        message: data.message,
      });

      // Hook para backend – activar cuando esté el endpoint
      if (CONFIG.ENABLE_NETWORK) {
        try {
          const res = await fetch(CONFIG.API_BASE + CONFIG.CONTACT_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error("Error de red");
          alert("¡Gracias! Te contactaremos a la brevedad.");
          form.reset();
          return;
        } catch (err) {
          console.error(err);
          alert("No pudimos enviar tu consulta. Probá de nuevo en unos minutos.");
          return;
        }
      }

      // Modo sin backend (placeholder)
      alert("¡Gracias! Te contactaremos a la brevedad.");
      form.reset();
    });
  };

  /* -----------------------------------------
   * 7) Lazy de logos (pequeño plus de rendimiento)
   * ----------------------------------------- */
  const initLazyLogos = () => {
    $$("section#marcas img").forEach((img) => {
      img.loading = "lazy";
      img.decoding = "async";
    });
  };

  /* -----------------------------------------
   * Init
   * ----------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    initMobileMenu();
    initSmoothScroll();
    initScrollSpy();
    initYear();
    initUTMTracking();
    initContactForm();
    initLazyLogos();
  });
})();
