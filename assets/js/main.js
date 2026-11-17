(function () {
  "use strict";

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  var year = document.getElementById("year");
  var backToTop = document.querySelector(".back-to-top");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  function pageName() {
    var file = decodeURIComponent((window.location.pathname || "").split("/").pop() || "");
    file = file.toLowerCase();
    if (!file || file === "rubybug-apps") {
      return "index.html";
    }
    return file;
  }

  var current = pageName();
  document.querySelectorAll(".nav a, .header-cta").forEach(function (link) {
    var href = (link.getAttribute("href") || "").split("#")[0].toLowerCase();
    var active = href === current;
    if (active) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  function mobileNav() {
    return window.matchMedia("(max-width: 960px)").matches;
  }

  function focusableInNav() {
    if (!nav) {
      return [];
    }
    return Array.prototype.slice.call(nav.querySelectorAll("a, button")).filter(function (el) {
      return el.offsetParent !== null || nav.classList.contains("is-open");
    });
  }

  function setMenu(open) {
    if (!toggle || !nav) {
      return;
    }
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      setMenu(open);
      if (open) {
        var first = focusableInNav()[0];
        if (first) {
          first.focus();
        }
      }
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        setMenu(false);
      }
    });

    document.addEventListener("click", function (event) {
      if (!toggle || toggle.getAttribute("aria-expanded") !== "true") {
        return;
      }
      if (nav.contains(event.target) || toggle.contains(event.target)) {
        return;
      }
      setMenu(false);
    });

    document.addEventListener("keydown", function (event) {
      if (!toggle || toggle.getAttribute("aria-expanded") !== "true" || !mobileNav()) {
        return;
      }

      var items = focusableInNav();

      if (event.key === "Escape") {
        setMenu(false);
        toggle.focus();
        return;
      }

      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && items.length) {
        var index = items.indexOf(document.activeElement);
        if (index === -1) {
          return;
        }
        event.preventDefault();
        var nextIndex = event.key === "ArrowDown"
          ? (index + 1) % items.length
          : (index - 1 + items.length) % items.length;
        items[nextIndex].focus();
        return;
      }

      if (event.key !== "Tab" || !items.length) {
        return;
      }

      var firstItem = items[0];
      var lastItem = items[items.length - 1];
      var active = document.activeElement;

      if (event.shiftKey && (active === firstItem || active === toggle)) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && active === lastItem) {
        event.preventDefault();
        toggle.focus();
      }
    });

    window.addEventListener("resize", function () {
      if (!mobileNav()) {
        setMenu(false);
      }
    });
  }

  document.querySelectorAll(".faq-trigger").forEach(function (button, index, buttons) {
    button.addEventListener("click", function () {
      var expanded = button.getAttribute("aria-expanded") === "true";
      var panel = document.getElementById(button.getAttribute("aria-controls"));
      button.setAttribute("aria-expanded", expanded ? "false" : "true");
      if (panel) {
        panel.hidden = expanded;
      }
    });

    button.addEventListener("keydown", function (event) {
      var target = null;
      if (event.key === "ArrowDown") {
        target = buttons[(index + 1) % buttons.length];
      } else if (event.key === "ArrowUp") {
        target = buttons[(index - 1 + buttons.length) % buttons.length];
      } else if (event.key === "Home") {
        target = buttons[0];
      } else if (event.key === "End") {
        target = buttons[buttons.length - 1];
      }
      if (target) {
        event.preventDefault();
        target.focus();
      }
    });
  });

  var form = document.getElementById("contact-form");
  if (form) {
    var status = document.getElementById("form-status");
    var rules = [
      {
        id: "full-name",
        errorId: "full-name-error",
        message: "Full name is required. Use 2 to 80 characters.",
        test: function (value) {
          var length = value.trim().length;
          return length >= 2 && length <= 80;
        }
      },
      {
        id: "business-email",
        errorId: "business-email-error",
        message: "A valid business email address is required.",
        test: function (value) {
          var email = value.trim();
          return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }
      },
      {
        id: "subject",
        errorId: "subject-error",
        message: "Subject is required. Use 3 to 120 characters.",
        test: function (value) {
          var length = value.trim().length;
          return length >= 3 && length <= 120;
        }
      },
      {
        id: "message",
        errorId: "message-error",
        message: "Message is required. Use 10 to 1,000 characters.",
        test: function (value) {
          var length = value.trim().length;
          return length >= 10 && length <= 1000;
        }
      }
    ];

    function clearField(rule) {
      var input = document.getElementById(rule.id);
      var error = document.getElementById(rule.errorId);
      if (input) {
        input.removeAttribute("aria-invalid");
      }
      if (error) {
        error.textContent = "";
        error.hidden = true;
      }
    }

    rules.forEach(function (rule) {
      var input = document.getElementById(rule.id);
      if (!input) {
        return;
      }
      input.addEventListener("input", function () {
        clearField(rule);
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var firstInvalid = null;
      var valid = true;

      rules.forEach(function (rule) {
        var input = document.getElementById(rule.id);
        var error = document.getElementById(rule.errorId);
        var value = input ? input.value : "";
        var passed = rule.test(value);
        if (!passed) {
          valid = false;
          if (input) {
            input.setAttribute("aria-invalid", "true");
            if (!firstInvalid) {
              firstInvalid = input;
            }
          }
          if (error) {
            error.textContent = rule.message;
            error.hidden = false;
          }
        } else {
          clearField(rule);
        }
      });

      if (!valid) {
        if (status) {
          status.textContent = "Some fields need attention before an email application can open.";
        }
        if (firstInvalid) {
          firstInvalid.focus();
        }
        return;
      }

      var name = document.getElementById("full-name").value.trim();
      var email = document.getElementById("business-email").value.trim();
      var subject = document.getElementById("subject").value.trim();
      var message = document.getElementById("message").value.trim();
      var body = [
        "Name: " + name,
        "Business email: " + email,
        "",
        message,
        "",
        "Sent from the RubyBug Apps contact page."
      ].join("\n");
      var mailto = "mailto:aissatalyah524@hotmail.com?subject=" +
        encodeURIComponent("RubyBug Apps: " + subject) +
        "&body=" + encodeURIComponent(body);

      window.location.href = mailto;

      if (status) {
        status.textContent = "Your email application should open with this message addressed to aissatalyah524@hotmail.com. If it does not open, copy your message and send it directly to that address. This website does not receive or store the form.";
      }
    });
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[href^='#']");
    if (!link) {
      return;
    }
    var id = (link.getAttribute("href") || "").slice(1);
    if (!id) {
      return;
    }
    var target = document.getElementById(id);
    if (!target) {
      return;
    }
    event.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    if (!target.hasAttribute("tabindex")) {
      target.setAttribute("tabindex", "-1");
    }
    target.focus({ preventScroll: true });
  });

  if (backToTop) {
    var onScroll = function () {
      if (window.scrollY > 500) {
        backToTop.hidden = false;
      } else {
        backToTop.hidden = true;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      var main = document.getElementById("main");
      if (main) {
        main.focus({ preventScroll: true });
      }
    });
  }

  // 1. Header scroll elevation
  var header = document.querySelector(".site-header");
  if (header) {
    window.addEventListener("scroll", function () {
      if (window.scrollY > 20) {
        header.classList.add("is-scrolled");
      } else {
        header.classList.remove("is-scrolled");
      }
    }, { passive: true });
  }

  // 2. Hero Mockup Channel Filters & Tabs
  var mockupChips = document.querySelectorAll(".mockup-chip");
  var mockupRows = document.querySelectorAll(".mockup-table tbody tr");
  mockupChips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      mockupChips.forEach(function (c) { c.classList.remove("is-active"); });
      chip.classList.add("is-active");
      var store = chip.getAttribute("data-store");
      mockupRows.forEach(function (row) {
        if (!store || store === "all") {
          row.style.display = "";
        } else {
          var hasBadge = row.querySelector(".store-badge." + store);
          row.style.display = hasBadge ? "" : "none";
        }
      });
    });
  });

  var mockupTabBtns = document.querySelectorAll(".mockup-tab-btn");
  mockupTabBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      mockupTabBtns.forEach(function (b) {
        b.classList.remove("is-active");
        b.setAttribute("aria-selected", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-selected", "true");
    });
  });

  // 3. Feature Studio Tab Switching
  var studioTabs = document.querySelectorAll(".studio-tab-card");
  var studioPanels = document.querySelectorAll(".studio-panel");
  studioTabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      var targetId = tab.getAttribute("data-target");
      studioTabs.forEach(function (t) {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      studioPanels.forEach(function (p) {
        p.classList.remove("is-active");
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      var activePanel = document.getElementById(targetId);
      if (activePanel) {
        activePanel.classList.add("is-active");
      }
    });

    tab.addEventListener("keydown", function (event) {
      var tabs = Array.prototype.slice.call(studioTabs);
      var idx = tabs.indexOf(tab);
      var nextTab = null;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        nextTab = tabs[(idx + 1) % tabs.length];
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        nextTab = tabs[(idx - 1 + tabs.length) % tabs.length];
      }
      if (nextTab) {
        event.preventDefault();
        nextTab.click();
        nextTab.focus();
      }
    });
  });

  // 4. Multi-Store Efficiency Calculator
  var calcBtns = document.querySelectorAll(".calc-btn");
  var calcHours = document.getElementById("calc-hours");
  var calcSwitches = document.getElementById("calc-switches");
  var calcSpeed = document.getElementById("calc-speed");
  var calcData = {
    "2": { hours: "~14 hrs", switches: "~420", speed: "2.8x" },
    "3": { hours: "~24 hrs", switches: "~720", speed: "3.8x" },
    "5": { hours: "~48 hrs", switches: "~1,440", speed: "4.8x" },
    "8": { hours: "~82 hrs", switches: "~2,460", speed: "5.6x" }
  };
  calcBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      calcBtns.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");
      var stores = btn.getAttribute("data-stores");
      var data = calcData[stores] || calcData["3"];
      if (calcHours) calcHours.textContent = data.hours;
      if (calcSwitches) calcSwitches.textContent = data.switches;
      if (calcSpeed) calcSpeed.textContent = data.speed;
    });
  });

  // 5. Landing Page FAQ Accordion
  var faqTriggers = document.querySelectorAll(".faq-card-trigger");
  faqTriggers.forEach(function (btn, index, buttons) {
    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      var panelId = btn.getAttribute("aria-controls");
      var panel = document.getElementById(panelId);
      btn.setAttribute("aria-expanded", expanded ? "false" : "true");
      if (panel) {
        panel.hidden = expanded;
      }
    });

    btn.addEventListener("keydown", function (event) {
      var target = null;
      if (event.key === "ArrowDown") {
        target = buttons[(index + 1) % buttons.length];
      } else if (event.key === "ArrowUp") {
        target = buttons[(index - 1 + buttons.length) % buttons.length];
      }
      if (target) {
        event.preventDefault();
        target.focus();
      }
    });
  });
})();
