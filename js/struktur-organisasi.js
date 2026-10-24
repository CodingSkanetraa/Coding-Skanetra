
"use strict";

const tabs = document.querySelectorAll(".generation-tab");
const panels = document.querySelectorAll(".generation-panel");

function bukaAngkatan(tahun) {
  tabs.forEach((tab) => {
    const aktif = tab.dataset.generation === tahun;

    tab.classList.toggle("active", aktif);
    tab.setAttribute("aria-selected", String(aktif));
    tab.tabIndex = aktif ? 0 : -1;
  });

  panels.forEach((panel) => {
    panel.hidden = panel.id !== `panel-${tahun}`;
  });
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    bukaAngkatan(tab.dataset.generation);
  });

  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();

    let nextIndex = index;

    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    tabs[nextIndex].focus();
    bukaAngkatan(tabs[nextIndex].dataset.generation);
  });
});
