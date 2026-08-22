// Frontend error tracking (2026-08-12): a Sentry DSN was provisioned for
// this site but never actually wired in — no frontend errors have ever been
// captured. Dynamic script injection (not a static <head> tag) so this is a
// one-file change instead of touching 50+ HTML pages; same pattern this file
// already uses elsewhere for Paddle's loader. Fails silently if the CDN
// bundle can't load (e.g. ad blocker) — monitoring, not a page dependency.
(function initSentry() {
  const script = document.createElement("script");
  script.src = "https://browser.sentry-cdn.com/10.70.0/bundle.min.js";
  script.crossOrigin = "anonymous";
  script.onload = function () {
    if (window.Sentry) {
      window.Sentry.init({
        dsn: "https://b456a6fcc0e1f0519e65adc30b0ee2e2@o4511299097985024.ingest.de.sentry.io/4511299120136272",
        environment: "production",
        tracesSampleRate: 0,
      });
    }
  };
  document.head.appendChild(script);
})();

const header = document.querySelector(".site-header");
const toggle = document.querySelector(".mobile-toggle");

const themeParams = new URLSearchParams(window.location.search);
const requestedTheme = themeParams.get("theme");

if (requestedTheme === "night") {
  localStorage.setItem("clasr:theme", "night");
} else if (requestedTheme === "light") {
  localStorage.setItem("clasr:theme", "light");
}

const savedTheme = localStorage.getItem("clasr:theme");
const systemPrefersNight = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
const isNightTheme = savedTheme ? savedTheme === "night" : systemPrefersNight;

if (isNightTheme) {
  document.body.classList.add("theme-night");
}

const renderThemeToggle = () => {
  const navActions = document.querySelector(".nav-actions");
  const accountMenu = document.querySelector(".account-menu");
  const host = navActions || accountMenu?.parentElement;

  if (!host || host.querySelector(".theme-toggle")) {
    return;
  }

  const themeToggle = document.createElement("button");
  themeToggle.className = "theme-toggle";
  themeToggle.type = "button";
  themeToggle.innerHTML = '<span class="theme-toggle__knob" aria-hidden="true"></span>';

  const updateThemeToggle = () => {
    const isNight = document.body.classList.contains("theme-night");
    themeToggle.setAttribute("aria-pressed", String(isNight));
    themeToggle.setAttribute("aria-label", isNight ? "Use light mode" : "Use night mode");
    themeToggle.classList.toggle("is-night", isNight);
  };

  themeToggle.addEventListener("click", () => {
    const shouldUseNight = !document.body.classList.contains("theme-night");
    document.body.classList.toggle("theme-night", shouldUseNight);

    if (shouldUseNight) {
      localStorage.setItem("clasr:theme", "night");
    } else {
      localStorage.setItem("clasr:theme", "light");
    }

    updateThemeToggle();
  });

  updateThemeToggle();

  if (navActions) {
    navActions.prepend(themeToggle);
  } else if (accountMenu) {
    let appHeaderActions = accountMenu.parentElement.querySelector(".app-header-actions");

    if (!appHeaderActions) {
      appHeaderActions = document.createElement("div");
      appHeaderActions.className = "app-header-actions";
      accountMenu.insertAdjacentElement("beforebegin", appHeaderActions);
      appHeaderActions.append(accountMenu);
    }

    appHeaderActions.prepend(themeToggle);
  }
};

const defaultProfile = {
  firstName: "Michael",
  lastName: "Carter",
  email: "michael.carter@university.edu",
  institution: "University Research Group",
  role: "Author",
};

renderThemeToggle();

document.querySelectorAll(".account-settings-nav a[href*='#']").forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetUrl = new URL(link.href, window.location.href);
    const isSamePage = targetUrl.pathname === window.location.pathname;
    const target = targetUrl.hash ? document.querySelector(targetUrl.hash) : null;

    if (!isSamePage || !target) {
      return;
    }

    event.preventDefault();
    history.pushState(null, "", targetUrl.hash);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

window.addEventListener("load", () => {
  if (!window.location.hash) {
    return;
  }

  const target = document.querySelector(window.location.hash);
  if (!target || !target.closest(".account-settings-layout")) {
    return;
  }

  window.setTimeout(() => {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
});

const titleCase = (value) => value
  .split(/[\s._-]+/)
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
  .join(" ");

const getStoredProfile = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("clasr:userProfile") || "{}");
    return { ...defaultProfile, ...stored };
  } catch {
    return { ...defaultProfile };
  }
};

const saveStoredProfile = (profile) => {
  try {
    localStorage.setItem("clasr:userProfile", JSON.stringify({ ...getStoredProfile(), ...profile }));
    localStorage.setItem("clasr:isLoggedIn", "true");
  } catch {
    // The visible prototype continues even if browser storage is unavailable.
  }
};

const getReadingHistoryEnabled = () => {
  try {
    const stored = localStorage.getItem("clasr:readingHistoryEnabled");
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
};

const planCredits = {
  "trial-pack": 1,
  regular: 5,
  researcher: 5,
  professional: 12,
  enterprise: 999,
  gift: 5,
};

const planLabels = {
  "trial-pack": "Trial Pack",
  regular: "Researcher",
  researcher: "Researcher",
  professional: "Professional",
  enterprise: "Enterprise",
  gift: "Gift code",
};

const planPrices = {
  "trial-pack": "$25.00",
  regular: "$59.00",
  researcher: "$59.00",
  professional: "$119.00",
  enterprise: "Custom",
  gift: "$0.00",
};

const getActivePlan = () => {
  const profilePlan = getStoredProfile().plan;
  if (profilePlan) {
    return profilePlan === "free" ? null : profilePlan;
  }

  if (localStorage.getItem("clasr:checkoutComplete") !== "true") {
    return null;
  }

  return localStorage.getItem("clasr:selectedPlan");
};

const hasCompletedCheckout = () => localStorage.getItem("clasr:checkoutComplete") === "true";
const hasDeferredCheckout = () => localStorage.getItem("clasr:checkoutDeferred") === "true";
const readingTemplateHrefs = {
  author: "/dashboard/reading/polarization-author/",
  reviewer: "/dashboard/reading/polarization-reviewer/",
  advisor: "/dashboard/reading/polarization-advisor/",
};
const processingHref = "/dashboard/processing/";

const getSelectedReadingTemplateHref = () => {
  const readingGroup = Array.from(document.querySelectorAll(".hero-config-group")).find((group) => {
    const label = group.querySelector(".hero-role-label")?.textContent.trim().toLowerCase();
    return label === "reading as";
  });
  const activeMode = readingGroup?.querySelector(".hero-role.is-active")?.textContent.trim().toLowerCase();
  return readingTemplateHrefs[activeMode] || readingTemplateHrefs.author;
};

const getSelectedReadingMode = () => {
  const readingGroup = Array.from(document.querySelectorAll(".hero-config-group")).find((group) => {
    const label = group.querySelector(".hero-role-label")?.textContent.trim().toLowerCase();
    return label === "reading as";
  });
  return readingGroup?.querySelector(".hero-role.is-active")?.textContent.trim().toLowerCase() || "author";
};

const profileFromEmail = (email) => {
  const cleanEmail = (email || defaultProfile.email).trim();
  const [localPart = ""] = cleanEmail.split("@");
  const nameParts = localPart.split(/[._-]+/).filter(Boolean);

  return {
    email: cleanEmail,
    firstName: nameParts[0] ? titleCase(nameParts[0]) : defaultProfile.firstName,
    lastName: nameParts[1] ? titleCase(nameParts.slice(1).join(" ")) : defaultProfile.lastName,
  };
};

const getDisplayProfile = () => {
  const profile = getStoredProfile();
  const firstName = (profile.firstName || defaultProfile.firstName).trim();
  const lastName = (profile.lastName || defaultProfile.lastName).trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || defaultProfile.firstName;

  return {
    ...profile,
    firstName,
    lastName,
    fullName,
    possessiveFirstName: firstName.endsWith("s") ? `${firstName}'` : `${firstName}'s`,
  };
};

if (header && toggle) {
  toggle.addEventListener("click", () => {
    const isOpen = header.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));

    if (!isOpen) {
      header.querySelectorAll(".nav-item.is-open").forEach((item) => {
        item.classList.remove("is-open");
        item.querySelector(":scope > a")?.setAttribute("aria-expanded", "false");
      });
    }
  });
}

if (header) {
  header.querySelectorAll(".nav-item").forEach((item) => {
    const link = item.querySelector(":scope > a");
    const menu = item.querySelector(":scope > .nav-menu");

    if (!link || !menu) {
      return;
    }

    link.setAttribute("aria-expanded", "false");

    link.addEventListener("click", (event) => {
      if (!window.matchMedia("(max-width: 1040px)").matches) {
        return;
      }

      if (!header.classList.contains("is-open")) {
        return;
      }

      event.preventDefault();
      const shouldOpen = !item.classList.contains("is-open");

      header.querySelectorAll(".nav-item.is-open").forEach((openItem) => {
        if (openItem === item) {
          return;
        }

        openItem.classList.remove("is-open");
        openItem.querySelector(":scope > a")?.setAttribute("aria-expanded", "false");
      });

      item.classList.toggle("is-open", shouldOpen);
      link.setAttribute("aria-expanded", String(shouldOpen));
    });
  });

}

const currentProfile = getDisplayProfile();

const accountMenuMarkup = `
  <div class="account-menu">
    <button class="user-menu" type="button" aria-expanded="false" aria-haspopup="menu">
      <span>${currentProfile.firstName} ${currentProfile.lastName}</span>
      <img src="/assets/icons/chevron-down.svg" alt="" class="user-menu__chevron">
    </button>
    <div class="account-dropdown" role="menu" aria-label="${currentProfile.firstName} account menu">
      <a class="account-dropdown__item" href="/dashboard/" role="menuitem"><span>My dashboard</span><small>Recent manuscripts and new readings</small></a>
      <a class="account-dropdown__item" href="/dashboard/readings/" role="menuitem"><span>Readings</span><small>Your past signal reports</small></a>
      <a class="account-dropdown__item" href="/dashboard/settings/" role="menuitem"><span>Account settings</span><small>Reading role, export, and profile preferences</small></a>
      <a class="account-dropdown__item" href="/dashboard/billing/" role="menuitem"><span>Plan and billing</span><small>Usage, invoices, and plan options</small></a>
      <a class="account-dropdown__item" href="/dashboard/help/" role="menuitem"><span>Help</span><small>FAQ, quick answers, and contact</small></a>
      <a class="account-dropdown__item account-dropdown__item--logout" href="/login/" role="menuitem"><span>Log out</span></a>
    </div>
  </div>
`;

const appNavMarkup = `
  <nav class="nav-links app-nav" aria-label="Workspace navigation">
    <a class="app-nav__primary" href="/dashboard/">New reading</a>
    <a href="/dashboard/readings/">Readings</a>
    <a href="/dashboard/pricing/">Plans</a>
    <a href="/dashboard/help/">Help</a>
  </nav>
`;

const isAccountArea = Boolean(document.querySelector(".dashboard-shell, .account-shell"));

if (isAccountArea) {
  localStorage.setItem("clasr:isLoggedIn", "true");
}

if (
  localStorage.getItem("clasr:isLoggedIn") === "true" &&
  !document.body.classList.contains("public-example-report")
) {
  const existingNav = document.querySelector(".nav-links");
  if (existingNav && !existingNav.classList.contains("app-nav")) {
    existingNav.outerHTML = appNavMarkup;
  } else if (!existingNav) {
    document.querySelector(".site-header .logo")?.closest("a")?.insertAdjacentHTML("afterend", appNavMarkup);
  }

  const existingMenu = document.querySelector(".account-menu");
  if (existingMenu) {
    existingMenu.outerHTML = accountMenuMarkup;
  } else {
    document.querySelector(".nav-actions")?.insertAdjacentHTML("beforebegin", accountMenuMarkup);
    document.querySelector(".nav-actions")?.remove();
  }
}

