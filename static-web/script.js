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

  const markActiveButton = (button) => {
    group.querySelectorAll("button").forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });
  };

  const commitHistoryState = (button, historyEnabled) => {
    markActiveButton(button);
    localStorage.setItem("clasr:readingHistoryEnabled", String(historyEnabled));
    setHistoryStatus(historyEnabled);
    renderDashboardRecentBlocks(historyEnabled);
  };

  group.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      if (!isReadingHistory) {
        markActiveButton(button);
        return;
      }

      const historyEnabled = button.textContent.trim().toLowerCase() === "on";
      // Turning history off permanently deletes every saved reading, so it
      // must go through a warning + password re-check before anything
      // changes — the button must not flip active until that's confirmed.
      if (!historyEnabled && typeof window.clasrConfirmTurnOffHistory === "function") {
        window.clasrConfirmTurnOffHistory(() => commitHistoryState(button, false));
        return;
      }
      commitHistoryState(button, historyEnabled);
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

  const markActiveHistoryButton = (isEnabled) => {
    if (historyEnable) { historyEnable.classList.toggle("is-active", isEnabled); historyEnable.setAttribute("aria-pressed", String(isEnabled)); }
    if (historyDisable) { historyDisable.classList.toggle("is-active", !isEnabled); historyDisable.setAttribute("aria-pressed", String(!isEnabled)); }
  };

  const renderHistoryState = (forcedState) => {
    const isEnabled = typeof forcedState === "boolean" ? forcedState : getHistoryEnabled();
    historyEmpty.hidden = isEnabled;
    historyList.hidden = !isEnabled;
    markActiveHistoryButton(isEnabled);
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

    const commit = () => {
      setHistoryEnabled(false);
      renderHistoryState(false);
      renderDashboardRecentBlocks(false);
    };
    // Turning history off permanently deletes every saved reading — must be
    // confirmed (warning + password re-check) before anything changes.
    if (typeof window.clasrConfirmTurnOffHistory === "function") {
      window.clasrConfirmTurnOffHistory(commit);
      return;
    }
    commit();
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
          var pendPlan = null;
          try { pendPlan = localStorage.getItem('clasr:pendingPlan'); } catch (ex) {}
          if (pendPlan) {
            window.location.href = '/checkout/?plan=' + encodeURIComponent(pendPlan) + '&autoopen=1';
          } else if (formType === 'login') {
            // An existing account signing in must always land where the
            // backend says to (honors their real plan/subscription state).
            // Leftover clasr:preuploadName/landingConfigComplete flags from
            // an earlier, unrelated guest-upload-then-signup attempt on
            // this browser are never cleared, so they must never override
            // a real login's destination — that was sending paid users to
            // /checkout/ ("Choose a Plan") instead of their dashboard.
            window.location.href = result.data.nextUrl || '/dashboard/';
          } else {
            var hasPreupload = localStorage.getItem('clasr:preuploadName');
            var hasConfig = localStorage.getItem('clasr:landingConfigComplete') === 'true';
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
    var recentViewAll = document.querySelector('[data-recent-view-all]');
    var recentExamplesTpl = document.querySelector('[data-recent-examples]');
    var readingsExamplesTpl = document.querySelector('[data-readings-examples]');
    if (recentGrid || readingsHistoryList || sidebarRecentList) {
      // The demo/example reading cards live in <template> tags (inert, never
      // painted) rather than as default DOM content — an authenticated user
      // must never see demo data flash before their real readings (or the
      // real "no readings yet" state) load in.
      var showExamples = function(container, tpl) {
        if (!container || !tpl) return;
        container.innerHTML = '';
        container.appendChild(tpl.content.cloneNode(true));
      };
      var fallbackToExamples = function() {
        document.querySelectorAll('[data-example-note]').forEach(function(el) { el.hidden = false; });
        showExamples(recentGrid, recentExamplesTpl);
        showExamples(readingsHistoryList, readingsExamplesTpl);
        if (recentViewAll) recentViewAll.hidden = true;
      };
      apiFetch('/api/readings').then(function(res) {
        if (!res || !res.ok) {
          // Fetch genuinely failed (network error, rate limit, server error) —
          // fall back to example cards but flag them as unloaded rather than
          // letting them silently pass as the user's real reading list.
          fallbackToExamples();
          return null;
        }
        return res.json().catch(function() { return null; });
      }).then(function(data) {
        if (!data || !data.readings) { fallbackToExamples(); return; }
        if (!data.readings.length) { fallbackToExamples(); return; }
        document.querySelectorAll('[data-example-note]').forEach(function(el) { el.hidden = true; });
        var esc = function(s) { return String(s).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
        var fmtDate = function(iso) { try { var d = new Date(iso), diff = Math.floor((Date.now()-d)/86400000); return diff===0?'Today':diff===1?'Yesterday':d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); } catch(e){return'';} };
        var cardHtml = function(r) { return '<article class="reading-history-card"><span class="reading-history-card__date">'+fmtDate(r.createdAt)+'</span><div><h3>'+esc(r.title)+'</h3><span class="reading-history-card__metrics">'+r.severity.critical+' critical \xb7 '+r.severity.major+' major \xb7 '+r.severity.minor+' minor</span><p>'+esc(r.qProfile)+' \xb7 '+esc(r.mode)+' mode</p></div><div class="reading-history-card__actions"><a class="reading-history-card__action" href="'+esc(r.reportUrl)+'">Open report</a></div></article>'; };
        if (recentGrid) {
          // Dashboard home only ever shows the 3 most recent, with a link to
          // the full Readings page for the rest.
          recentGrid.innerHTML = data.readings.slice(0, 3).map(cardHtml).join('');
          if (recentViewAll) recentViewAll.hidden = false;
        }
        if (readingsHistoryList) readingsHistoryList.innerHTML = data.readings.map(cardHtml).join('');
        if (sidebarRecentList) {
          sidebarRecentList.innerHTML = data.readings.slice(0,3).map(function(r) { return '<li><a class="sidebar-file" href="'+esc(r.reportUrl)+'"><span class="sidebar-file__name">'+esc(r.title)+'</span><span class="sidebar-file__meta">'+esc(r.qProfile)+' \xb7 '+esc(r.mode)+' \xb7 '+fmtDate(r.createdAt)+'</span></a></li>'; }).join('');
        }
      }).catch(fallbackToExamples);
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
    var result = { executiveSummary: '', priorityBlock: '', sections: [], confidenceProfile: '', argumentDensity: '', riskPosture: null, closing: '', calibrationNote: '' };
    var n = lines.length;

    // Index of the first ▸-prefixed marker (first real section/block start).
    // Top-level header blocks (title, EXECUTIVE SUMMARY, PRIORITY ACTION
    // SIGNALS, etc.) only ever appear before this point in the live kit
    // output — bounding the search here keeps later same-named-looking
    // rule-boxes nested inside a section (there are none today, but this
    // stays robust if a future kit revision reuses a title) from being
    // mistaken for the top-level block.
    var firstMarkerIdx = n;
    for (var m = 0; m < n; m++) {
      if (/^▸\s*(SECTION\s+\d+|PRIORITY ACTION SIGNALS|SIGNAL CONFIDENCE PROFILE|ARGUMENT DENSITY)/i.test(lines[m].trim())) { firstMarkerIdx = m; break; }
    }

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

    // 2. Other top-level "rule, TITLE, rule, content..., rule" blocks that
    //    the live kit emits WITHOUT a ▸ prefix (only ▸ SECTION/PRIORITY
    //    ACTION SIGNALS/etc. carry one) — EXECUTIVE SUMMARY in particular,
    //    plus PRIORITY ACTION SIGNALS/SIGNAL CONFIDENCE PROFILE/ARGUMENT
    //    DENSITY as a fallback for whichever of those also arrive bare.
    //    Bounded to before firstMarkerIdx so a same-named nested box
    //    inside a section (there are none observed today) can't collide.
    var findTopBlock = function(titleRe) {
      for (var t = 0; t < firstMarkerIdx; t++) {
        if (isRule(lines[t].trim()) && titleRe.test((lines[t + 1] || '').trim())) {
          var bq = t + 2;
          if (isRule((lines[bq] || '').trim())) bq++;
          var bodyLines = [];
          var bClose = bq;
          while (bClose < n && !isRule((lines[bClose] || '').trim())) { bodyLines.push(lines[bClose]); bClose++; }
          return bodyLines.join('\n').trim();
        }
      }
      return '';
    };
    result.executiveSummary = findTopBlock(/^EXECUTIVE SUMMARY$/i);
    var barePriority = findTopBlock(/^PRIORITY ACTION SIGNALS$/i);
    var bareConfidence = findTopBlock(/^SIGNAL CONFIDENCE PROFILE$/i);
    var bareDensity = findTopBlock(/^ARGUMENT DENSITY$/i);

    // 3. Bucket-scan for ▸-prefixed section/block markers. Section headers
    //    accept a dash or colon between number and title (kit spec uses a
    //    dash, but a colon is plausible model drift worth tolerating). A
    //    bare "[Calibration: ...]" line (kit §9) belongs to no bucket and is
    //    captured separately so it isn't silently lost.
    //
    //    Rule lines do NOT end a 'section' bucket — the live kit nests
    //    rule-delimited sub-boxes (OVERREACH PROFILE, DESK-REJECT RISK
    //    PROFILE, SOURCE INTEGRITY SCOPE, ...) inside section bodies, using
    //    the same ━━━ rule characters as decorative borders. Previously any
    //    rule line reset the bucket to null, silently dropping everything
    //    from that sub-box onward until the next ▸ marker — an entire
    //    section's tail (often its most detailed content) vanished. A
    //    section only really ends at the next ▸ marker or end of document;
    //    the rule characters themselves are stripped so they don't render
    //    as literal ━━━ runs inside a paragraph.
    var buckets = [];
    var current = null;
    var lastConsumedIdx = firstMarkerIdx - 1;
    for (var i = firstMarkerIdx; i < n; i++) {
      var trimmed = lines[i].trim();
      var mSection = trimmed.match(/^▸\s*SECTION\s+(\d+)\s*[—–:-]\s*(.+)$/i);

      if (mSection) { current = { type: 'section', number: mSection[1], name: mSection[2].trim(), lines: [] }; buckets.push(current); lastConsumedIdx = i; continue; }
      if (/^▸\s*PRIORITY ACTION SIGNALS/i.test(trimmed)) { current = { type: 'priority', lines: [] }; buckets.push(current); lastConsumedIdx = i; continue; }
      if (/^▸\s*SIGNAL CONFIDENCE PROFILE/i.test(trimmed)) { current = { type: 'confidence', lines: [] }; buckets.push(current); lastConsumedIdx = i; continue; }
      if (/^▸\s*ARGUMENT DENSITY/i.test(trimmed)) { current = { type: 'density', lines: [] }; buckets.push(current); lastConsumedIdx = i; continue; }
      if (current && current.type !== 'section' && isRule(trimmed)) { current = null; continue; }
      if (isRule(trimmed)) continue; // nested sub-box divider inside a section — drop, keep the bucket open
      if (!current && /^\[Calibration:.*\]$/i.test(trimmed)) { result.calibrationNote = trimmed; continue; }
      if (trimmed && current) { current.lines.push(lines[i]); lastConsumedIdx = i; }
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

    if (!result.priorityBlock) result.priorityBlock = barePriority;
    if (!result.confidenceProfile) result.confidenceProfile = bareConfidence;
    if (!result.argumentDensity) result.argumentDensity = bareDensity;

    // 4. CLOSING BLOCK: the last rule-delimited block in the document, but
    //    only if it falls strictly after all real content already claimed
    //    above (sections/priority/etc.) — otherwise a nested sub-box inside
    //    the final section (which no longer ends that section's bucket,
    //    per the fix above) could still be misread as the closing note.
    //    Also never the RISK POSTURE block's own closing rule, so a report
    //    with no separate closing disclaimer doesn't re-show the posture
    //    text a second time as if it were the closing note.
    var closingFloor = Math.max(riskPostureEndIdx, lastConsumedIdx);
    var lastRuleIdx = -1;
    for (var r = n - 1; r >= 0; r--) {
      if (r === riskPostureEndIdx) continue;
      if (isRule(lines[r].trim())) { lastRuleIdx = r; break; }
    }
    if (lastRuleIdx > -1 && lastRuleIdx > closingFloor) {
      var openIdx = -1;
      for (var o = lastRuleIdx - 1; o >= 0; o--) { if (isRule(lines[o].trim())) { openIdx = o; break; } }
      if (openIdx > -1 && openIdx !== riskPostureEndIdx && openIdx >= closingFloor) {
        var closingLines = [];
        for (var c = openIdx + 1; c < lastRuleIdx; c++) { if (lines[c].trim()) closingLines.push(lines[c].trim()); }
        if (closingLines.length) result.closing = closingLines.join(' ');
      }
    }

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

    if (parsed.executiveSummary) {
      html += '<section class="report-block report-block--summary"><h2>Executive summary</h2><div class="report-block__body">' + clasrParagraphize(parsed.executiveSummary) + '</div></section>';
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
      if (parsed.executiveSummary) addBlock('Executive summary', parsed.executiveSummary);
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

  // ── Structured Author Mode report render (2026-08-24) ──────────────────
  // Consumes the JSON shape reformatReportAuthorJson() produces server-side
  // (GET /api/readings/:id's `reportJson` field) instead of parsing free
  // text — the schema is enforced by the API call itself, so this never
  // has to guess at section boundaries the way clasrParseReport does.
  var clasrJsonCleanText = function(value) {
    return String(value || '')
      .replace(/^#+\s*/g, '')
      .replace(/\\+$/g, '')
      .replace(/\\\s*/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  var clasrJsonEmphasis = function(html) {
    return html
      .replace(/\s[—–]\s/g, ', ')
      .replace(/\b(MEDIUM-HIGH|RISK DETECTED|NOT DETECTED|MODERATE|LOW|HIGH|CRITICAL)\b/g, '<strong>$1</strong>');
  };
  var clasrJsonInline = function(line) {
    return clasrJsonEmphasis(escapeHtml(line))
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  };
  var clasrJsonText = function(value) { return clasrJsonInline(clasrJsonCleanText(value)); };
  var clasrJsonTitleCase = function(value) {
    return clasrJsonCleanText(value).toLowerCase().replace(/\b([a-z])/g, function(m) { return m.toUpperCase(); });
  };
  var clasrJsonHeadingCase = function(value) {
    return clasrJsonTitleCase(value).replace(/\b(To|And|Or|Of|In|On|For|With)\b/g, function(m) { return m.toLowerCase(); });
  };
  var clasrJsonSectionKicker = function(sectionNumber, title) {
    var cleanTitle = clasrJsonCleanText(title);
    var dup = new RegExp('^section\\s+' + String(sectionNumber).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[·:.-]\\s*', 'i');
    return sectionNumber + ' · ' + cleanTitle.replace(dup, '');
  };
  var clasrJsonList = function(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === 'string' && value.trim()) return [value.trim()];
    return [];
  };
  var clasrJsonStatusLabel = function(value) {
    var label = String(value || '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, function(c) { return c.toUpperCase(); });
    return label.toLowerCase() === 'signal present' ? 'Review signal' : label;
  };

  var clasrJsonExecutive = function(report) {
    var intro = (report.integrated_risk_posture && report.integrated_risk_posture.expanded_explanation)
      || (report.closing && report.closing.integrated_risk_posture && report.closing.integrated_risk_posture.explanation ? [report.closing.integrated_risk_posture.explanation] : []);
    return '<h2 id="executive-summary">Executive summary</h2><div class="live-report__executive-body">' +
      intro.map(function(chunk) { return '<p>' + clasrJsonText(chunk) + '</p>'; }).join('') + '</div>';
  };

  var clasrJsonPriority = function(items, gridNode) {
    items = items || [];
    gridNode.innerHTML = items.map(function(item, index) {
      var rank = index + 1;
      var title = typeof item === 'string' ? item : item;
      return '<article class="live-priority__item"><div class="live-priority__header">' +
        '<span class="live-priority__rank">' + escapeHtml(rank) + '</span>' +
        '<h3 class="live-priority__name">' + clasrJsonText(title) + '</h3>' +
        '</div></article>';
    }).join('');
  };

  var clasrJsonSignal = function(signal, sectionNumber) {
    var locNum = String(signal.primary_location || '').match(/\d+/);
    var showLocation = signal.primary_location && (!locNum || locNum[0] !== String(sectionNumber || ''));
    var options = clasrJsonList(signal.what_you_could_do);
    return '<article class="live-section live-section--signal">' +
      '<div class="live-section__header">' + (showLocation ? '<span class="live-section__kicker">' + escapeHtml(clasrJsonCleanText(signal.primary_location)) + '</span>' : '') + '</div>' +
      '<h2 class="live-section__title">' + clasrJsonText(clasrJsonTitleCase(signal.name)) + '</h2>' +
      '<div class="live-section__columns">' +
        '<div class="live-section__author"><strong>What surfaced</strong><p>' + clasrJsonText(signal.what_this_is || '') + '</p></div>' +
        '<div class="live-section__consider"><strong>Why a reviewer may notice it</strong><p>' + clasrJsonText(signal.why_this_becomes_visible || '') + '</p></div>' +
      '</div>' +
      (options.length ? '<div class="live-section__full" open><div class="live-section__consider"><strong>Possible next step</strong>' + options.map(function(o) { return '<p>' + clasrJsonText(o) + '</p>'; }).join('') + '</div></div>' : '') +
      ((signal.also_appears_in || []).length ? '<p class="live-signal__note">Also appears in ' + escapeHtml(signal.also_appears_in.join(', ')) + '.</p>' : '') +
      '</article>';
  };

  var clasrJsonModule = function(module) {
    var options = clasrJsonList(module.what_you_could_do);
    return '<article class="live-module"><div class="live-module__name"><strong>' + clasrJsonText(clasrJsonHeadingCase(module.name)) + '</strong></div>' +
      '<span class="live-module__status">' + escapeHtml(clasrJsonStatusLabel(module.status)) + '</span>' +
      '<div class="live-module__body">' +
        '<p>' + clasrJsonText(module.what_was_found || '') + '</p>' +
        (module.why_it_matters ? '<div><h3>Why this matters structurally</h3><p>' + clasrJsonText(module.why_it_matters) + '</p></div>' : '') +
        (options.length ? '<div><h3>Possible next step</h3><ul class="live-module__options">' + options.map(function(o) { return '<li>' + clasrJsonText(o) + '</li>'; }).join('') + '</ul></div>' : '') +
      '</div></article>';
  };

  var clasrJsonSections = function(report, fullReportNode) {
    var regularSections = (report.sections || []).map(function(section) {
      var hasSignals = Boolean(section.signals && section.signals.length);
      var heading = '<article class="live-section ' + (hasSignals ? 'live-section--intro' : 'live-section--compact') + '">' +
        '<div class="live-section__header"><span class="live-section__kicker">' + escapeHtml(clasrJsonSectionKicker(section.section, section.title)) + '</span>' +
        (hasSignals ? '<span class="live-signal__chip">' + escapeHtml(clasrJsonStatusLabel(section.status || 'signal_present')) + '</span>' : '') + '</div>' +
        '<div class="live-section__body">' + (section.no_issue_line ? '<p>' + clasrJsonText(section.no_issue_line) + '</p>' : '') + '</div></article>';
      var signals = (section.signals || []).map(function(s) { return clasrJsonSignal(s, section.section); }).join('');
      return heading + signals;
    }).join('');

    var section10 = '';
    if (report.section_10) {
      var flag = report.section_10.compound_risk_flag;
      section10 = '<article class="live-section"><div class="live-section__header">' +
        '<span class="live-section__kicker">' + escapeHtml(clasrJsonSectionKicker(10, report.section_10.title)) + '</span>' +
        '<span class="live-signal__chip">Complete check</span></div>' +
        '<div class="live-module-list">' + (report.section_10.modules || []).map(clasrJsonModule).join('') + '</div>' +
        (flag && flag.triggered ? '<div class="live-section__full"><div class="live-section__consider"><strong>Compound risk flag</strong><p>' + clasrJsonText(flag.explanation || '') + '</p></div></div>' : '') +
        '</article>';
    }

    var closing = '';
    if (report.closing) {
      var posture = report.closing.integrated_risk_posture || {};
      closing = '<section class="live-closing">' +
        '<span class="live-closing__label">Overall Review Attention</span>' +
        '<h2>' + clasrJsonText(clasrJsonHeadingCase(posture.label || '')) + '</h2>' +
        '<p>' + clasrJsonText(posture.explanation || '') + '</p>' +
        (report.leverage_note ? '<div class="live-closing__leverage"><span class="live-closing__label">Where attention would have the most leverage</span><p>' + clasrJsonText(report.leverage_note) + '</p></div>' : '') +
        ((report.priority_dashboard || []).length ? '<div class="live-closing__leverage"><span class="live-closing__label">Priority order</span><div class="live-priority__grid">' +
          report.priority_dashboard.map(function(item) {
            return '<article class="live-priority__item live-priority__item--dashboard"><div class="live-priority__header">' +
              '<span class="live-priority__rank">' + String(item.rank).padStart(2, '0') + '</span>' +
              '<h3 class="live-priority__name">' + clasrJsonText(item.label) + '</h3>' +
              '<span class="live-priority__section live-priority__section--long">' + escapeHtml(clasrJsonCleanText(item.section)) + '</span></div>' +
              '<div class="live-priority__fields"><div class="live-priority__field live-priority__field--wide"><strong>Why it ranks here</strong><span>' + clasrJsonText(item.why_it_ranks_here) + '</span></div></div></article>';
          }).join('') + '</div></div>' : '') +
        ((report.final_checklist || []).length ? '<div class="live-closing__leverage live-closing__checklist"><span class="live-closing__label">Final checklist</span><h2>Final Check Before Submission</h2><p>Use this as a last pass across the manuscript before acting on the report.</p><ul class="live-checklist">' +
          report.final_checklist.map(function(item, index) { return '<li><span class="live-checklist__index">' + String(index + 1).padStart(2, '0') + '</span><span>' + clasrJsonText(item) + '</span></li>'; }).join('') + '</ul></div>' : '') +
        '</section>';
    }

    fullReportNode.innerHTML = '<div class="live-report-full__intro"><div><span>Section walkthrough</span><h2>Full Report</h2></div><p>Signals are shown in source order, with Section 10 kept complete.</p></div>' +
      regularSections + section10 + closing;
  };

  var clasrRenderJsonReport = function(report) {
    var titleNode = document.querySelector('[data-report-title]');
    if (titleNode) titleNode.textContent = (report.manuscript && (report.manuscript.title || report.manuscript.identifier)) || 'Untitled manuscript';
    var metaNode = document.querySelector('[data-report-meta]');
    if (metaNode) {
      metaNode.textContent = [report.field, report.study_type, report.q_profile && report.q_profile.estimate].filter(Boolean).join(' · ');
    }
    var riskNode = document.querySelector('[data-risk-posture]');
    var summaryNode = document.querySelector('[data-risk-summary]');
    var posture = report.integrated_risk_posture || (report.closing && report.closing.integrated_risk_posture) || {};
    if (riskNode) riskNode.textContent = clasrJsonHeadingCase(posture.label || '');
    if (summaryNode) summaryNode.textContent = posture.summary || posture.explanation || '';

    var criticalCount = ((report.section_10 && report.section_10.modules) || []).filter(function(m) { return m.status === 'absent'; }).length;
    var majorCount = (report.sections || []).reduce(function(count, s) { return count + ((s.signals && s.signals.length) || 0); }, 0);
    var minorCount = ((report.section_10 && report.section_10.modules) || []).filter(function(m) { return m.status === 'partial'; }).length;
    var cEl = document.querySelector('[data-count-critical]'), mEl = document.querySelector('[data-count-major]'), nEl = document.querySelector('[data-count-minor]');
    if (cEl) cEl.textContent = criticalCount;
    if (mEl) mEl.textContent = majorCount;
    if (nEl) nEl.textContent = minorCount;

    var executiveNode = document.querySelector('[data-executive-summary]');
    if (executiveNode) executiveNode.innerHTML = clasrJsonExecutive(report);
    var priorityGrid = document.querySelector('[data-priority-signals] .live-priority__grid');
    if (priorityGrid) clasrJsonPriority(report.priority_preview || [], priorityGrid);
    var fullReportNode = document.querySelector('[data-full-report]');
    if (fullReportNode) clasrJsonSections(report, fullReportNode);
  };

  // ── Reviewer Mode (2026-08-28) ──────────────────────────────────────────
  var clasrReviewerLinkRefs = function(value) {
    return clasrJsonText(value).replace(/Major Issue \(([a-zA-Z])\)/g, function(match, letter) {
      return '<a class="live-reviewer-anchor" href="#major-issue-' + letter.toLowerCase() + '">' + match + '</a>';
    });
  };
  var clasrReviewerRefSuffix = function(ref) {
    if (!ref) return '';
    return ' <a class="live-reviewer-anchor" href="#major-issue-' + escapeHtml(String(ref).toLowerCase()) + '">(Major Issue ' + escapeHtml(String(ref)) + ')</a>';
  };
  var clasrReviewerSeverityClass = function(value) {
    var s = String(value || '').toLowerCase();
    if (s === 'high') return 'live-reviewer-issue__severity--high';
    if (s === 'moderate') return 'live-reviewer-issue__severity--moderate';
    return 'live-reviewer-issue__severity--minor';
  };

  var clasrReviewerQuickScan = function(report) {
    var qs = report.quick_scan || {};
    var keyIssues = (qs.key_issues || []).map(function(item) {
      return '<li>' + clasrJsonText(item.text) + clasrReviewerRefSuffix(item.major_issue_ref) + '</li>';
    }).join('');
    return '<span class="live-kicker">Quick scan</span>' +
      '<div class="live-reviewer-quick__grid">' +
        '<div><span>Editorial recommendation</span><strong>' + escapeHtml(qs.editorial_recommendation || '') + '</strong></div>' +
        '<div><span>Risk level</span><strong>' + escapeHtml(qs.risk_level || '') + '</strong></div>' +
      '</div>' +
      (keyIssues ? '<ul class="live-reviewer-quick__list">' + keyIssues + '</ul>' : '');
  };

  var clasrReviewerMajorIssues = function(majorIssues) {
    if (!majorIssues || !majorIssues.length) return '<p>No issues identified.</p>';
    return '<div class="live-reviewer-issues">' + majorIssues.map(function(issue, i) {
      var id = String(issue.id || (i + 1)).toLowerCase();
      var location = (issue.location || []).filter(Boolean);
      return '<article class="live-reviewer-issue" id="major-issue-' + escapeHtml(id) + '">' +
        '<span class="live-reviewer-issue__index">' + escapeHtml(id) + '</span>' +
        '<div>' +
          '<h4 class="live-reviewer-issue__title">' + clasrJsonText(issue.issue) + '</h4>' +
          (location.length ? '<span class="live-reviewer-issue__location"><span class="live-reviewer-issue__location-label">In:</span>' + escapeHtml(location.join(', ')) + '</span>' : '') +
          '<div class="live-reviewer-issue__fields">' +
            '<div><strong>Why it matters</strong><span>' + clasrJsonText(issue.why_it_matters) + '</span></div>' +
            '<div><strong>What authors should address</strong><span>' + clasrJsonText(issue.what_authors_should_address) + '</span></div>' +
          '</div>' +
        '</div>' +
        '<span class="live-reviewer-issue__severity ' + clasrReviewerSeverityClass(issue.severity) + '">' + escapeHtml(issue.severity || '') + '</span>' +
      '</article>';
    }).join('') + '</div>';
  };

  var clasrReviewerSections = function(sections) {
    return (sections || []).map(function(section) {
      var body = '';
      (section.compliance_items || []).forEach(function(c) {
        body += '<p><strong>' + escapeHtml(c.label) + ':</strong> ' + escapeHtml(c.status) + '</p>';
      });
      if (section.status === 'no_issues_identified' && (!section.items || !section.items.length)) {
        body += '<p>No issues identified.</p>';
      } else {
        body += (section.items || []).map(function(item) {
          return '<p>' + clasrJsonText(item.text) + clasrReviewerRefSuffix(item.major_issue_ref) + '</p>';
        }).join('');
      }
      return '<div class="live-reviewer-doc__section">' +
        '<h3>' + escapeHtml(section.number || '') + ' ' + clasrJsonCleanText(section.title) + '</h3>' +
        body +
        '</div>';
    }).join('');
  };

  var clasrRenderReviewerJsonReport = function(report) {
    var node = document.querySelector('[data-reviewer-view]');
    if (!node) return;
    var ca = report.comments_to_authors || {};
    var editorial = report.editorial_recommendation || {};
    node.innerHTML =
      '<div class="live-reviewer-quick">' + clasrReviewerQuickScan(report) + '</div>' +
      '<div class="live-reviewer-doc">' +
        '<div class="live-reviewer-doc__section" style="border-top:0;padding-top:0">' +
          '<h3>1.1 General evaluation</h3><p>' + clasrReviewerLinkRefs(ca.general_evaluation) + '</p>' +
        '</div>' +
        '<div class="live-reviewer-doc__section">' +
          '<h3>1.2 Major issues</h3>' + clasrReviewerMajorIssues(ca.major_issues) +
        '</div>' +
        clasrReviewerSections(ca.sections) +
        '<div class="live-reviewer-doc__section">' +
          '<h3>Confidential comments to the editor</h3><p>' + clasrReviewerLinkRefs(report.confidential_comments_to_editor) + '</p>' +
        '</div>' +
        '<div class="live-reviewer-doc__section">' +
          '<h3>Editorial recommendation</h3><p><strong>' + escapeHtml(editorial.decision || '') + '</strong></p><p>' + clasrReviewerLinkRefs(editorial.rationale) + '</p>' +
        '</div>' +
      '</div>';
  };

  // ── Editor Mode (2026-08-28) — occupies the backend's "advisor" mode slot ──
  var clasrEditorSeverityClass = function(value) {
    var s = String(value || '').toLowerCase();
    if (s === 'high') return 'live-editor-red-flag__severity--high';
    if (s === 'moderate') return 'live-editor-red-flag__severity--moderate';
    return 'live-editor-red-flag__severity--minor';
  };

  var clasrEditorSummary = function(report) {
    var ora = report.overall_review_attention || {};
    var counts = ora.counts || {};
    var manuscript = report.manuscript || {};
    return '<section class="live-report__summary live-report__summary--editor" aria-label="Report summary">' +
      '<div class="live-report__summary-top">' +
        '<div class="live-report__summary-panel">' +
          '<span class="live-report__label">Manuscript</span>' +
          '<h2>' + clasrJsonText(manuscript.title) + '</h2>' +
          '<p>' + escapeHtml([manuscript.field, manuscript.study_type, manuscript.q_profile].filter(Boolean).join(' · ')) + '</p>' +
        '</div>' +
        '<div class="live-report__summary-panel live-report__counts" aria-label="Signal counts">' +
          '<div class="live-report__count"><strong>' + (counts.high_priority || 0) + '</strong><span>High Priority</span></div>' +
          '<div class="live-report__count"><strong>' + (counts.medium_priority || 0) + '</strong><span>Medium Priority</span></div>' +
          '<div class="live-report__count"><strong>' + (counts.low_priority || 0) + '</strong><span>Low Priority</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="live-report__summary-panel live-report__attention live-report__attention--compact">' +
        '<span class="live-report__label">Overall Review Attention</span>' +
        '<h2>' + escapeHtml(ora.label || '') + '</h2>' +
        '<p>' + clasrJsonText(ora.summary) + '</p>' +
      '</div>' +
    '</section>';
  };

  var clasrEditorPriorityOrder = function(items) {
    if (!items || !items.length) return '';
    return '<section class="live-priority live-priority--editor" aria-label="Red flag index">' +
      '<h2>Red flag index</h2>' +
      '<div class="live-priority__grid">' +
        items.map(function(item, i) {
          return '<article class="live-priority__item">' +
            '<div class="live-priority__header">' +
              '<span class="live-priority__rank">' + String(i + 1).padStart(2, '0') + '</span>' +
              '<h3 class="live-priority__name">' + clasrJsonText(item.title) + '</h3>' +
              '<span class="live-priority__section ' + clasrEditorSeverityClass(item.severity) + '">' + escapeHtml(item.severity || '') + '</span>' +
            '</div>' +
          '</article>';
        }).join('') +
      '</div>' +
    '</section>';
  };

  var clasrEditorExecutive = function(report) {
    var es = report.executive_summary || {};
    var conditionLine = (es.is_conditional && es.condition) ? '<p class="live-editor-triage__decision">Condition: ' + clasrJsonText(es.condition) + '</p>' : '';
    return '<section class="live-editor-panel" aria-labelledby="executive-summary">' +
      '<h2 id="executive-summary">Editorial triage</h2>' +
      '<div class="live-editor-triage">' +
        '<div class="live-editor-triage__meta">' +
          '<span>' + escapeHtml(es.risk_label || '') + '</span>' +
          '<span>' + escapeHtml(es.view_label || '') + '</span>' +
        '</div>' +
        '<p class="live-editor-triage__decision"><strong>' + escapeHtml(es.decision || '') + '</strong></p>' +
        conditionLine +
      '</div>' +
      '<p>' + clasrJsonText(es.rationale) + '</p>' +
    '</section>';
  };

  var clasrEditorRedFlags = function(redFlags) {
    if (!redFlags || !redFlags.length) return '<section class="live-editor-panel"><h2>Red flags</h2><p>No issues identified.</p></section>';
    return '<section class="live-editor-panel">' +
      '<h2>Red flags</h2>' +
      '<ul class="live-editor-red-flags">' +
        redFlags.map(function(flag) {
          return '<li class="live-editor-red-flag">' +
            '<span class="live-editor-red-flag__severity ' + clasrEditorSeverityClass(flag.severity) + '">' + escapeHtml(flag.severity || '') + '</span>' +
            '<div>' +
              '<h3>' + clasrJsonText(flag.title) + '</h3>' +
              (flag.location ? '<span class="live-editor-red-flag__location">In: ' + escapeHtml(flag.location) + '</span>' : '') +
              '<div class="live-editor-red-flag__fields">' +
                '<div><strong>Why it matters</strong><p>' + clasrJsonText(flag.why_it_matters) + '</p></div>' +
                '<div><strong>Editor action</strong><p>' + clasrJsonTitleCase(flag.editor_action) + '</p></div>' +
              '</div>' +
            '</div>' +
          '</li>';
        }).join('') +
      '</ul>' +
    '</section>';
  };

  var clasrEditorChecklist = function(items) {
    if (!items || !items.length) return '';
    return '<section class="live-editor-panel">' +
      '<h2>Final checklist</h2>' +
      '<ul class="live-editor-flags">' +
        items.map(function(item, i) {
          return '<li>' +
            '<strong>' + String(i + 1).padStart(2, '0') + '</strong>' +
            '<span>' + clasrJsonText(item.text) + '</span>' +
            '<span class="live-editor-flags__kind">' + escapeHtml(item.kind || '') + '</span>' +
          '</li>';
        }).join('') +
      '</ul>' +
    '</section>';
  };

  var clasrEditorRecommendation = function(recommendation) {
    var r = recommendation || {};
    return '<section class="live-editor-panel">' +
      '<h2>Editorial recommendation</h2>' +
      '<div class="live-editor-decision">' +
        '<strong>' + escapeHtml(r.label || '') + (r.conditional ? ' (conditional)' : '') + '</strong>' +
        '<span>' + clasrJsonText(r.text) + '</span>' +
      '</div>' +
    '</section>';
  };

  var clasrRenderEditorJsonReport = function(report) {
    var node = document.querySelector('[data-editor-view]');
    if (!node) return;
    var fullReport = report.full_report || {};
    var modeNote = (report.mode_switch && report.mode_switch.note) ? '<section class="live-report__mode"><p>' + clasrJsonText(report.mode_switch.note) + '</p></section>' : '';
    node.innerHTML =
      clasrEditorSummary(report) +
      modeNote +
      clasrEditorPriorityOrder(report.priority_order) +
      clasrEditorExecutive(report) +
      clasrEditorRedFlags(fullReport.red_flags) +
      clasrEditorRecommendation(fullReport.recommendation) +
      clasrEditorChecklist(report.final_checklist);
  };

  var clasrExportJsonTxt = function(report, data) {
    var lines = [];
    lines.push((report.manuscript && report.manuscript.title) || data.title || 'Clasr Signal Report');
    lines.push('');
    lines.push('OVERALL REVIEW ATTENTION: ' + ((report.integrated_risk_posture || {}).label || ''));
    lines.push(((report.integrated_risk_posture || {}).summary || ''));
    lines.push('');
    lines.push('EXECUTIVE SUMMARY');
    (((report.integrated_risk_posture || {}).expanded_explanation) || []).forEach(function(p) { lines.push(p); });
    lines.push('');
    lines.push('PRIORITY ACTION SIGNALS PREVIEW');
    (report.priority_preview || []).forEach(function(p, i) { lines.push((i + 1) + '. ' + p); });
    (report.sections || []).forEach(function(section) {
      lines.push('');
      lines.push('SECTION ' + section.section + ' — ' + clasrJsonCleanText(section.title));
      if (section.no_issue_line) lines.push(section.no_issue_line);
      (section.signals || []).forEach(function(s) {
        lines.push('');
        lines.push(clasrJsonTitleCase(s.name));
        lines.push('What surfaced: ' + s.what_this_is);
        lines.push('Why a reviewer may notice it: ' + s.why_this_becomes_visible);
        (s.what_you_could_do || []).forEach(function(o) { lines.push('Possible next step: ' + o); });
      });
    });
    if (report.section_10) {
      lines.push('');
      lines.push('SECTION 10 — ' + clasrJsonCleanText(report.section_10.title));
      (report.section_10.modules || []).forEach(function(m) {
        lines.push(clasrJsonHeadingCase(m.name) + ': ' + clasrJsonStatusLabel(m.status));
        if (m.what_was_found) lines.push('  ' + m.what_was_found);
      });
    }
    if (report.final_checklist && report.final_checklist.length) {
      lines.push('');
      lines.push('FINAL CHECKLIST');
      report.final_checklist.forEach(function(item, i) { lines.push((i + 1) + '. ' + item); });
    }
    clasrDownloadBlob(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }), clasrSlugify((report.manuscript && report.manuscript.title) || data.title) + '.txt');
  };

  var clasrExportJsonDocx = function(report, data) {
    return clasrLoadDocxLib().then(function(docx) {
      var children = [];
      children.push(new docx.Paragraph({ text: (report.manuscript && report.manuscript.title) || data.title || 'Clasr Signal Report', heading: docx.HeadingLevel.TITLE }));
      var posture = report.integrated_risk_posture || {};
      children.push(new docx.Paragraph({ text: 'Overall review attention: ' + (posture.label || ''), heading: docx.HeadingLevel.HEADING_2 }));
      (posture.expanded_explanation || []).forEach(function(p) { children.push(new docx.Paragraph({ children: [new docx.TextRun(p)] })); });
      children.push(new docx.Paragraph({ text: 'Priority action signals preview', heading: docx.HeadingLevel.HEADING_2 }));
      (report.priority_preview || []).forEach(function(p) { children.push(new docx.Paragraph({ children: [new docx.TextRun(p)] })); });
      (report.sections || []).forEach(function(section) {
        children.push(new docx.Paragraph({ text: 'Section ' + section.section + ' — ' + clasrJsonCleanText(section.title), heading: docx.HeadingLevel.HEADING_2 }));
        if (section.no_issue_line) children.push(new docx.Paragraph({ children: [new docx.TextRun(section.no_issue_line)] }));
        (section.signals || []).forEach(function(s) {
          children.push(new docx.Paragraph({ text: clasrJsonTitleCase(s.name), heading: docx.HeadingLevel.HEADING_3 }));
          children.push(new docx.Paragraph({ children: [new docx.TextRun('What surfaced: ' + s.what_this_is)] }));
          children.push(new docx.Paragraph({ children: [new docx.TextRun('Why a reviewer may notice it: ' + s.why_this_becomes_visible)] }));
          (s.what_you_could_do || []).forEach(function(o) { children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: 'Possible next step: ' + o, italics: true })] })); });
        });
      });
      if (report.section_10) {
        children.push(new docx.Paragraph({ text: 'Section 10 — ' + clasrJsonCleanText(report.section_10.title), heading: docx.HeadingLevel.HEADING_2 }));
        (report.section_10.modules || []).forEach(function(m) {
          children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: clasrJsonHeadingCase(m.name) + ': ' + clasrJsonStatusLabel(m.status), bold: true })] }));
          if (m.what_was_found) children.push(new docx.Paragraph({ children: [new docx.TextRun(m.what_was_found)] }));
        });
      }
      if (report.final_checklist && report.final_checklist.length) {
        children.push(new docx.Paragraph({ text: 'Final checklist', heading: docx.HeadingLevel.HEADING_2 }));
        report.final_checklist.forEach(function(item) { children.push(new docx.Paragraph({ text: item, bullet: { level: 0 } })); });
      }
      var doc = new docx.Document({ sections: [{ children: children }] });
      return docx.Packer.toBlob(doc);
    }).then(function(blob) {
      clasrDownloadBlob(blob, clasrSlugify((report.manuscript && report.manuscript.title) || data.title) + '.docx');
    }).catch(function() {
      clasrExportJsonTxt(report, data);
    });
  };

  var clasrExportReviewerTxt = function(report, data) {
    var lines = [];
    lines.push((report.manuscript && report.manuscript.title) || data.title || 'Clasr Signal Report');
    lines.push('');
    var qs = report.quick_scan || {};
    lines.push('QUICK SCAN');
    lines.push('Editorial recommendation: ' + (qs.editorial_recommendation || ''));
    lines.push('Risk level: ' + (qs.risk_level || ''));
    (qs.key_issues || []).forEach(function(item, i) { lines.push((i + 1) + '. ' + item.text + (item.major_issue_ref ? ' (Major Issue ' + item.major_issue_ref + ')' : '')); });
    var ca = report.comments_to_authors || {};
    lines.push('');
    lines.push('1.1 GENERAL EVALUATION');
    lines.push(ca.general_evaluation || '');
    lines.push('');
    lines.push('1.2 MAJOR ISSUES');
    (ca.major_issues || []).forEach(function(issue) {
      lines.push('');
      lines.push('(' + issue.id + ') ' + issue.issue + ' [' + issue.severity + ']');
      lines.push('In: ' + (issue.location || []).join(', '));
      lines.push('Why it matters: ' + issue.why_it_matters);
      lines.push('What authors should address: ' + issue.what_authors_should_address);
    });
    (ca.sections || []).forEach(function(section) {
      lines.push('');
      lines.push(section.number + ' ' + clasrJsonCleanText(section.title));
      (section.compliance_items || []).forEach(function(c) { lines.push(c.label + ': ' + c.status); });
      if (section.status === 'no_issues_identified' && (!section.items || !section.items.length)) {
        lines.push('No issues identified.');
      } else {
        (section.items || []).forEach(function(item) { lines.push(item.text + (item.major_issue_ref ? ' (Major Issue ' + item.major_issue_ref + ')' : '')); });
      }
    });
    lines.push('');
    lines.push('CONFIDENTIAL COMMENTS TO THE EDITOR');
    lines.push(report.confidential_comments_to_editor || '');
    lines.push('');
    lines.push('EDITORIAL RECOMMENDATION');
    var editorial = report.editorial_recommendation || {};
    lines.push(editorial.decision || '');
    lines.push(editorial.rationale || '');
    clasrDownloadBlob(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }), clasrSlugify((report.manuscript && report.manuscript.title) || data.title) + '-reviewer.txt');
  };

  var clasrExportReviewerDocx = function(report, data) {
    return clasrLoadDocxLib().then(function(docx) {
      var children = [];
      children.push(new docx.Paragraph({ text: (report.manuscript && report.manuscript.title) || data.title || 'Clasr Signal Report', heading: docx.HeadingLevel.TITLE }));
      var qs = report.quick_scan || {};
      children.push(new docx.Paragraph({ text: 'Quick scan', heading: docx.HeadingLevel.HEADING_2 }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun('Editorial recommendation: ' + (qs.editorial_recommendation || ''))] }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun('Risk level: ' + (qs.risk_level || ''))] }));
      (qs.key_issues || []).forEach(function(item) { children.push(new docx.Paragraph({ text: item.text + (item.major_issue_ref ? ' (Major Issue ' + item.major_issue_ref + ')' : ''), bullet: { level: 0 } })); });
      var ca = report.comments_to_authors || {};
      children.push(new docx.Paragraph({ text: '1.1 General evaluation', heading: docx.HeadingLevel.HEADING_2 }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun(ca.general_evaluation || '')] }));
      children.push(new docx.Paragraph({ text: '1.2 Major issues', heading: docx.HeadingLevel.HEADING_2 }));
      (ca.major_issues || []).forEach(function(issue) {
        children.push(new docx.Paragraph({ text: '(' + issue.id + ') ' + issue.issue + ' [' + issue.severity + ']', heading: docx.HeadingLevel.HEADING_3 }));
        children.push(new docx.Paragraph({ children: [new docx.TextRun('In: ' + (issue.location || []).join(', '))] }));
        children.push(new docx.Paragraph({ children: [new docx.TextRun('Why it matters: ' + issue.why_it_matters)] }));
        children.push(new docx.Paragraph({ children: [new docx.TextRun('What authors should address: ' + issue.what_authors_should_address)] }));
      });
      (ca.sections || []).forEach(function(section) {
        children.push(new docx.Paragraph({ text: section.number + ' ' + clasrJsonCleanText(section.title), heading: docx.HeadingLevel.HEADING_2 }));
        (section.compliance_items || []).forEach(function(c) { children.push(new docx.Paragraph({ children: [new docx.TextRun(c.label + ': ' + c.status)] })); });
        if (section.status === 'no_issues_identified' && (!section.items || !section.items.length)) {
          children.push(new docx.Paragraph({ children: [new docx.TextRun('No issues identified.')] }));
        } else {
          (section.items || []).forEach(function(item) { children.push(new docx.Paragraph({ children: [new docx.TextRun(item.text + (item.major_issue_ref ? ' (Major Issue ' + item.major_issue_ref + ')' : ''))] })); });
        }
      });
      children.push(new docx.Paragraph({ text: 'Confidential comments to the editor', heading: docx.HeadingLevel.HEADING_2 }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun(report.confidential_comments_to_editor || '')] }));
      var editorial = report.editorial_recommendation || {};
      children.push(new docx.Paragraph({ text: 'Editorial recommendation', heading: docx.HeadingLevel.HEADING_2 }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: editorial.decision || '', bold: true })] }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun(editorial.rationale || '')] }));
      var doc = new docx.Document({ sections: [{ children: children }] });
      return docx.Packer.toBlob(doc);
    }).then(function(blob) {
      clasrDownloadBlob(blob, clasrSlugify((report.manuscript && report.manuscript.title) || data.title) + '-reviewer.docx');
    }).catch(function() {
      clasrExportReviewerTxt(report, data);
    });
  };

  var clasrExportEditorTxt = function(report, data) {
    var lines = [];
    var manuscript = report.manuscript || {};
    lines.push(manuscript.title || data.title || 'Clasr Signal Report');
    lines.push('');
    var ora = report.overall_review_attention || {};
    lines.push('OVERALL REVIEW ATTENTION: ' + (ora.label || ''));
    lines.push(ora.summary || '');
    lines.push('');
    var es = report.executive_summary || {};
    lines.push('EDITORIAL TRIAGE');
    lines.push('Decision: ' + (es.decision || '') + (es.is_conditional ? ' (conditional: ' + es.condition + ')' : ''));
    lines.push(es.rationale || '');
    lines.push('');
    lines.push('RED FLAG INDEX');
    (report.priority_order || []).forEach(function(item, i) { lines.push((i + 1) + '. [' + item.severity + '] ' + item.title); });
    var fullReport = report.full_report || {};
    lines.push('');
    lines.push('RED FLAGS');
    (fullReport.red_flags || []).forEach(function(flag) {
      lines.push('');
      lines.push('[' + flag.severity + '] ' + flag.title + (flag.location ? ' (In: ' + flag.location + ')' : ''));
      lines.push('Why it matters: ' + flag.why_it_matters);
      lines.push('Editor action: ' + flag.editor_action);
    });
    var recommendation = fullReport.recommendation || {};
    lines.push('');
    lines.push('EDITORIAL RECOMMENDATION: ' + (recommendation.label || '') + (recommendation.conditional ? ' (conditional)' : ''));
    lines.push(recommendation.text || '');
    if (report.final_checklist && report.final_checklist.length) {
      lines.push('');
      lines.push('FINAL CHECKLIST');
      report.final_checklist.forEach(function(item, i) { lines.push((i + 1) + '. ' + item.text + ' [' + item.kind + ']'); });
    }
    clasrDownloadBlob(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }), clasrSlugify(manuscript.title || data.title) + '-editor.txt');
  };

  var clasrExportEditorDocx = function(report, data) {
    return clasrLoadDocxLib().then(function(docx) {
      var children = [];
      var manuscript = report.manuscript || {};
      children.push(new docx.Paragraph({ text: manuscript.title || data.title || 'Clasr Signal Report', heading: docx.HeadingLevel.TITLE }));
      var ora = report.overall_review_attention || {};
      children.push(new docx.Paragraph({ text: 'Overall review attention: ' + (ora.label || ''), heading: docx.HeadingLevel.HEADING_2 }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun(ora.summary || '')] }));
      var es = report.executive_summary || {};
      children.push(new docx.Paragraph({ text: 'Editorial triage', heading: docx.HeadingLevel.HEADING_2 }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: 'Decision: ' + (es.decision || '') + (es.is_conditional ? ' (conditional: ' + es.condition + ')' : ''), bold: true })] }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun(es.rationale || '')] }));
      children.push(new docx.Paragraph({ text: 'Red flag index', heading: docx.HeadingLevel.HEADING_2 }));
      (report.priority_order || []).forEach(function(item) { children.push(new docx.Paragraph({ text: '[' + item.severity + '] ' + item.title, bullet: { level: 0 } })); });
      var fullReport = report.full_report || {};
      children.push(new docx.Paragraph({ text: 'Red flags', heading: docx.HeadingLevel.HEADING_2 }));
      (fullReport.red_flags || []).forEach(function(flag) {
        children.push(new docx.Paragraph({ text: '[' + flag.severity + '] ' + flag.title, heading: docx.HeadingLevel.HEADING_3 }));
        if (flag.location) children.push(new docx.Paragraph({ children: [new docx.TextRun('In: ' + flag.location)] }));
        children.push(new docx.Paragraph({ children: [new docx.TextRun('Why it matters: ' + flag.why_it_matters)] }));
        children.push(new docx.Paragraph({ children: [new docx.TextRun('Editor action: ' + flag.editor_action)] }));
      });
      var recommendation = fullReport.recommendation || {};
      children.push(new docx.Paragraph({ text: 'Editorial recommendation', heading: docx.HeadingLevel.HEADING_2 }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun({ text: (recommendation.label || '') + (recommendation.conditional ? ' (conditional)' : ''), bold: true })] }));
      children.push(new docx.Paragraph({ children: [new docx.TextRun(recommendation.text || '')] }));
      if (report.final_checklist && report.final_checklist.length) {
        children.push(new docx.Paragraph({ text: 'Final checklist', heading: docx.HeadingLevel.HEADING_2 }));
        report.final_checklist.forEach(function(item) { children.push(new docx.Paragraph({ text: item.text + ' [' + item.kind + ']', bullet: { level: 0 } })); });
      }
      var doc = new docx.Document({ sections: [{ children: children }] });
      return docx.Packer.toBlob(doc);
    }).then(function(blob) {
      clasrDownloadBlob(blob, clasrSlugify((report.manuscript && report.manuscript.title) || data.title) + '-editor.docx');
    }).catch(function() {
      clasrExportEditorTxt(report, data);
    });
  };

  // ── Mode switcher (2026-08-28) ───────────────────────────────────────────
  var CLASR_MODE_LABELS = {
    author: { title: 'Author Mode', desc: 'Review for me' },
    reviewer: { title: 'Reviewer Mode', desc: 'Review for others' },
    advisor: { title: 'Editor Mode', desc: 'Editorial triage' },
  };

  var clasrRenderModeSwitch = function(data, onSwitch) {
    var nav = document.querySelector('[data-mode-switch]');
    var optionsNode = nav && nav.querySelector('.live-report__mode-options');
    if (!nav || !optionsNode) return;
    nav.hidden = false;
    optionsNode.innerHTML = Object.keys(CLASR_MODE_LABELS).map(function(mode) {
      var meta = CLASR_MODE_LABELS[mode];
      var isActive = data.mode === mode;
      return '<button type="button" class="live-report__mode-option' + (isActive ? ' is-active' : '') + '" data-mode-option="' + mode + '"' + (isActive ? ' disabled' : '') + '>' +
        '<strong>' + escapeHtml(meta.title) + '</strong><span>' + escapeHtml(meta.desc) + '</span>' +
      '</button>';
    }).join('');
    optionsNode.querySelectorAll('[data-mode-option]').forEach(function(btn) {
      btn.addEventListener('click', function() { onSwitch(btn.getAttribute('data-mode-option')); });
    });
  };

  var clasrShowReportError = function(message) {
    var rb = document.querySelector('.reading-report-body');
    if (rb) rb.innerHTML = '<div class="api-report"><p class="report-closing-note">' + escapeHtml(message) + '</p></div>';
    document.querySelectorAll('[data-export-report]').forEach(function(btn) { btn.disabled = true; });
  };

  var reportId = new URLSearchParams(window.location.search).get('id');
  if (reportId) {
    var clasrApplyReadingData = function(data) {
      document.title = (data.title || 'Signal Report') + ' — Clasr';
      var tl = document.querySelector('.report-topline');
      if (tl) {
        var spans = tl.querySelectorAll('span:not(.section-eyebrow)');
        var modeTitle = (CLASR_MODE_LABELS[data.mode] && CLASR_MODE_LABELS[data.mode].title) || ((data.mode||'author').charAt(0).toUpperCase()+(data.mode||'author').slice(1)+' Mode');
        var vals = [(data.studyType||'Quantitative').charAt(0).toUpperCase()+(data.studyType||'Quantitative').slice(1), data.qProfile||'Q1', modeTitle];
        spans.forEach(function(s,i) { if (vals[i]) s.textContent = vals[i]; });
        var h1 = tl.querySelector('h1'); if (h1) h1.textContent = data.title || 'Signal Report';
      }
      var ms = document.querySelectorAll('.signal-metrics div strong');
      if (ms.length >= 3 && data.severity) { ms[0].textContent=String(data.severity.critical||0); ms[1].textContent=String(data.severity.major||0); ms[2].textContent=String(data.severity.minor||0); }

      var jsonNode = document.querySelector('[data-json-report]');
      var textNode = document.querySelector('[data-text-report]');
      var authorView = document.querySelector('[data-author-view]');
      var reviewerView = document.querySelector('[data-reviewer-view]');
      var editorView = document.querySelector('[data-editor-view]');

      // Export buttons get re-bound every time a mode switch re-renders --
      // clone-and-replace clears any listener from a previous mode so clicks
      // don't stack across Author -> Reviewer -> Author, etc.
      var exportBtns = [];
      document.querySelectorAll('[data-export-report]').forEach(function(btn) {
        var clone = btn.cloneNode(true);
        btn.parentNode.replaceChild(clone, btn);
        exportBtns.push(clone);
      });

      if (data.mode === 'author' && data.reportJson) {
        if (jsonNode) jsonNode.hidden = false;
        if (textNode) textNode.hidden = true;
        if (authorView) authorView.hidden = false;
        if (reviewerView) reviewerView.hidden = true;
        if (editorView) editorView.hidden = true;
        clasrRenderJsonReport(data.reportJson);
        exportBtns.forEach(function(btn) {
          btn.addEventListener('click', function() {
            var kind = btn.getAttribute('data-export-report');
            if (kind === 'txt') clasrExportJsonTxt(data.reportJson, data);
            else if (kind === 'pdf') window.print();
            else if (kind === 'docx') clasrExportJsonDocx(data.reportJson, data);
          });
        });
      } else if (data.mode === 'reviewer' && data.reportJson) {
        if (jsonNode) jsonNode.hidden = false;
        if (textNode) textNode.hidden = true;
        if (authorView) authorView.hidden = true;
        if (reviewerView) reviewerView.hidden = false;
        if (editorView) editorView.hidden = true;
        clasrRenderReviewerJsonReport(data.reportJson);
        exportBtns.forEach(function(btn) {
          btn.addEventListener('click', function() {
            var kind = btn.getAttribute('data-export-report');
            if (kind === 'txt') clasrExportReviewerTxt(data.reportJson, data);
            else if (kind === 'pdf') window.print();
            else if (kind === 'docx') clasrExportReviewerDocx(data.reportJson, data);
          });
        });
      } else if (data.mode === 'advisor' && data.reportJson) {
        if (jsonNode) jsonNode.hidden = false;
        if (textNode) textNode.hidden = true;
        if (authorView) authorView.hidden = true;
        if (reviewerView) reviewerView.hidden = true;
        if (editorView) editorView.hidden = false;
        clasrRenderEditorJsonReport(data.reportJson);
        exportBtns.forEach(function(btn) {
          btn.addEventListener('click', function() {
            var kind = btn.getAttribute('data-export-report');
            if (kind === 'txt') clasrExportEditorTxt(data.reportJson, data);
            else if (kind === 'pdf') window.print();
            else if (kind === 'docx') clasrExportEditorDocx(data.reportJson, data);
          });
        });
      } else {
        if (jsonNode) jsonNode.hidden = true;
        if (textNode) textNode.hidden = false;
        var parsed = clasrParseReport(data.report || '');
        if (textNode && data.report) {
          textNode.innerHTML = clasrRenderReportHtml(parsed, data);
        }
        exportBtns.forEach(function(btn) {
          btn.addEventListener('click', function() {
            var kind = btn.getAttribute('data-export-report');
            if (kind === 'txt') clasrExportTxt(data);
            else if (kind === 'pdf') window.print();
            else if (kind === 'docx') clasrExportDocx(data, parsed);
          });
        });
      }

      clasrRenderModeSwitch(data, function(targetMode) {
        if (targetMode === data.mode) return;
        var switchNav = document.querySelector('[data-mode-switch]');
        var optionsNode = switchNav && switchNav.querySelector('.live-report__mode-options');
        var noteNode = switchNav && switchNav.querySelector('.live-report__mode-switch-note');
        if (switchNav && !noteNode) {
          noteNode = document.createElement('p');
          noteNode.className = 'live-report__mode-switch-note';
          switchNav.appendChild(noteNode);
        }
        var setNote = function(text) { if (noteNode) noteNode.textContent = text || ''; };
        var resetButtons = function() {
          if (!optionsNode) return;
          optionsNode.querySelectorAll('[data-mode-option]').forEach(function(b) {
            b.disabled = data.mode === b.getAttribute('data-mode-option');
          });
        };
        setNote('');
        if (optionsNode) optionsNode.querySelectorAll('[data-mode-option]').forEach(function(b) { b.disabled = true; });
        apiFetch('/api/readings/' + reportId + '/mode/' + targetMode).then(function(res) {
          if (!res) return null;
          return res.json().catch(function() { return null; }).then(function(body) { return { ok: res.ok, body: body }; });
        }).then(function(outcome) {
          if (!outcome || !outcome.body) {
            resetButtons();
            setNote('Could not switch modes. Please check your connection and try again.');
            return;
          }
          if (!outcome.ok || outcome.body.error) {
            resetButtons();
            setNote(outcome.body.error || 'Could not switch modes for this reading.');
            return;
          }
          var result = outcome.body;
          var nextData = Object.assign({}, data, { mode: targetMode });
          if (targetMode === 'author' || targetMode === 'reviewer' || targetMode === 'advisor') {
            nextData.reportJson = result.report;
          } else {
            nextData.reportJson = null;
            nextData.report = result.report;
          }
          clasrApplyReadingData(nextData);
        }).catch(function() {
          resetButtons();
          setNote('Could not switch modes. Please check your connection and try again.');
        });
      });
    };

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
      clasrApplyReadingData(data);
    }).catch(function() {
      clasrShowReportError('This reading could not be loaded. Please try again in a moment.');
    });
  }

  // ── Turn Off History confirmation (2026-08-29) ─────────────────────────────
  // Shared by dashboard/settings/ and dashboard/readings/ — both let a user
  // flip reading history off, and both must go through this warning +
  // password re-check before anything is deleted, since it's permanent.
  window.clasrConfirmTurnOffHistory = function(onConfirmed) {
    var existing = document.querySelector('[data-history-confirm-modal]');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.className = 'clasr-modal-overlay';
    overlay.setAttribute('data-history-confirm-modal', '');
    overlay.innerHTML =
      '<div class="clasr-modal" role="dialog" aria-modal="true" aria-labelledby="clasr-history-confirm-title">' +
        '<h2 id="clasr-history-confirm-title">Turn off reading history?</h2>' +
        '<p>This will <strong>permanently delete all of your saved manuscript readings</strong>. This action cannot be undone.</p>' +
        '<label class="clasr-modal__field">' +
          '<span>Enter your password to confirm</span>' +
          '<input type="password" data-history-confirm-password autocomplete="current-password">' +
        '</label>' +
        '<p class="clasr-modal__error" data-history-confirm-error hidden></p>' +
        '<div class="clasr-modal__actions">' +
          '<button type="button" class="button button--ghost" data-history-confirm-cancel>Cancel</button>' +
          '<button type="button" class="button button--danger" data-history-confirm-submit>Delete</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    var pwInput = overlay.querySelector('[data-history-confirm-password]');
    var errEl = overlay.querySelector('[data-history-confirm-error]');
    var submitBtn = overlay.querySelector('[data-history-confirm-submit]');
    var cancelBtn = overlay.querySelector('[data-history-confirm-cancel]');
    var origSubmitText = submitBtn.textContent;
    pwInput.focus();

    var close = function() { overlay.remove(); };
    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    });

    var submit = function() {
      var password = pwInput.value;
      if (!password) { errEl.textContent = 'Please enter your password.'; errEl.hidden = false; return; }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Deleting…';
      errEl.hidden = true;
      apiFetch('/api/account/history/disable', { method: 'POST', body: JSON.stringify({ password: password }) })
        .then(function(res) {
          if (!res) return { ok: false, data: { error: 'Could not reach the server. Please try again.' } };
          return res.json().catch(function() { return {}; }).then(function(data) { return { ok: res.ok, data: data }; });
        })
        .then(function(result) {
          if (!result.ok || !result.data.success) {
            errEl.textContent = (result.data && result.data.error) || 'Something went wrong. Please try again.';
            errEl.hidden = false;
            submitBtn.disabled = false;
            submitBtn.textContent = origSubmitText;
            // Nothing was deleted and history stays on — no state change here.
            return;
          }
          close();
          onConfirmed();
        });
    };
    submitBtn.addEventListener('click', submit);
    pwInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') submit(); });
  };

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