renderThemeToggle();

document.querySelectorAll("[data-auth-form]").forEach((form) => {
  form.addEventListener("submit", () => {
    const formData = new FormData(form);
    const email = String(formData.get("email") || defaultProfile.email).trim();
    const inferred = profileFromEmail(email);
    const firstName = String(formData.get("firstName") || inferred.firstName).trim();
    const lastName = String(formData.get("lastName") || inferred.lastName).trim();

    saveStoredProfile({
      firstName: firstName || inferred.firstName,
      lastName: lastName || inferred.lastName,
      email,
      institution: String(formData.get("institution") || defaultProfile.institution).trim(),
      role: String(formData.get("role") || defaultProfile.role).trim(),
    });

    const giftCode = String(formData.get("giftCode") || "").trim();
    if (giftCode) {
      localStorage.setItem("clasr:giftCode", giftCode);
    }

    const hasLandingUpload = localStorage.getItem("clasr:preuploadName");
    const hasLandingConfig = localStorage.getItem("clasr:landingConfigComplete") === "true";
    if (hasLandingUpload && hasLandingConfig) {
      form.setAttribute("action", "/checkout/");
    }
  });
});



const accountMenus = Array.from(document.querySelectorAll(".account-menu"));

const applyAccountProfile = () => {
  const profile = getDisplayProfile();
  const replacementRoot = document.querySelector(".dashboard-shell, .account-shell, .centered-flow");

  document.querySelectorAll(".user-menu span").forEach((item) => {
    item.textContent = `${profile.firstName} ${profile.lastName}`.trim();
  });

  document.querySelectorAll(".account-dropdown").forEach((dropdown) => {
    dropdown.setAttribute("aria-label", `${profile.firstName} account menu`);
  });

  if (!replacementRoot) {
    return;
  }

  const walker = document.createTreeWalker(replacementRoot, NodeFilter.SHOW_TEXT);
  const textNodes = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach((node) => {
    node.nodeValue = node.nodeValue
      .replaceAll("michael.carter@university.edu", profile.email)
      .replaceAll("Michael Carter", profile.fullName)
      .replaceAll("Michael's", profile.possessiveFirstName)
      .replaceAll("Michael", profile.firstName);
  });

  document.querySelectorAll("textarea[placeholder]").forEach((item) => {
    item.setAttribute("placeholder", item.getAttribute("placeholder")
      .replaceAll("Michael Carter", profile.fullName)
      .replaceAll("Michael's", profile.possessiveFirstName)
      .replaceAll("Michael", profile.firstName));
  });
};

applyAccountProfile();

accountMenus.forEach((menu) => {
  const button = menu.querySelector(".user-menu");

  if (!button) {
    return;
  }

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = menu.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(isOpen));
  });
});

document.addEventListener("click", (event) => {
  accountMenus.forEach((menu) => {
    if (menu.contains(event.target)) {
      return;
    }

    menu.classList.remove("is-open");
    menu.querySelector(".user-menu")?.setAttribute("aria-expanded", "false");
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  accountMenus.forEach((menu) => {
    menu.classList.remove("is-open");
    menu.querySelector(".user-menu")?.setAttribute("aria-expanded", "false");
  });
});

document.querySelectorAll(".account-dropdown__item--logout").forEach((link) => {
  link.addEventListener("click", () => {
    localStorage.removeItem("clasr:isLoggedIn");
    localStorage.removeItem("clasr:selectedPlan");
    localStorage.removeItem("clasr:pendingPlan");
    localStorage.removeItem("clasr:checkoutComplete");
    localStorage.removeItem("clasr:checkoutDeferred");
  });
});

const planCards = Array.from(document.querySelectorAll("[data-plan]"));
const planSubmit = document.querySelector("[data-plan-submit]");
const accountPlanCards = Array.from(document.querySelectorAll("[data-account-plan]"));
const urlParams = new URLSearchParams(window.location.search);
const planFromUrl = urlParams.get("plan");
const billingFromUrl = urlParams.get("billing");
const billingButtons = Array.from(document.querySelectorAll("[data-billing-option]"));
const billingTextNodes = Array.from(document.querySelectorAll("[data-monthly-text][data-annual-text]"));

if (planFromUrl) {
  localStorage.setItem("clasr:pendingPlan", planFromUrl);
}

if (billingFromUrl === "monthly" || billingFromUrl === "annual") {
  localStorage.setItem("clasr:pendingBilling", billingFromUrl);
}

if (billingButtons.length) {
  const pricingPlanLinks = Array.from(document.querySelectorAll(".pricing-page .plan-card__cta[href*='plan=']"));
  const updatePricingPlanLinks = (key) => {
    pricingPlanLinks.forEach((link) => {
      try {
        const url = new URL(link.getAttribute("href"), window.location.origin);
        url.searchParams.set("billing", key);
        link.setAttribute("href", `${url.pathname}${url.search}`);
      } catch {}
    });
  };

  const setBillingOption = (option) => {
    const key = option === "annual" ? "annual" : "monthly";

    billingButtons.forEach((button) => {
      const isActive = button.dataset.billingOption === key;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    billingTextNodes.forEach((node) => {
      const value = key === "annual" ? node.dataset.annualText : node.dataset.monthlyText;
      if (value) node.textContent = value;
    });

    updatePricingPlanLinks(key);
    localStorage.setItem("clasr:pendingBilling", key);
  };

  billingButtons.forEach((button) => {
    button.addEventListener("click", () => setBillingOption(button.dataset.billingOption));
  });

  setBillingOption(localStorage.getItem("clasr:pendingBilling") || "monthly");
}

document.querySelectorAll("[data-landing-mode-preview]").forEach((preview) => {
  const buttons = Array.from(preview.querySelectorAll("[data-report-mode-option]"));
  const panels = Array.from(preview.querySelectorAll("[data-report-mode-panel]"));
  const label = preview.querySelector("[data-report-mode-label]");

  const setMode = (mode) => {
    const key = mode || "author";

    buttons.forEach((button) => {
      const isActive = button.dataset.reportModeOption === key;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.reportModePanel === key;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    if (label) {
      label.textContent = `${key.charAt(0).toUpperCase()}${key.slice(1)} Mode`;
    }
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.reportModeOption));
  });

  setMode("author");
});

if (planCards.length) {
  const selectPlan = (card) => {
    const selectedPlan = card.dataset.plan;

    planCards.forEach((item) => {
      const isSelected = item === card;
      item.classList.toggle("is-selected", isSelected);
      item.setAttribute("aria-pressed", String(isSelected));
    });

    if (selectedPlan) {
      localStorage.setItem("clasr:pendingPlan", selectedPlan);
      if (planSubmit) {
        const href = selectedPlan === "enterprise"
          ? "/enterprise-contact/"
          : `/register/?plan=${encodeURIComponent(selectedPlan)}`;

        planSubmit.setAttribute("href", href);
      }
    }
  };

  planCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("a, button")) {
        selectPlan(card);
        return;
      }

      selectPlan(card);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectPlan(card);
      }
    });
  });

  const savedPlan = localStorage.getItem("clasr:pendingPlan");
  const initialCard = planCards.find((card) => card.dataset.plan === savedPlan);
  if (initialCard) {
    selectPlan(initialCard);
  }
}

const renderAccountPlanCards = () => {
  if (!accountPlanCards.length) return;

  const currentPlan = getActivePlan();
  const shouldShowTrialCredit = currentPlan === "trial-pack";

  accountPlanCards.forEach((card) => {
    const isCurrentPlan = currentPlan && card.dataset.accountPlan === currentPlan;
    card.classList.toggle("is-current-plan", isCurrentPlan);
    card.setAttribute("aria-current", isCurrentPlan ? "true" : "false");

    const accountPlan = card.dataset.accountPlan;
    const price = card.querySelector(".price");
    const meta = card.querySelector(".plan-meta");
    const action = card.querySelector(".button");

    if (!shouldShowTrialCredit && (accountPlan === "regular" || accountPlan === "researcher")) {
      if (price) price.textContent = "$59";
      if (meta) meta.textContent = "per month or $590/year";
      if (action) action.textContent = isCurrentPlan ? "Current plan" : "Choose Researcher";
    }

    if (!shouldShowTrialCredit && accountPlan === "professional") {
      if (price) price.textContent = "$119";
      if (meta) meta.textContent = "per month or $1,190/year";
      if (action) action.textContent = isCurrentPlan ? "Current plan" : "Choose Professional";
    }

    if (isCurrentPlan && action) {
      action.textContent = "Current plan";
      action.setAttribute("href", "/dashboard/billing/");
      action.classList.add("is-disabled-cta");
    } else if (action) {
      action.classList.remove("is-disabled-cta");
    }
  });
};

renderAccountPlanCards();

const signalDemos = Array.from(document.querySelectorAll("[data-signal-demo]"));

signalDemos.forEach((demo) => {
  const tabs = Array.from(demo.querySelectorAll("[data-signal-tab]"));
  const panels = Array.from(demo.querySelectorAll("[data-signal-panel]"));
  const panelsContainer = demo.querySelector(".signal-panels");
  const mobileSignalQuery = window.matchMedia("(max-width: 1100px)");

  const activatePanel = (target) => {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.signalTab === target;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.signalPanel === target;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });
  };

  const closePanels = () => {
    tabs.forEach((tab) => {
      tab.classList.remove("is-active");
      tab.setAttribute("aria-selected", "false");
    });

    panels.forEach((panel) => {
      panel.classList.remove("is-active");
      panel.hidden = true;
    });
  };

  const placePanels = (activeTarget = null) => {
    if (!panelsContainer) {
      return;
    }

    if (mobileSignalQuery.matches) {
      tabs.forEach((tab) => {
        const panel = panels.find((item) => item.dataset.signalPanel === tab.dataset.signalTab);
        if (panel) {
          tab.insertAdjacentElement("afterend", panel);
        }
      });

      if (activeTarget) {
        const activeTab = tabs.find((tab) => tab.dataset.signalTab === activeTarget);
        const activePanel = panels.find((panel) => panel.dataset.signalPanel === activeTarget);
        if (activeTab && activePanel) {
          activeTab.insertAdjacentElement("afterend", activePanel);
        }
      }
      return;
    }

    panels.forEach((panel) => panelsContainer.appendChild(panel));
  };

  demo.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-signal-tab]");

    if (!tab || !demo.contains(tab)) {
      return;
    }

    if (mobileSignalQuery.matches && tab.classList.contains("is-active")) {
      closePanels();
      placePanels();
      return;
    }

    activatePanel(tab.dataset.signalTab);
    placePanels(tab.dataset.signalTab);
  });

  if (mobileSignalQuery.matches) {
    closePanels();
  }

  placePanels();
  mobileSignalQuery.addEventListener?.("change", () => {
    if (mobileSignalQuery.matches) {
      closePanels();
    } else if (!tabs.some((tab) => tab.classList.contains("is-active"))) {
      activatePanel(tabs[0]?.dataset.signalTab);
    }

    placePanels();
  });
});

const legalCenter = document.querySelector(".legal-center");

if (legalCenter) {
  const legalNav = legalCenter.querySelector(".legal-center__nav");
  const legalPanel = legalCenter.querySelector(".legal-center__panel");
  const legalCards = legalCenter.querySelector(".legal-center__cards");
  const legalLinks = Array.from(legalCenter.querySelectorAll(".legal-center__nav a[href^='#']"));
  const legalDocs = legalLinks
    .map((link) => {
      const target = link.getAttribute("href");
      const panel = target && target !== "#legal-center" ? legalCenter.querySelector(target) : null;
      return panel ? { link, panel } : null;
    })
    .filter(Boolean);
  const mobileLegalQuery = window.matchMedia("(max-width: 860px)");

  const closeLegalDocs = () => {
    legalLinks.forEach((link) => {
      link.classList.remove("is-active");
      link.setAttribute("aria-expanded", "false");
    });

    legalDocs.forEach(({ panel }) => {
      panel.classList.remove("is-mobile-open");
      if (mobileLegalQuery.matches) {
        panel.hidden = true;
      }
    });
  };

  const placeLegalDocs = () => {
    if (mobileLegalQuery.matches) {
      legalDocs.forEach(({ link, panel }) => {
        link.insertAdjacentElement("afterend", panel);
        link.setAttribute("role", "button");
        link.setAttribute("aria-expanded", panel.classList.contains("is-mobile-open") ? "true" : "false");
        panel.hidden = !panel.classList.contains("is-mobile-open");
      });
      return;
    }

    legalLinks.forEach((link) => {
      link.removeAttribute("role");
      link.removeAttribute("aria-expanded");
    });

    legalDocs.forEach(({ panel }) => {
      legalPanel.appendChild(panel);
      panel.hidden = false;
      panel.classList.remove("is-mobile-open");
    });
  };

  legalNav?.addEventListener("click", (event) => {
    const link = event.target.closest("a[href^='#']");

    if (!link || !legalNav.contains(link)) {
      return;
    }

    if (!mobileLegalQuery.matches) {
      return;
    }

    event.preventDefault();

    if (link.getAttribute("href") === "#legal-center") {
      closeLegalDocs();
      link.classList.add("is-active");
      return;
    }

    const item = legalDocs.find(({ link: candidate }) => candidate === link);

    if (!item) {
      return;
    }

    const shouldClose = item.panel.classList.contains("is-mobile-open");
    closeLegalDocs();

    if (shouldClose) {
      return;
    }

    link.classList.add("is-active");
    link.setAttribute("aria-expanded", "true");
    item.panel.classList.add("is-mobile-open");
    item.panel.hidden = false;
    link.insertAdjacentElement("afterend", item.panel);
  });

  if (mobileLegalQuery.matches) {
    closeLegalDocs();
  }

  placeLegalDocs();
  mobileLegalQuery.addEventListener?.("change", () => {
    closeLegalDocs();
    placeLegalDocs();
  });
}

const legalDocModal = document.querySelector("[data-legal-doc-modal]");
const legalDocBody = document.querySelector("[data-legal-doc-body]");
const legalAccessModal = document.querySelector("[data-legal-access-modal]");
const legalAccessInput = document.querySelector("[data-legal-access-input]");
const legalAccessError = document.querySelector("[data-legal-access-error]");
const legalAccessSubmit = document.querySelector("[data-legal-access-submit]");
let pendingLegalDoc = null;

const openLegalDoc = (docId) => {
  const template = document.getElementById(`legal-doc-${docId}`);

  if (!template || !legalDocModal || !legalDocBody) {
    return;
  }

  legalDocBody.replaceChildren(template.content.cloneNode(true));
  legalDocModal.hidden = false;
  document.body.classList.add("modal-open");
  legalDocModal.querySelector(".legal-doc-modal__close")?.focus();
};

const closeLegalDoc = () => {
  if (!legalDocModal || !legalDocBody) {
    return;
  }

  legalDocModal.hidden = true;
  legalDocBody.replaceChildren();
  document.body.classList.remove("modal-open");
};

const openLegalAccess = (docId) => {
  pendingLegalDoc = docId;

  if (!legalAccessModal || !legalAccessInput) {
    return;
  }

  legalAccessInput.value = "";
  if (legalAccessError) {
    legalAccessError.hidden = true;
  }
  legalAccessModal.hidden = false;
  document.body.classList.add("modal-open");
  legalAccessInput.focus();
};

const closeLegalAccess = () => {
  if (!legalAccessModal) {
    return;
  }

  pendingLegalDoc = null;
  legalAccessModal.hidden = true;
  document.body.classList.remove("modal-open");
};

document.querySelectorAll("[data-legal-doc]").forEach((button) => {
  button.addEventListener("click", () => {
    const docId = button.dataset.legalDoc;

    if (!docId) {
      return;
    }

    if (button.dataset.legalLocked === "true") {
      openLegalAccess(docId);
      return;
    }

    openLegalDoc(docId);
  });
});

document.querySelectorAll("[data-legal-doc-close]").forEach((button) => {
  button.addEventListener("click", closeLegalDoc);
});

document.querySelectorAll("[data-legal-access-close]").forEach((button) => {
  button.addEventListener("click", closeLegalAccess);
});

legalAccessSubmit?.addEventListener("click", () => {
  if (legalAccessInput?.value.trim() !== "clasr2026") {
    if (legalAccessError) {
      legalAccessError.hidden = false;
    }
    legalAccessInput?.focus();
    return;
  }

  const docId = pendingLegalDoc;
  closeLegalAccess();
  openLegalDoc(docId);
});

legalAccessInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    legalAccessSubmit?.click();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  closeLegalDoc();
  closeLegalAccess();
  const inlineModal = document.querySelector("[data-inline-legal-modal]");
  if (inlineModal) {
    inlineModal.hidden = true;
    inlineModal.querySelector("[data-inline-legal-body]")?.replaceChildren();
    document.body.classList.remove("modal-open");
  }
});

const ensureInlineLegalModal = () => {
  let modal = document.querySelector("[data-inline-legal-modal]");

  if (!modal) {
    modal = document.createElement("div");
    modal.className = "legal-doc-modal";
    modal.setAttribute("data-inline-legal-modal", "");
    modal.hidden = true;
    modal.innerHTML = `
      <div class="legal-doc-modal__backdrop" data-inline-legal-close></div>
      <section class="legal-doc-modal__dialog" role="dialog" aria-modal="true">
        <button class="legal-doc-modal__close" type="button" aria-label="Close document" data-inline-legal-close>&times;</button>
        <div class="legal-doc-modal__body" data-inline-legal-body></div>
      </section>
    `;
    document.body.appendChild(modal);
    modal.querySelectorAll("[data-inline-legal-close]").forEach((button) => {
      button.addEventListener("click", () => {
        modal.hidden = true;
        modal.querySelector("[data-inline-legal-body]")?.replaceChildren();
        document.body.classList.remove("modal-open");
      });
    });
  }

  return modal;
};

const openInlineLegalDoc = async (docId) => {
  const modal = ensureInlineLegalModal();
  const body = modal.querySelector("[data-inline-legal-body]");
  let template = document.getElementById(`legal-doc-${docId}`);

  if (!template) {
    const response = await fetch("/legal/");
    const html = await response.text();
    const legalPage = new DOMParser().parseFromString(html, "text/html");
    template = legalPage.getElementById(`legal-doc-${docId}`);
  }

  if (!template || !body) {
    window.location.href = `/legal/?doc=${encodeURIComponent(docId)}`;
    return;
  }

  body.replaceChildren(template.content.cloneNode(true));
  modal.hidden = false;
  document.body.classList.add("modal-open");
  modal.querySelector(".legal-doc-modal__close")?.focus();
};

document.querySelectorAll("[data-legal-popup]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openInlineLegalDoc(link.dataset.legalPopup);
  });
});

const legalDocParam = new URLSearchParams(window.location.search).get("doc");
if (legalDocParam && document.querySelector("[data-legal-doc-modal]")) {
  window.setTimeout(() => openLegalDoc(legalDocParam), 150);
}

// Flow pill single-select within each group
document.querySelectorAll(".flow-pills").forEach((group) => {
  group.querySelectorAll(".flow-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      group.querySelectorAll(".flow-pill").forEach((p) => p.classList.remove("is-active"));
      pill.classList.add("is-active");
    });
  });
});

const roleOptions = Array.from(document.querySelectorAll("[data-role-option]"));

roleOptions.forEach((option) => {
  option.addEventListener("click", () => {
    roleOptions.forEach((item) => item.classList.remove("is-selected"));
    option.classList.add("is-selected");
  });
});

// Hero role pills, each .hero-roles group is independent
const updateDashboardStartHref = () => {
  const dashboardStart = document.querySelector("[data-dashboard-start]");
  if (!dashboardStart || dashboardStart.dataset.checkoutRequired === "true") {
    return;
  }

  dashboardStart.setAttribute("href", processingHref);
};

document.querySelectorAll(".hero-roles").forEach((group) => {
  group.querySelectorAll(".hero-role").forEach((btn) => {
    btn.addEventListener("click", () => {
      group.querySelectorAll(".hero-role").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      updateDashboardStartHref();
    });
  });
});

const landingUploadDrop = document.querySelector("[data-landing-upload-drop]");
const landingUploadInput = document.querySelector("[data-landing-upload-input]");
const landingUploadName = document.querySelector("[data-landing-upload-name]");
const landingUploadStatus = document.querySelector("[data-landing-upload-status]");
const landingStart = document.querySelector("[data-landing-start]");

const storeLandingSelections = () => {
  if (!landingStart) {
    return;
  }

  const selections = {};
  document.querySelectorAll(".hero-config-group").forEach((group) => {
    const label = group.querySelector(".hero-role-label")?.textContent.trim();
    const active = group.querySelector(".hero-role.is-active")?.textContent.trim();
    if (label && active) {
      selections[label.toLowerCase().replace(/\s+/g, "-")] = active;
    }
  });

  try {
    localStorage.setItem("clasr:landingConfigComplete", "true");
    localStorage.setItem("clasr:landingSelections", JSON.stringify(selections));
  } catch {}
};

const setLandingUpload = (file) => {
  if (!file) {
    return;
  }

  try {
    localStorage.setItem("clasr:preuploadName", file.name);
  } catch {}

  if (landingUploadName) {
    landingUploadName.textContent = file.name;
  }

  if (landingUploadStatus) {
    landingUploadStatus.textContent = "Ready to continue";
  }

  landingUploadDrop?.classList.add("has-file");
};

if (landingUploadInput) {
  landingUploadInput.addEventListener("change", () => {
    setLandingUpload(landingUploadInput.files?.[0]);
  });
}