// ── Dashboard home: greeting rotation + upload panel interactions ──────────
// Moved here from inline <script> tags in dashboard/index.html (2026-08-29):
// the site's CSP script-src is 'self' only (no 'unsafe-inline'), so those
// inline blocks silently never ran in production — the greeting always
// showed dashboard/index.html's static fallback text with only the name
// substituted in by applyAccountProfile(), never the rotating/randomized
// text this was supposed to show. Anything added as an inline <script> on
// any page will hit the same silent failure; keep new page logic in this
// file instead.
(function () {
  var greetingEl = document.getElementById('dashboard-greeting');
  if (greetingEl) {
    // "Michael" (not a generic fallback) matches the demo placeholder name
    // used in this page's static HTML everywhere else — applyAccountProfile()
    // finds-and-replaces that literal string once the real profile loads, so
    // keeping it here lets a first-ever page load (no cached profile yet)
    // still get corrected instead of permanently showing a mismatched name.
    var name = 'Michael';
    try {
      var profile = JSON.parse(localStorage.getItem('clasr:userProfile') || '{}');
      name = profile.firstName || name;
    } catch (ex) {}
    var hour = new Date().getHours();
    var visits = parseInt(localStorage.getItem('clasr:visits') || '0', 10);
    try { localStorage.setItem('clasr:visits', String(visits + 1)); } catch (ex) {}
    var isReturning = visits > 0;

    var morningLines = [
      'Good morning, ' + name + '.',
      'Morning, ' + name + ', ready to read?',
      'Rise and read, ' + name + '.',
      'A new manuscript awaits!',
      'Fresh signals for today!',
    ];
    var afternoonLines = [
      'Good afternoon, ' + name + '.',
      'A good afternoon to you, ' + name + '.',
      'Afternoon, ' + name + ", let's get to work.",
    ];
    var eveningLines = [
      'Good evening, ' + name + '.',
      'Evening, ' + name + '.',
      'Ready for one more reading, ' + name + '?',
    ];
    var nightLines = [
      'Have a good night, ' + name + '.',
      'Late session, ' + name + '.',
      'Ready when you are, ' + name + '.',
    ];
    var welcomeBackLines = [
      'Welcome back, ' + name + '.',
      'Good to see you again, ' + name + '.',
      'Back to reading, ' + name + '.',
    ];
    var brandLines = [
      "Read before you're read.",
      'Signals before decisions.',
      'Reading, augmented.',
      'Read deeper.',
    ];

    var pool;
    if (Math.random() < 0.16) {
      pool = brandLines;
    } else if (isReturning && Math.random() < 0.35) {
      pool = welcomeBackLines;
    } else if (hour >= 5 && hour < 12) {
      pool = morningLines;
    } else if (hour >= 12 && hour < 17) {
      pool = afternoonLines;
    } else if (hour >= 17 && hour < 22) {
      pool = eveningLines;
    } else {
      pool = nightLines;
    }

    // Don't show the same line twice in a row across page loads.
    var lastGreeting = localStorage.getItem('clasr:lastGreeting');
    var choices = pool.length > 1 ? pool.filter(function(line) { return line !== lastGreeting; }) : pool;
    var greeting = choices[Math.floor(Math.random() * choices.length)];
    try { localStorage.setItem('clasr:lastGreeting', greeting); } catch (ex) {}

    greetingEl.textContent = greeting;
  }

  var pasteToggle = document.querySelector('.paste-toggle-btn');
  var pastePanel = document.getElementById('paste-panel');
  if (pasteToggle && pastePanel) {
    pasteToggle.addEventListener('click', function() {
      var isOpen = pastePanel.hidden === false;
      pastePanel.hidden = isOpen;
      pasteToggle.setAttribute('aria-expanded', String(!isOpen));
      pasteToggle.textContent = isOpen ? 'paste text' : 'hide paste';
    });
  }

  var dropZone = document.querySelector('.drop-zone-new');
  if (dropZone) {
    ['dragenter', 'dragover'].forEach(function(evt) {
      dropZone.addEventListener(evt, function(e) { e.preventDefault(); dropZone.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function(evt) {
      dropZone.addEventListener(evt, function() { dropZone.classList.remove('is-over'); });
    });
  }
}());

// ── Active navigation state (2026-08-29) ────────────────────────────────────
// Marks the current page in the public mega-nav, the authenticated top nav,
// and the account dropdown -- based on the actual route, not the last click,
// so a reload or a direct link lands with the right item already marked.
// Runs on every page; every selector below is a no-op where it doesn't apply.
(function () {
  var stripQueryHash = function(href) { return (href || '').split('#')[0].split('?')[0]; };
  var normalize = function(p) {
    if (!p) return '/';
    return p.charAt(p.length - 1) === '/' ? p : p + '/';
  };
  var current = normalize(window.location.pathname);

  // Public mega-nav: Features / Resources / Pricing / Company. The parent
  // stays marked active when the current page is one of its dropdown's
  // child links (e.g. Signal Architecture keeps "Resources" underlined).
  document.querySelectorAll('.nav-links--mega > .nav-item').forEach(function(item) {
    var topLink = item.querySelector(':scope > a');
    if (!topLink) return;
    var hrefs = [topLink.getAttribute('href')];
    item.querySelectorAll('.nav-menu a').forEach(function(a) { hrefs.push(a.getAttribute('href')); });
    var isActive = hrefs.some(function(href) {
      if (!href || href.charAt(0) !== '/') return false;
      var hrefPath = stripQueryHash(href);
      return hrefPath && normalize(hrefPath) === current;
    });
    topLink.classList.toggle('nav-current', isActive);
  });

  // Authenticated top nav: New reading / Readings / Plans / Help.
  document.querySelectorAll('.app-nav a').forEach(function(a) {
    var href = a.getAttribute('href');
    if (!href) return;
    var hrefPath = normalize(stripQueryHash(href));
    var isActive = hrefPath === current;
    // Billing is where a plan actually gets managed, so it counts as
    // "Plans" too, per the explicit example in the spec for this feature.
    if (href === '/dashboard/pricing/' && current === '/dashboard/billing/') isActive = true;
    a.classList.toggle('nav-current', isActive);
  });

  // Account dropdown menu items (skip Log out -- it's an action, not a page).
  document.querySelectorAll('.account-dropdown__item').forEach(function(a) {
    if (a.classList.contains('account-dropdown__item--logout')) return;
    var href = a.getAttribute('href');
    if (!href) return;
    var hrefPath = normalize(stripQueryHash(href));
    a.classList.toggle('nav-current', hrefPath === current);
  });
}());