if (landingUploadDrop) {
  ["dragenter", "dragover"].forEach((eventName) => {
    landingUploadDrop.addEventListener(eventName, (event) => {
      event.preventDefault();
      landingUploadDrop.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    landingUploadDrop.addEventListener(eventName, (event) => {
      event.preventDefault();
      landingUploadDrop.classList.remove("is-dragging");
    });
  });

  landingUploadDrop.addEventListener("drop", (event) => {
    setLandingUpload(event.dataTransfer?.files?.[0]);
  });
}

  landingStart?.addEventListener("click", () => {
  storeLandingSelections();
});

document.querySelector("[data-dashboard-start]")?.addEventListener("click", () => {
  try {
    const mode = getSelectedReadingMode();
    localStorage.setItem("clasr:pendingReadingMode", mode);
    localStorage.setItem("clasr:pendingReadingHref", readingTemplateHrefs[mode] || readingTemplateHrefs.author);
  } catch {}
});

const processingMode = document.querySelector("[data-processing-mode]");

if (processingMode) {
  const mode = localStorage.getItem("clasr:pendingReadingMode") || "author";
  processingMode.textContent = `${titleCase(mode)} Mode`;

  const getPendingReportHref = () => localStorage.getItem("clasr:pendingReadingHref") || readingTemplateHrefs[mode] || readingTemplateHrefs.author;
  const goToReadyReport = (href = getPendingReportHref()) => {
    try {
      localStorage.removeItem("clasr:reportReady");
    } catch {}
    window.location.href = href;
  };

  window.clasrReportReady = (href) => {
    if (href) {
      try {
        localStorage.setItem("clasr:pendingReadingHref", href);
      } catch {}
    }
    goToReadyReport(href);
  };

  if (localStorage.getItem("clasr:reportReady") === "true") {
    goToReadyReport();
  } else {
    window.setInterval(() => {
      if (localStorage.getItem("clasr:reportReady") === "true") {
        goToReadyReport();
      }
    }, 1500);
  }
}

const checkoutPlans = Array.from(document.querySelectorAll("[data-checkout-plan]"));
const checkoutSelectedPlan = document.querySelector("[data-checkout-selected-plan]");
const checkoutSelectedPrice = document.querySelector("[data-checkout-selected-price]");
const checkoutUploadCopy = document.querySelector("[data-checkout-upload-copy]");
const giftCodeInput = document.querySelector("[data-gift-code-input]");
const giftCodeApply = document.querySelector("[data-gift-code-apply]");
const giftCodeStatus = document.querySelector("[data-gift-code-status]");
const checkoutRegister = document.querySelector("[data-checkout-register]");

if (checkoutPlans.length) {
  const selectCheckoutPlan = (plan) => {
    const billingPeriod = localStorage.getItem("clasr:pendingBilling") === "annual" ? "annual" : "monthly";
    const planName = plan.dataset.checkoutPlan || "trial-pack";
    const annualApplies = billingPeriod === "annual" && planName !== "trial-pack";
    const price = annualApplies
      ? plan.dataset.checkoutAnnualPrice || plan.dataset.checkoutPrice || ""
      : plan.dataset.checkoutPrice || "";
    const billingCopy = annualApplies
      ? plan.dataset.checkoutAnnualCopy || plan.querySelector("small")?.textContent || ""
      : plan.dataset.checkoutMonthlyCopy || plan.querySelector("small")?.textContent || "";

    checkoutPlans.forEach((item) => {
      const isSelected = item === plan;
      const itemName = item.dataset.checkoutPlan || "trial-pack";
      const itemAnnualApplies = billingPeriod === "annual" && itemName !== "trial-pack";
      const itemPrice = itemAnnualApplies
        ? item.dataset.checkoutAnnualPrice || item.dataset.checkoutPrice || ""
        : item.dataset.checkoutPrice || "";
      const itemCopy = itemAnnualApplies
        ? item.dataset.checkoutAnnualCopy || ""
        : item.dataset.checkoutMonthlyCopy || "";

      item.classList.toggle("is-selected", isSelected);
      item.setAttribute("aria-pressed", String(isSelected));
      if (item.querySelector("strong") && itemPrice) item.querySelector("strong").textContent = itemPrice;
      if (item.querySelector("small") && itemCopy) item.querySelector("small").textContent = itemCopy;
    });

    if (checkoutSelectedPlan) {
      const periodLabel = annualApplies ? " annual" : "";
      checkoutSelectedPlan.textContent = `${plan.dataset.checkoutLabel || "Selected plan"}${periodLabel}`;
    }

    if (checkoutSelectedPrice) {
      checkoutSelectedPrice.textContent = price;
    }

    if (checkoutRegister) {
      checkoutRegister.href = `/register/?plan=${encodeURIComponent(planName)}&billing=${annualApplies ? "annual" : "monthly"}`;
    }

    try {
      localStorage.setItem("clasr:pendingPlan", planName);
    } catch {}
  };

  checkoutPlans.forEach((plan) => {
    plan.addEventListener("click", () => selectCheckoutPlan(plan));
    plan.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectCheckoutPlan(plan);
      }
    });
  });

  billingButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selected = checkoutPlans.find((plan) => plan.classList.contains("is-selected")) || checkoutPlans[0];
      selectCheckoutPlan(selected);
    });
  });

  const savedCheckoutPlan = localStorage.getItem("clasr:pendingPlan") || localStorage.getItem("clasr:selectedPlan") || planFromUrl || "trial-pack";
  const initialCheckoutPlan = checkoutPlans.find((plan) => plan.dataset.checkoutPlan === savedCheckoutPlan) || checkoutPlans[0];
  selectCheckoutPlan(initialCheckoutPlan);
}

if (giftCodeInput) {
  const savedGiftCode = localStorage.getItem("clasr:giftCode");
  if (savedGiftCode) {
    giftCodeInput.value = savedGiftCode;
  }
}

giftCodeApply?.addEventListener("click", () => {
  const code = giftCodeInput?.value.trim();
  if (!code) {
    return;
  }

  try {
    localStorage.setItem("clasr:giftCode", code);
    localStorage.setItem("clasr:selectedPlan", "gift");
    localStorage.removeItem("clasr:pendingPlan");
    localStorage.setItem("clasr:checkoutComplete", "true");
    localStorage.removeItem("clasr:checkoutDeferred");
  } catch {}

  if (giftCodeStatus) {
    giftCodeStatus.hidden = false;
  }

  if (checkoutSelectedPlan) {
    checkoutSelectedPlan.textContent = "Gift code";
  }

  if (checkoutSelectedPrice) {
    checkoutSelectedPrice.textContent = "$0";
  }
});

if (checkoutUploadCopy) {
  const preuploadName = localStorage.getItem("clasr:preuploadName");
  if (preuploadName) {
    checkoutUploadCopy.textContent = `${preuploadName} is ready. Choose a plan to release the report.`;
  }
}

const checkoutPaidNotice = document.querySelector("[data-checkout-paid-notice]");
if (checkoutPaidNotice && new URLSearchParams(window.location.search).get("checkout") === "complete") {
  checkoutPaidNotice.hidden = false;
}

const registerUploadNote = document.querySelector("[data-register-upload]");

if (registerUploadNote) {
  const preuploadName = localStorage.getItem("clasr:preuploadName");
  if (preuploadName) {
    registerUploadNote.hidden = false;
    registerUploadNote.textContent = `${preuploadName} is uploaded. Create your account to continue.`;

    const registerNextStep = document.querySelector("[data-register-next-step]");
    if (localStorage.getItem("clasr:landingConfigComplete") === "true" && registerNextStep) {
      registerNextStep.textContent = "Next: choose a plan and continue through the checkout preview.";
    }
  }
}

document.querySelectorAll("[data-checkout-complete]").forEach((link) => {
  link.addEventListener("click", () => {
    try {
      const existingPlan = localStorage.getItem("clasr:selectedPlan");
      localStorage.setItem("clasr:selectedPlan", existingPlan === "gift"
        ? "gift"
        : localStorage.getItem("clasr:pendingPlan") || "trial-pack");
      localStorage.setItem("clasr:checkoutComplete", "true");
      localStorage.removeItem("clasr:checkoutDeferred");
    } catch {}
  });
});

document.querySelectorAll("[data-checkout-pass]").forEach((link) => {
  link.addEventListener("click", () => {
    try {
      localStorage.removeItem("clasr:selectedPlan");
      localStorage.removeItem("clasr:pendingPlan");
      localStorage.removeItem("clasr:checkoutComplete");
      localStorage.setItem("clasr:checkoutDeferred", "true");
    } catch {}
  });
});

const preuploadReady = document.querySelector("[data-preupload-ready]");
const preuploadFile = document.querySelector("[data-preupload-file]");
const sidebarRecentList = document.querySelector("[data-sidebar-recent-list]");
const recentGrid = document.querySelector("[data-recent-grid]");
const readingsHistoryList = document.querySelector("[data-readings-history-list]");
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[char]));

if (preuploadReady) {
  const preuploadName = localStorage.getItem("clasr:preuploadName");
  const checkoutComplete = localStorage.getItem("clasr:checkoutComplete") === "true";

  if (preuploadName && checkoutComplete) {
    const safePreuploadName = escapeHtml(preuploadName);

    preuploadReady.hidden = false;
    if (preuploadFile) {
      preuploadFile.textContent = preuploadName;
    }

    if (sidebarRecentList) {
      sidebarRecentList.innerHTML = `
        <li>
          <a class="sidebar-file" href="/dashboard/reading/">
            <span class="sidebar-file__name">${safePreuploadName}</span>
            <span class="sidebar-file__meta">Q1 · Author · just now</span>
          </a>
        </li>
      `;
    }

    if (recentGrid) {
      recentGrid.innerHTML = `
        <article class="reading-history-card" data-q="q1">
          <span class="reading-history-card__date">just now</span>
          <div>
            <h3>${safePreuploadName}</h3>
            <span class="reading-history-card__metrics">2 critical · 5 major · 4 minor</span>
            <p>Q1 · Author mode · Report ready. Top signal: statistical consistency.</p>
          </div>
          <div class="reading-history-card__actions">
            <a class="reading-history-card__action" href="/dashboard/reading/">Open report</a>
            <span class="reading-history-card__downloads" aria-label="Download report">
              <a href="/assets/reports/clasr-demo-signal-report.pdf" download>PDF</a>
              <a href="/assets/reports/clasr-demo-signal-report.docx" download>DOCX</a>
              <a href="/assets/reports/clasr-demo-signal-report.txt" download>TXT</a>
            </span>
          </div>
        </article>
      `;
    }

    if (readingsHistoryList) {
      readingsHistoryList.innerHTML = `
        <article class="reading-history-card" data-q="q1">
          <span class="reading-history-card__date">just now</span>
          <div>
            <h3>${safePreuploadName}</h3>
            <span class="reading-history-card__metrics">2 critical · 5 major · 4 minor</span>
            <p>Q1 · Author mode · Report ready for the uploaded manuscript.</p>
          </div>
          <div class="reading-history-card__actions">
            <a class="reading-history-card__action" href="/dashboard/reading/">Open report</a>
            <span class="reading-history-card__downloads" aria-label="Download report">
              <a href="/assets/reports/clasr-demo-signal-report.pdf" download>PDF</a>
              <a href="/assets/reports/clasr-demo-signal-report.docx" download>DOCX</a>
              <a href="/assets/reports/clasr-demo-signal-report.txt" download>TXT</a>
            </span>
          </div>
        </article>
      `;
    }
  }
}

const creditLeft = document.querySelector("[data-credit-left]");
const creditAction = document.querySelector("[data-credit-action]");
const dashboardStart = document.querySelector("[data-dashboard-start]");

if (creditLeft || dashboardStart) {
  const selectedPlan = getActivePlan();
  const totalCredits = selectedPlan ? planCredits[selectedPlan] || 0 : 0;
  const usedCredits = selectedPlan && localStorage.getItem("clasr:preuploadName") ? 1 : 0;
  const remainingCredits = selectedPlan === "enterprise"
    ? "Custom volume"
    : Math.max(totalCredits - usedCredits, 0);
  const hasCredits = remainingCredits === "Custom volume" || remainingCredits > 0;
  const hasPaidReading = hasCompletedCheckout() && Boolean(localStorage.getItem("clasr:preuploadName"));
  const canStartReading = hasCredits || hasPaidReading;

  if (creditLeft) {
    creditLeft.textContent = remainingCredits === "Custom volume"
      ? "Custom"
      : `${remainingCredits}/${totalCredits}`;
  }

  if (creditAction) {
    creditAction.setAttribute("href", selectedPlan ? "/dashboard/billing/" : "/checkout/");
  }

  if (dashboardStart) {
    dashboardStart.dataset.checkoutRequired = canStartReading ? "false" : "true";
    dashboardStart.setAttribute("href", canStartReading ? processingHref : "/checkout/");
  }

  if (dashboardStart && !canStartReading) {
    const startNote = dashboardStart.closest(".upload-card__start")?.querySelector(".start-note");
    if (startNote) {
      startNote.textContent = "Choose a plan to unlock manuscript readings.";
    }
  }
}

const billingPlanName = document.querySelector("[data-billing-plan-name]");
const billingPlanSummary = document.querySelector("[data-billing-plan-summary]");
const invoiceList = document.querySelector("[data-invoice-list]");
const accountPricingStatus = document.querySelector("[data-account-pricing-status]");

const renderAccountBillingPanel = () => {
  const activePlan = getActivePlan();

  document.querySelectorAll("[data-trial-only]").forEach((item) => {
    item.hidden = activePlan !== "trial-pack";
  });

  if (billingPlanName && billingPlanSummary) {
    if (!activePlan) {
      billingPlanName.textContent = "No active plan";
      billingPlanSummary.textContent = "Choose a plan or apply a gift code before starting manuscript readings.";
    } else if (activePlan === "enterprise") {
      billingPlanName.textContent = "Enterprise";
      billingPlanSummary.textContent = "Custom volume and team access are managed through the enterprise agreement.";
    } else {
      const total = planCredits[activePlan] || 0;
      const used = localStorage.getItem("clasr:preuploadName") ? 1 : 0;
      billingPlanName.textContent = planLabels[activePlan] || "Current plan";
      billingPlanSummary.textContent = `${used} of ${total} manuscript readings used.`;
    }
  }

  if (invoiceList) {
    if (!activePlan) {
      invoiceList.innerHTML = `
        <article class="invoice-row">
          <div>
            <span>No payments yet</span>
            <strong>No invoice available</strong>
          </div>
          <span>$0.00</span>
          <a href="/checkout/" class="button button--small">Choose plan</a>
        </article>
      `;
    } else {
      invoiceList.innerHTML = `
        <article class="invoice-row">
          <div>
            <span>Jun 12, 2026</span>
            <strong>${planLabels[activePlan] || "Plan"}</strong>
          </div>
          <span>${planPrices[activePlan] || ""}</span>
          <span class="invoice-status">Demo</span>
          <span>Demo record</span>
        </article>
      `;
    }
  }

  if (accountPricingStatus) {
    if (!activePlan) {
      accountPricingStatus.textContent = "Choose a plan when you are ready to unlock manuscript readings.";
    } else if (activePlan === "trial-pack") {
      accountPricingStatus.textContent = "Your $25 Trial Pack credit is available for 30 days and can be applied to Researcher or Professional.";
    } else {
      accountPricingStatus.textContent = `${planLabels[activePlan]} is active. Billing controls will appear here when payment processing becomes available.`;
    }
  }
};

renderAccountBillingPanel();

const dashboardRecentBlocks = Array.from(document.querySelectorAll("[data-history-dashboard-recent]"));
const renderDashboardRecentBlocks = (isEnabled = getReadingHistoryEnabled()) => {
  dashboardRecentBlocks.forEach((block) => {
    block.hidden = !isEnabled;
  });
};

renderDashboardRecentBlocks();

document.querySelectorAll(".settings-toggle").forEach((group) => {
  const isReadingHistory = group.getAttribute("aria-label") === "Reading history";
  const historyStatus = isReadingHistory
    ? group.closest(".settings-row")?.querySelector("[data-history-status]")
    : null;
  const setHistoryStatus = (isEnabled) => {
    if (historyStatus) {
      historyStatus.textContent = isEnabled ? "On" : "Off";
    }
  };

  if (isReadingHistory) {
    const shouldBeOn = getReadingHistoryEnabled();

    group.querySelectorAll("button").forEach((item) => {
      const isActive = item.textContent.trim().toLowerCase() === (shouldBeOn ? "on" : "off");
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    setHistoryStatus(shouldBeOn);
  }

  group.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      group.querySelectorAll("button").forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });

      if (isReadingHistory) {
        const historyEnabled = button.textContent.trim().toLowerCase() === "on";
        localStorage.setItem("clasr:readingHistoryEnabled", String(historyEnabled));
        setHistoryStatus(historyEnabled);
        renderDashboardRecentBlocks(historyEnabled);
      }
    });
  });
});

const historyEmpty = document.querySelector("[data-history-empty]");
const historyList = document.querySelector("[data-history-list]");
const historyEnable = document.querySelector("[data-history-enable]");
const historyDisable = document.querySelector("[data-history-disable]");

if (historyEmpty && historyList) {
  const getHistoryEnabled = () => {
    try {
      return getReadingHistoryEnabled();
    } catch {
      return true;
    }
  };

  const setHistoryEnabled = (isEnabled) => {
    try {
      localStorage.setItem("clasr:readingHistoryEnabled", String(isEnabled));
    } catch {
      // The visible page state still updates even if browser storage is unavailable.
    }
  };

  const renderHistoryState = (forcedState) => {
    const isEnabled = typeof forcedState === "boolean" ? forcedState : getHistoryEnabled();
    historyEmpty.hidden = isEnabled;
    historyList.hidden = !isEnabled;
  };

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-history-enable]")) {
      return;
    }

    setHistoryEnabled(true);
    renderHistoryState(true);
    renderDashboardRecentBlocks(true);
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest("[data-history-disable]")) {
      return;
    }

    setHistoryEnabled(false);
    renderHistoryState(false);
    renderDashboardRecentBlocks(false);
  });

  renderHistoryState();
}

const mobileReportQuery = window.matchMedia("(max-width: 720px)");

const addMobileReportToggle = (host, label, expanded = false, buttonHost = host) => {
  if (!host || !buttonHost || buttonHost.querySelector(":scope > .mobile-report-toggle")) {
    return null;
  }

  const button = document.createElement("button");
  button.className = "mobile-report-toggle";
  button.type = "button";
  button.setAttribute("aria-expanded", String(expanded));
  button.innerHTML = `<span>${label}</span><span aria-hidden="true">+</span>`;
  buttonHost.append(button);
  host.classList.toggle("is-mobile-open", expanded);

  button.addEventListener("click", () => {
    const isOpen = !host.classList.contains("is-mobile-open");
    host.classList.toggle("is-mobile-open", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
    button.lastElementChild.textContent = isOpen ? "−" : "+";
  });

  return button;
};

const setupResponsiveReports = () => {
  document.querySelectorAll(".author-mode-report .mode-finding-card").forEach((card, index) => {
    addMobileReportToggle(card, "Finding details", index === 0);
  });

  document.querySelectorAll(".mode-reviewer-table tbody tr").forEach((row, index) => {
    addMobileReportToggle(row, "Evidence and rationale", index === 0);
  });

  document.querySelectorAll(".advisor-group").forEach((group, index) => {
    addMobileReportToggle(
      group,
      index === 0 ? "Critical priorities" : "Show priorities",
      index === 0,
      group.querySelector(".advisor-group__title")
    );
  });
};

setupResponsiveReports();

// ── API Integration ──────────────────────────────────────────────────────────
(function () {
  'use strict';

  var API_BASE = 'https://clasr-production.up.railway.app';

  var getToken = function() { return localStorage.getItem('clasr:at'); };
  var setTokens = function(at, rt) {
    if (at) localStorage.setItem('clasr:at', at);
    if (rt) localStorage.setItem('clasr:rt', rt);
    localStorage.setItem('clasr:isLoggedIn', 'true');
  };
  var clearSession = function() {
    ['clasr:at', 'clasr:rt', 'clasr:isLoggedIn'].forEach(function(k) { localStorage.removeItem(k); });
  };

  function apiFetch(path, opts) {
    var options = opts || {};
    var token = getToken();
    var headers = Object.assign({}, options.headers || {});
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(API_BASE + path, Object.assign({}, options, { headers: headers }))
      .catch(function() { return null; })
      .then(function(res) {
        if (!res) return null;
        if (res.status !== 401) return res;
        var rt = localStorage.getItem('clasr:rt');
        if (!rt) { clearSession(); return res; }
        return fetch(API_BASE + '/api/auth/refresh', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: rt }),
        }).catch(function() { return null; }).then(function(rr) {
          if (!rr || !rr.ok) { clearSession(); window.location.href = '/login/'; return null; }
          return rr.json().then(function(j) {
            setTokens(j.access_token, j.refresh_token);
            headers['Authorization'] = 'Bearer ' + j.access_token;
            return fetch(API_BASE + path, Object.assign({}, options, { headers: headers })).catch(function() { return null; });
          });
        });
      });
  }

  function apiJson(path, opts) {
    return apiFetch(path, opts).then(function(res) {
      if (!res) return null;
      return res.json().catch(function() { return null; });
    });
  }

  // ── Email/password auth forms ──────────────────────────────────────────────
  document.querySelectorAll('[data-auth-form]').forEach(function(form) {
    if (form._apiWired) return;
    form._apiWired = true;
    form.addEventListener('submit', function(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      var formType = form.dataset.authForm;
      var fd = new FormData(form);
      var submitBtn = form.querySelector('[type=submit]');
      var origText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Please wait…'; }
      var errEl = form.querySelector('[data-form-error]');
      if (!errEl) {
        errEl = document.createElement('p');
        errEl.className = 'auth-error';
        errEl.setAttribute('data-form-error', '');
        form.insertAdjacentElement('afterbegin', errEl);
      }
      errEl.hidden = true;
      var path = formType === 'login' ? '/api/auth/login' : '/api/auth/register';
      var body = formType === 'login'
        ? { email: fd.get('email'), password: fd.get('password') }
        : { email: fd.get('email'), password: fd.get('password'), firstName: fd.get('firstName') || '', lastName: fd.get('lastName') || '', institution: fd.get('institution') || '' };
      fetch(API_BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function(res) { return res.json().then(function(data) { return { ok: res.ok, data: data }; }); })
        .then(function(result) {
          if (!result.ok || result.data.error) throw new Error(result.data.error || 'Something went wrong. Please try again.');
          setTokens(result.data.access_token, result.data.refresh_token);
          if (typeof saveStoredProfile === 'function') {
            saveStoredProfile({ firstName: (result.data.user && result.data.user.firstName) || '', lastName: (result.data.user && result.data.user.lastName) || '', email: (result.data.user && result.data.user.email) || String(fd.get('email') || ''), plan: (result.data.user && result.data.user.plan) || 'free' });
          }
          var hasPreupload = localStorage.getItem('clasr:preuploadName');
          var hasConfig = localStorage.getItem('clasr:landingConfigComplete') === 'true';
          var pendPlan = null;
          try { pendPlan = localStorage.getItem('clasr:pendingPlan'); } catch (ex) {}
          if (pendPlan) {
            window.location.href = '/checkout/?plan=' + encodeURIComponent(pendPlan) + '&autoopen=1';
          } else {
            window.location.href = (hasPreupload && hasConfig) ? '/checkout/' : (result.data.nextUrl || '/dashboard/');
          }
        })
        .catch(function(err) {
          errEl.textContent = err.message;
          errEl.hidden = false;
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText || 'Submit'; }
        });
    }, true);
  });

  // ── Google OAuth ───────────────────────────────────────────────────────────
  document.querySelectorAll('[data-auth-google]').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = API_BASE + '/api/auth/google/start';
    });
  });

  // ── Forgot password ────────────────────────────────────────────────────────
  var fpForm = document.querySelector('[data-password-reset-form]');
  if (fpForm && !fpForm._apiWired) {
    fpForm._apiWired = true;
    fpForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var email = (fpForm.querySelector('[name=email]') || {}).value || '';
      var btn = fpForm.querySelector('[type=submit]');
      var successEl = fpForm.querySelector('[data-password-reset-success]');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      fetch(API_BASE + '/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email }),
      }).finally(function() {
        if (successEl) successEl.hidden = false;
        if (btn) btn.style.display = 'none';
      });
    });
  }

  // ── Reset password ─────────────────────────────────────────────────────────
  var npForm = document.querySelector('[data-new-password-form]');
  if (npForm) {
    var hash = {};
    location.hash.replace(/^#/, '').split('&').forEach(function(p) {
      var kv = p.split('='); hash[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    var resetToken = hash.access_token;
    var introEl = npForm.querySelector('[data-newpw-intro]');
    var invalidEl = npForm.querySelector('[data-newpw-invalid]');
    var npSuccessEl = npForm.querySelector('[data-newpw-success]');
    var pwInput = npForm.querySelector('[name=new_password]');
    var npBtn = npForm.querySelector('[type=submit]');
    if (!resetToken || hash.type !== 'recovery') {
      if (introEl) introEl.hidden = true;
      if (invalidEl) invalidEl.hidden = false;
      if (pwInput) pwInput.disabled = true;
      if (npBtn) npBtn.disabled = true;
    }
    npForm.addEventListener('submit', function(e) {
      e.preventDefault();
      if (!resetToken) return;
      var newPw = pwInput ? pwInput.value : '';
      if (!newPw || newPw.length < 8) return;
      if (npBtn) { npBtn.disabled = true; npBtn.textContent = 'Updating…'; }
      fetch(API_BASE + '/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: resetToken, new_password: newPw }),
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data.error) throw new Error(data.error);
          if (npSuccessEl) npSuccessEl.hidden = false;
          if (npBtn) npBtn.style.display = 'none';
          if (pwInput) { var f = pwInput.closest('.field'); if (f) f.style.display = 'none'; }
        })
        .catch(function(err) {
          var errEl = document.createElement('p');
          errEl.className = 'auth-error'; errEl.setAttribute('data-form-error', '');
          errEl.textContent = err.message;
          npForm.insertAdjacentElement('afterbegin', errEl);
          if (npBtn) { npBtn.disabled = false; npBtn.textContent = 'Set new password'; }
        });
    });
  }

  // ── OAuth callback (Google → tokens in hash) ───────────────────────────────
  var isCallback = Boolean(document.querySelector('[data-oauth-callback]'));
  if (isCallback) {
    var cbHash = {};
    location.hash.replace(/^#/, '').split('&').forEach(function(p) {
      var kv = p.split('='); cbHash[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    var cbToken = cbHash.access_token;
    var cbRefresh = cbHash.refresh_token;
    var cbType = cbHash.type; // 'signup' | 'login' | 'recovery'
    var statusEl = document.querySelector('[data-oauth-status]');
    if (cbToken) {
      setTokens(cbToken, cbRefresh);
      if (cbType === 'recovery') {
        window.location.replace('/reset-password/#access_token=' + cbToken + '&type=recovery');
      } else {
        // Bootstrap session then route
        fetch(API_BASE + '/api/session', { headers: { 'Authorization': 'Bearer ' + cbToken } })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (data && data.authenticated && typeof saveStoredProfile === 'function') {
              saveStoredProfile({ firstName: data.user.firstName || '', lastName: data.user.lastName || '', email: data.user.email, plan: data.user.plan });
            }
            window.location.replace(cbType === 'signup' ? '/onboarding/role/' : '/dashboard/');
          })
          .catch(function() { window.location.replace('/dashboard/'); });
      }
    } else {
      if (statusEl) { statusEl.textContent = 'Authentication failed. Please try again.'; statusEl.hidden = false; }
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  document.querySelectorAll('.account-dropdown__item--logout').forEach(function(link) {
    if (link._logoutWired) return;
    link._logoutWired = true;
    link.addEventListener('click', function(e) {
      e.preventDefault();
      var at = getToken();
      var done = function() {
        clearSession();
        ['clasr:selectedPlan','clasr:pendingPlan','clasr:checkoutComplete','clasr:checkoutDeferred','clasr:userProfile'].forEach(function(k) { localStorage.removeItem(k); });
        window.location.href = '/login/';
      };
      if (at) {
        fetch(API_BASE + '/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + at } }).catch(function() {}).then(done);
      } else { done(); }
    });
  });

  // ── Auth guard ─────────────────────────────────────────────────────────────
  var isDashboard = Boolean(document.querySelector('.dashboard-shell, .account-shell'));
  var isAuthPage = Boolean(document.querySelector('[data-auth-form]'));
  if (isDashboard && !isAuthPage && !getToken()) { window.location.replace('/login/'); }

  // ── Session bootstrap ──────────────────────────────────────────────────────
  var at = getToken();
  if (at) {
    apiJson('/api/session').then(function(data) {
      if (!data || !data.authenticated) return;
      if (typeof saveStoredProfile === 'function') {
        saveStoredProfile({ firstName: data.user.firstName || '', lastName: data.user.lastName || '', email: data.user.email, plan: data.user.plan, user_id: data.user.id || data.user.user_id || '' });
      }
      if (typeof applyAccountProfile === 'function') applyAccountProfile();
      if (typeof renderAccountPlanCards === 'function') renderAccountPlanCards();
      if (typeof renderAccountBillingPanel === 'function') renderAccountBillingPanel();
      if (typeof window._clasrAutoOpenCheckout === 'function') {
        window._clasrAutoOpenCheckout(data.user.id || data.user.user_id || '');
      }
      var checkoutRegisterBtn = document.querySelector('[data-checkout-register]');
      if (checkoutRegisterBtn) {
        checkoutRegisterBtn.href = '/dashboard/';
        checkoutRegisterBtn.textContent = 'Continue to payment →';
      }
      var creditLeftEl = document.querySelector('[data-credit-left]');
      if (creditLeftEl) { creditLeftEl.textContent = data.user.creditsLeft >= 9999 ? 'Unlimited' : String(data.user.creditsLeft); }
      var dashStartEl = document.querySelector('[data-dashboard-start]');
      if (dashStartEl && data.user.creditsLeft === 0) {
        dashStartEl.dataset.checkoutRequired = 'true';
        dashStartEl.setAttribute('href', '/dashboard/pricing/');
      }
    }).catch(function() {});

    var recentGrid = document.querySelector('[data-recent-grid]');
    var readingsHistoryList = document.querySelector('[data-readings-history-list]');
    var sidebarRecentList = document.querySelector('[data-sidebar-recent-list]');
    if (recentGrid || readingsHistoryList || sidebarRecentList) {
      apiFetch('/api/readings').then(function(res) {
        if (!res || !res.ok) {
          // Fetch genuinely failed (network error, rate limit, server error) —
          // leave the example/demo cards up but flag them as unloaded rather
          // than letting them silently pass as the user's real reading list.
          document.querySelectorAll('[data-example-note]').forEach(function(el) { el.hidden = false; });
          return null;
        }
        return res.json().catch(function() { return null; });
      }).then(function(data) {
        if (!data || !data.readings || !data.readings.length) return;
        document.querySelectorAll('[data-example-note]').forEach(function(el) { el.hidden = true; });
        var esc = function(s) { return String(s).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
        var fmtDate = function(iso) { try { var d = new Date(iso), diff = Math.floor((Date.now()-d)/86400000); return diff===0?'Today':diff===1?'Yesterday':d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); } catch(e){return'';} };
        var cardHtml = function(r) { return '<article class="reading-history-card"><span class="reading-history-card__date">'+fmtDate(r.createdAt)+'</span><div><h3>'+esc(r.title)+'</h3><span class="reading-history-card__metrics">'+r.severity.critical+' critical \xb7 '+r.severity.major+' major \xb7 '+r.severity.minor+' minor</span><p>'+esc(r.qProfile)+' \xb7 '+esc(r.mode)+' mode</p></div><div class="reading-history-card__actions"><a class="reading-history-card__action" href="'+esc(r.reportUrl)+'">Open report</a></div></article>'; };
        var html = data.readings.map(cardHtml).join('');
        if (recentGrid) recentGrid.innerHTML = html;
        if (readingsHistoryList) readingsHistoryList.innerHTML = html;
        if (sidebarRecentList) {
          sidebarRecentList.innerHTML = data.readings.slice(0,3).map(function(r) { return '<li><a class="sidebar-file" href="'+esc(r.reportUrl)+'"><span class="sidebar-file__name">'+esc(r.title)+'</span><span class="sidebar-file__meta">'+esc(r.qProfile)+' \xb7 '+esc(r.mode)+' \xb7 '+fmtDate(r.createdAt)+'</span></a></li>'; }).join('');
        }
      }).catch(function() {});
    }
  }

  // ── Dashboard upload ───────────────────────────────────────────────────────
  var _pendingFile = null;
  var dashUploadInput = document.querySelector('[data-landing-upload-input]');
  if (dashUploadInput) {
    dashUploadInput.addEventListener('change', function() { _pendingFile = dashUploadInput.files && dashUploadInput.files[0] || null; });
    var dropZone = document.querySelector('[data-landing-upload-drop]');
    if (dropZone) { dropZone.addEventListener('drop', function(e) { _pendingFile = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0] || null; }); }
  }
  var dashStartBtn = document.querySelector('[data-dashboard-start]');
  if (dashStartBtn && dashUploadInput) {
    dashStartBtn.addEventListener('click', function(e) {
      if (!_pendingFile || dashStartBtn.dataset.checkoutRequired === 'true') return;
      e.preventDefault();
      if (!getToken()) { window.location.href = '/login/'; return; }
      var getGroupActive = function(lbl) { var gs = document.querySelectorAll('.hero-config-group'); for (var i=0;i<gs.length;i++) { var l=gs[i].querySelector('.hero-role-label'); if (l && l.textContent.trim().toLowerCase()===lbl) { var a=gs[i].querySelector('.hero-role.is-active'); return a?a.textContent.trim():''; } } return ''; };
      var mode = (getGroupActive('reading as') || 'Author').toLowerCase();
      var qProfile = getGroupActive('q-profile') || 'Auto';
      var studyType = (getGroupActive('study type') || 'Quantitative').toLowerCase();
      var lbl = dashStartBtn.querySelector('span') || dashStartBtn;
      var orig = lbl.textContent;
      lbl.textContent = 'Uploading…';
      dashStartBtn.style.opacity = '0.6'; dashStartBtn.style.pointerEvents = 'none';
      var fd = new FormData();
      fd.append('file', _pendingFile); fd.append('mode', mode); fd.append('qProfile', qProfile); fd.append('studyType', studyType);
      apiFetch('/api/readings/start', { method: 'POST', body: fd })
        .then(function(res) { return res ? res.json().then(function(d) { return { ok: res.ok, data: d }; }) : Promise.reject(new Error('Network error')); })
        .then(function(r) {
          if (!r.ok || r.data.error) throw new Error(r.data.error || 'Upload failed');
          localStorage.setItem('clasr:pendingReadingMode', mode);
          window.location.href = '/dashboard/processing/?job=' + r.data.jobId;
        })
        .catch(function(err) {
          lbl.textContent = orig; dashStartBtn.style.opacity = ''; dashStartBtn.style.pointerEvents = '';
          var hc = dashStartBtn.closest('.hero-card'); var ee = hc && hc.querySelector('.api-upload-error');
          if (!ee) { ee = document.createElement('p'); ee.className = 'api-upload-error'; ee.style.cssText = 'color:#A32642;font-size:13px;margin-top:12px;text-align:center;'; if (hc) hc.appendChild(ee); }
          ee.textContent = err.message;
        });
    }, true);
  }

  // ── Processing poll ────────────────────────────────────────────────────────
  var procModeEl = document.querySelector('[data-processing-mode]');
  if (procModeEl) {
    var jobId = new URLSearchParams(window.location.search).get('job');
    if (jobId) {
      var stepEls = document.querySelectorAll('.processing-steps li');
      var pollTimer = null;
      var activateStep = function(idx) { stepEls.forEach(function(el, i) { el.classList.toggle('is-active', i <= idx); }); };
      var handleJob = function(data) {
        if (!data || !data.job) return;
        var job = data.job;
        if (job.progress > 10) activateStep(1);
        if (job.progress > 40) activateStep(2);
        if (job.progress > 70) activateStep(3);
        if (job.status === 'complete' && job.reportUrl) {
          if (pollTimer) clearInterval(pollTimer);
          window.location.href = job.reportUrl;
        } else if (job.status === 'failed') {
          if (pollTimer) clearInterval(pollTimer);
          procModeEl.textContent = 'Processing failed';
          var ee = document.querySelector('[data-processing-error]') || document.createElement('p');
          ee.setAttribute('data-processing-error',''); ee.style.cssText = 'color:#A32642;margin-top:16px;';
          ee.textContent = job.error || 'Processing failed. Please try again from your dashboard.';
          if (!document.querySelector('[data-processing-error]')) { var pm = procModeEl.closest('.processing-panel__main'); if (pm) pm.appendChild(ee); }
        }
      };
      apiJson('/api/processing/' + jobId).then(handleJob).catch(function() {});
      pollTimer = setInterval(function() { apiJson('/api/processing/' + jobId).then(handleJob).catch(function() {}); }, 2000);
    }
  }

  // ── Reading report render ──────────────────────────────────────────────────
  // Parses the fixed report structure locked by UNIFIED-OUTPUT KIT v1.3:
  // header block, ▸ PRIORITY ACTION SIGNALS, ▸ SECTION [N] — [NAME] (0-10),
  // ▸ SIGNAL CONFIDENCE PROFILE, ▸ ARGUMENT DENSITY, an INTEGRATED RISK
  // POSTURE rule-delimited block, then a closing rule-delimited disclaimer.
  var clasrParseReport = function(raw) {
    var lines = String(raw || '').replace(/\r\n/g, '\n').split('\n');
    var isRule = function(l) { return /^[━=\-]{5,}$/.test(l.trim()); };
    var result = { priorityBlock: '', sections: [], confidenceProfile: '', argumentDensity: '', riskPosture: null, closing: '', calibrationNote: '' };
    var n = lines.length;

    // 1. INTEGRATED RISK POSTURE: rule, title, rule, LABEL, sentence(s), rule — find wherever it occurs.
    //    LABEL may carry a trailing partial-input note (kit §8b), e.g.
    //    "HIGH [Partial input — posture based on available dimensions]" —
    //    split off just the leading LOW/MEDIUM/HIGH/CRITICAL token for the
    //    CSS class while keeping the full text for display.
    var riskPostureEndIdx = -1;
    for (var p = 0; p < n; p++) {
      if (isRule(lines[p].trim()) && /^INTEGRATED RISK POSTURE$/i.test((lines[p + 1] || '').trim())) {
        var q = p + 2;
        if (isRule((lines[q] || '').trim())) q++;
        var label = (lines[q] || '').trim(); q++;
        var sentenceLines = [];
        var closeIdx = q;
        while (closeIdx < n && !isRule((lines[closeIdx] || '').trim())) { if (lines[closeIdx].trim()) sentenceLines.push(lines[closeIdx].trim()); closeIdx++; }
        var levelMatch = label.match(/^(LOW|MEDIUM|HIGH|CRITICAL)\b/i);
        result.riskPosture = { label: label, level: levelMatch ? levelMatch[1].toUpperCase() : '', sentence: sentenceLines.join(' ') };
        // closeIdx now points at the rule line that closes this block (the
        // loop stopped there because isRule() was true) — record it so the
        // closing-block search below can skip past it.
        riskPostureEndIdx = closeIdx;
        break;
      }
    }

    // 2. CLOSING BLOCK: the last rule-delimited block in the document — but
    //    never the RISK POSTURE block's own closing rule, so a report with
    //    no separate closing disclaimer doesn't re-show the posture text a
    //    second time as if it were the closing note.
    var lastRuleIdx = -1;
    for (var r = n - 1; r >= 0; r--) {
      if (r === riskPostureEndIdx) continue;
      if (isRule(lines[r].trim())) { lastRuleIdx = r; break; }
    }
    if (lastRuleIdx > -1 && lastRuleIdx > riskPostureEndIdx) {
      var openIdx = -1;
      for (var o = lastRuleIdx - 1; o >= 0; o--) { if (isRule(lines[o].trim())) { openIdx = o; break; } }
      if (openIdx > -1 && openIdx !== riskPostureEndIdx) {
        var closingLines = [];
        for (var c = openIdx + 1; c < lastRuleIdx; c++) { if (lines[c].trim()) closingLines.push(lines[c].trim()); }
        if (closingLines.length) result.closing = closingLines.join(' ');
      }
    }

    // 3. Bucket-scan for ▸-prefixed section/block markers. Any rule line ends
    //    the current bucket (header/risk-posture/closing content is handled
    //    above and never has an open bucket to join here). Section headers
    //    accept a dash or colon between number and title (kit spec uses a
    //    dash, but a colon is plausible model drift worth tolerating).
    //    A bare "[Calibration: ...]" line (kit §9) belongs to no bucket and
    //    is captured separately so it isn't silently lost.
    var buckets = [];
    var current = null;
    for (var i = 0; i < n; i++) {
      var trimmed = lines[i].trim();
      var mSection = trimmed.match(/^▸\s*SECTION\s+(\d+)\s*[—–:-]\s*(.+)$/i);

      if (mSection) { current = { type: 'section', number: mSection[1], name: mSection[2].trim(), lines: [] }; buckets.push(current); continue; }
      if (/^▸\s*PRIORITY ACTION SIGNALS/i.test(trimmed)) { current = { type: 'priority', lines: [] }; buckets.push(current); continue; }
      if (/^▸\s*SIGNAL CONFIDENCE PROFILE/i.test(trimmed)) { current = { type: 'confidence', lines: [] }; buckets.push(current); continue; }
      if (/^▸\s*ARGUMENT DENSITY/i.test(trimmed)) { current = { type: 'density', lines: [] }; buckets.push(current); continue; }
      if (isRule(trimmed)) { current = null; continue; }
      if (!current && /^\[Calibration:.*\]$/i.test(trimmed)) { result.calibrationNote = trimmed; continue; }
      if (trimmed && current) current.lines.push(lines[i]);
    }

    buckets.forEach(function(b) {
      var text = b.lines.join('\n').trim();
      if (!text) return;
      if (b.type === 'priority') result.priorityBlock = text;
      else if (b.type === 'confidence') result.confidenceProfile = text;
      else if (b.type === 'density') result.argumentDensity = text;
      else if (b.type === 'section') {
        // Prefer a severity tag on the section's own first line (the primary
        // finding) over one that might appear later in prose referencing a
        // different section's severity.
        var firstLine = b.lines[0] || '';
        var sevMatch = firstLine.match(/\[(CRITICAL|MAJOR|MINOR)\]/) || text.match(/\[(CRITICAL|MAJOR|MINOR)\]/);
        result.sections.push({ number: b.number, name: b.name, severity: sevMatch ? sevMatch[1] : null, body: text });
      }
    });

    return result;
  };

  var clasrMarkTags = function(s) {
    return escapeHtml(s)
      .replace(/\[CRITICAL\]/g, '<mark class="sev sev--critical">CRITICAL</mark>')
      .replace(/\[MAJOR\]/g, '<mark class="sev sev--major">MAJOR</mark>')
      .replace(/\[MINOR\]/g, '<mark class="sev sev--minor">MINOR</mark>')
      .replace(/\n/g, '<br>');
  };
  var clasrParagraphize = function(text) {
    return text.split(/\n\s*\n/).filter(function(p) { return p.trim(); }).map(function(p) {
      return '<p>' + clasrMarkTags(p.trim()) + '</p>';
    }).join('');
  };

  var clasrRenderReportHtml = function(parsed, data) {
    var html = '<div class="api-report">';

    if (parsed.riskPosture && parsed.riskPosture.label) {
      var levelClass = parsed.riskPosture.level ? parsed.riskPosture.level.toLowerCase() : '';
      html += '<div class="risk-card risk-card--report">' +
        '<span>Integrated risk posture</span>' +
        '<strong class="risk-label' + (levelClass ? ' risk-label--' + levelClass : '') + '">' + escapeHtml(parsed.riskPosture.label) + '</strong>' +
        (parsed.riskPosture.sentence ? '<p>' + escapeHtml(parsed.riskPosture.sentence) + '</p>' : '') +
        '</div>';
    }

    if (parsed.priorityBlock) {
      html += '<section class="report-block report-block--priority"><h2>Priority action signals</h2><div class="report-block__body">' + clasrParagraphize(parsed.priorityBlock) + '</div></section>';
    }

    parsed.sections.forEach(function(sec) {
      html += '<article class="report-section-card">' +
        '<div class="report-section-card__head">' +
          '<span class="report-section-card__number">Section ' + escapeHtml(sec.number) + '</span>' +
          '<h3>' + escapeHtml(sec.name) + '</h3>' +
          (sec.severity ? '<span class="severity severity--' + sec.severity.toLowerCase() + '">' + escapeHtml(sec.severity) + '</span>' : '') +
        '</div>' +
        '<div class="report-section-card__body">' + clasrParagraphize(sec.body) + '</div>' +
      '</article>';
    });

    if (parsed.argumentDensity) {
      html += '<section class="report-block report-block--density"><h2>Argument density</h2><div class="report-block__body">' + clasrParagraphize(parsed.argumentDensity) + '</div></section>';
    }
    if (parsed.confidenceProfile) {
      html += '<section class="report-block report-block--confidence"><h2>Signal confidence profile</h2><div class="report-block__body">' + clasrParagraphize(parsed.confidenceProfile) + '</div></section>';
    }
    if (parsed.calibrationNote) {
      html += '<p class="report-closing-note">' + escapeHtml(parsed.calibrationNote) + '</p>';
    }
    if (parsed.closing) {
      html += '<p class="report-closing-note">' + escapeHtml(parsed.closing) + '</p>';
    }

    html += '</div>';

    // Fallback: parsing found nothing structured — never show a blank report.
    if (!parsed.riskPosture && !parsed.sections.length && !parsed.priorityBlock) {
      html = '<div class="api-report">' + clasrParagraphize(data.report || '') + '</div>';
    }

    return html;
  };

  var clasrDocxLoaded = null;
  var clasrLoadDocxLib = function() {
    if (window.docx) return Promise.resolve(window.docx);
    if (clasrDocxLoaded) return clasrDocxLoaded;
    clasrDocxLoaded = new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/docx@9.7.1/dist/index.umd.cjs';
      s.onload = function() { window.docx ? resolve(window.docx) : reject(new Error('docx failed to load')); };
      s.onerror = function() { reject(new Error('docx failed to load')); };
      document.head.appendChild(s);
    }).catch(function(err) {
      // Don't cache a failed load — a transient network/CDN hiccup shouldn't
      // permanently block DOCX export for the rest of the page session.
      clasrDocxLoaded = null;
      throw err;
    });
    return clasrDocxLoaded;
  };

  var clasrDownloadBlob = function(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  var clasrSlugify = function(s) { return String(s || 'clasr-signal-report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'clasr-signal-report'; };

  var clasrExportTxt = function(data) {
    clasrDownloadBlob(new Blob([data.report || ''], { type: 'text/plain;charset=utf-8' }), clasrSlugify(data.title) + '.txt');
  };

  var clasrExportDocx = function(data, parsed) {
    return clasrLoadDocxLib().then(function(docx) {
      var children = [];
      children.push(new docx.Paragraph({ text: data.title || 'Clasr Signal Report', heading: docx.HeadingLevel.TITLE }));
      if (parsed.riskPosture && parsed.riskPosture.label) {
        children.push(new docx.Paragraph({ text: 'Integrated risk posture: ' + parsed.riskPosture.label, heading: docx.HeadingLevel.HEADING_2 }));
        if (parsed.riskPosture.sentence) children.push(new docx.Paragraph({ children: [new docx.TextRun(parsed.riskPosture.sentence)] }));
      }
      var addBlock = function(title, text) {
        children.push(new docx.Paragraph({ text: title, heading: docx.HeadingLevel.HEADING_2 }));
        text.split(/\n\s*\n/).filter(Boolean).forEach(function(p) {
          children.push(new docx.Paragraph({ children: [new docx.TextRun(p.replace(/\n/g, ' ').trim())] }));
        });
      };
      if (parsed.priorityBlock) addBlock('Priority action signals', parsed.priorityBlock);
      parsed.sections.forEach(function(sec) {
        addBlock('Section ' + sec.number + ' — ' + sec.name + (sec.severity ? ' [' + sec.severity + ']' : ''), sec.body);
      });
      if (parsed.argumentDensity) addBlock('Argument density', parsed.argumentDensity);
      if (parsed.confidenceProfile) addBlock('Signal confidence profile', parsed.confidenceProfile);
      if (parsed.calibrationNote) children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: parsed.calibrationNote, italics: true })] }));
      if (parsed.closing) children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: parsed.closing, italics: true })] }));

      var doc = new docx.Document({ sections: [{ children: children }] });
      return docx.Packer.toBlob(doc);
    }).then(function(blob) {
      clasrDownloadBlob(blob, clasrSlugify(data.title) + '.docx');
    }).catch(function() {
      // Library failed to load (network/CDN issue) — fall back to plain text
      // rather than leaving the click with no result.
      clasrExportTxt(data);
    });
  };

  var clasrShowReportError = function(message) {
    var rb = document.querySelector('.reading-report-body');
    if (rb) rb.innerHTML = '<div class="api-report"><p class="report-closing-note">' + escapeHtml(message) + '</p></div>';
    document.querySelectorAll('[data-export-report]').forEach(function(btn) { btn.disabled = true; });
  };

  var reportId = new URLSearchParams(window.location.search).get('id');
  if (reportId) {
    apiFetch('/api/readings/' + reportId).then(function(res) {
      if (res && res.status === 429) {
        clasrShowReportError('This page is refreshing too quickly and hit a rate limit. Please wait a moment, then reload this page.');
        return 'handled';
      }
      if (!res) {
        clasrShowReportError('Could not reach the server. Please check your connection and reload this page.');
        return 'handled';
      }
      return res.json().catch(function() { return null; });
    }).then(function(data) {
      if (data === 'handled') return;
      if (!data || data.error) {
        clasrShowReportError('This reading could not be found for your account. If you followed a link from another account, log in as that account to view it.');
        return;
      }
      document.title = (data.title || 'Signal Report') + ' — Clasr';
      var tl = document.querySelector('.report-topline');
      if (tl) {
        var spans = tl.querySelectorAll('span:not(.section-eyebrow)');
        var vals = [(data.studyType||'Quantitative').charAt(0).toUpperCase()+(data.studyType||'Quantitative').slice(1), data.qProfile||'Q1', (data.mode||'author').charAt(0).toUpperCase()+(data.mode||'author').slice(1)+' Mode'];
        spans.forEach(function(s,i) { if (vals[i]) s.textContent = vals[i]; });
        var h1 = tl.querySelector('h1'); if (h1) h1.textContent = data.title || 'Signal Report';
      }
      var ms = document.querySelectorAll('.signal-metrics div strong');
      if (ms.length >= 3 && data.severity) { ms[0].textContent=String(data.severity.critical||0); ms[1].textContent=String(data.severity.major||0); ms[2].textContent=String(data.severity.minor||0); }

      var parsed = clasrParseReport(data.report || '');
      var rb = document.querySelector('.reading-report-body');
      if (rb && data.report) {
        rb.innerHTML = clasrRenderReportHtml(parsed, data);
      }

      document.querySelectorAll('[data-export-report]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          var kind = btn.getAttribute('data-export-report');
          if (kind === 'txt') clasrExportTxt(data);
          else if (kind === 'pdf') window.print();
          else if (kind === 'docx') clasrExportDocx(data, parsed);
        });
      });
    }).catch(function() {
      clasrShowReportError('This reading could not be loaded. Please try again in a moment.');
    });
  }

}());

// ── Cookie notice ────────────────────────────────
(function () {
  var KEY = 'clasr:cookieAccepted';

  function buildBanner() {
    var el = document.createElement('div');
    el.className = 'cookie-notice';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Cookie notice');
    el.innerHTML =
      '<div class="cookie-notice__text">' +
        '<strong class="cookie-notice__title">Cookie notice</strong>' +
        '<p class="cookie-notice__desc">Clasr currently uses essential storage only. No analytics or non-essential cookies are active. We will ask before introducing them.</p>' +
      '</div>' +
      '<div class="cookie-notice__actions">' +
        '<a href="/cookie-policy/" class="cookie-notice__policy">Cookie Policy</a>' +
        '<button type="button" class="cookie-notice__btn">Got it</button>' +
      '</div>';
    el.querySelector('.cookie-notice__btn').addEventListener('click', function () {
      localStorage.setItem(KEY, '1');
      el.remove();
    });
    return el;
  }

  function showBanner() {
    if (localStorage.getItem(KEY)) return;
    if (document.querySelector('.cookie-notice')) return;
    document.body.appendChild(buildBanner());
  }

  // "Cookie preferences" footer links re-open the banner
  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-cookie-preferences]');
    if (!link) return;
    e.preventDefault();
    localStorage.removeItem(KEY);
    var existing = document.querySelector('.cookie-notice');
    if (existing) existing.remove();
    document.body.appendChild(buildBanner());
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showBanner);
  } else {
    showBanner();
  }
}());

// ── Paddle Checkout overlay ───────────────────────
(function () {
  var PADDLE_CLIENT_TOKEN = 'live_5e676fb00dad38d72a99a6f04f5';

  var PADDLE_PRICES = {
    'trial-pack':           'pri_01kwwh5epwyphhpce1nw23d30z',
    'researcher-monthly':   'pri_01kwwh4cwhwpgvp02mhne8cxe9',
    'researcher-annual':    'pri_01kwwh18968hfb3z60rc8kkpem',
    'professional-monthly': 'pri_01kwwh3aqyw7yxzpty9536hx9q',
    'professional-annual':  'pri_01kwwgzcapnqz4xrvfgaafa3nv',
    'extra-reading':        'pri_01kwwgvf64gw3a9mdde2qm6h1g'
  };

  var onPricing  = !!document.querySelector('.plan-grid');
  var onCheckout = !!document.querySelector('.checkout-page');
  var onPublic   = !document.querySelector('.dashboard-shell, .account-shell, [data-auth-form]');

  var paddleReady = false;

  function getUserId() {
    try {
      var p = JSON.parse(localStorage.getItem('clasr:userProfile') || '{}');
      return p.user_id || p.id || null;
    } catch (ex) { return null; }
  }

  function loadPaddle(cb) {
    if (paddleReady) { cb(); return; }
    if (window.Paddle) {
      // Paddle.js was pre-loaded via a static <script> tag; just initialise.
      Paddle.Initialize({ token: PADDLE_CLIENT_TOKEN });
      paddleReady = true;
      cb();
      return;
    }
    var s = document.createElement('script');
    s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    s.onload = function () {
      Paddle.Initialize({ token: PADDLE_CLIENT_TOKEN });
      paddleReady = true;
      cb();
    };
    document.head.appendChild(s);
  }

  // On public pages call loadPaddle so Retain is initialised regardless of
  // whether the user clicks a plan button. The static <script> tag in the
  // page <head> lets Paddle's Retain checker detect the snippet at scan time.
  if (onPublic) { loadPaddle(function () {}); }

  // Auto-open Paddle when redirected here after auth with a pending plan.
  // Session bootstrap (above) calls window._clasrAutoOpenCheckout(userId)
  // once the user's session is confirmed, triggering Paddle immediately.
  if (onCheckout) {
    var autoOpenParam = (new URL(window.location.href)).searchParams.get('autoopen');
    if (autoOpenParam === '1') {
      window._clasrAutoOpenCheckout = function (userId) {
        if (!userId) return;
        try { localStorage.removeItem('clasr:pendingPlan'); } catch (ex) {}
        var planEl = document.querySelector('.checkout-plan.is-selected');
        var plan = planEl ? planEl.dataset.checkoutPlan : 'trial-pack';
        var priceKey = plan === 'trial-pack' ? 'trial-pack' : plan + '-' + (getBilling() === 'annual' ? 'annual' : 'monthly');
        var priceId = PADDLE_PRICES[priceKey];
        if (priceId) loadPaddle(function () { openCheckout(priceId, plan, userId); });
      };
    }
  }

  if (!onPricing && !onCheckout) return;

  function openCheckout(priceId, plan, userId) {
    var opts = {
      items: [{ priceId: priceId, quantity: 1 }],
      settings: {
        successUrl: userId
          ? 'https://clasr.ai/dashboard/'
          : 'https://clasr.ai/register/?checkout=complete&plan=' + plan
      }
    };
    if (userId) opts.customData = { userId: userId };
    Paddle.Checkout.open(opts);
  }

  function getBilling() {
    var el = document.querySelector('[data-billing-option].is-active');
    return el ? el.dataset.billingOption : 'monthly';
  }

  document.addEventListener('click', function (e) {
    // Checkout page: "Continue to checkout" button
    var checkoutBtn = e.target.closest('[data-checkout-register]');
    if (checkoutBtn) {
      var userId = getUserId();
      if (!userId) return; // not logged in — let href go to /register/
      e.preventDefault();
      var planEl = document.querySelector('.checkout-plan.is-selected');
      var plan = planEl ? planEl.dataset.checkoutPlan : 'trial-pack';
      var priceKey = plan === 'trial-pack' ? 'trial-pack' : plan + '-' + (getBilling() === 'annual' ? 'annual' : 'monthly');
      var priceId = PADDLE_PRICES[priceKey];
      if (!priceId) { window.location.href = checkoutBtn.href; return; }
      loadPaddle(function () { openCheckout(priceId, plan, userId); });
      return;
    }

    // Pricing page: plan CTA buttons
    var planBtn = e.target.closest('a.plan-card__cta');
    if (planBtn) {
      var userId = getUserId(); // null if not logged in — openCheckout handles it
      var rawHref = planBtn.getAttribute('href') || '';
      var match = rawHref.match(/[?&]plan=([^&]+)/);
      if (match) {
        e.preventDefault();
        var plan = decodeURIComponent(match[1]);
        var priceKey = plan === 'trial-pack' ? 'trial-pack' : plan + '-' + (getBilling() === 'annual' ? 'annual' : 'monthly');
        var priceId = PADDLE_PRICES[priceKey];
        if (!priceId) { window.location.href = planBtn.href; return; }
        loadPaddle(function () { openCheckout(priceId, plan, userId); });
        return;
      }
    }
  });
}());


