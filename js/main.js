
const yearElement = document.querySelector("#year");
const menuToggle = document.querySelector("#menu-toggle");
const navLinks = document.querySelector("#nav-links");


// Tandai halaman aktif pada navbar bersama.
(() => {
  const path = window.location.pathname;
  const page = path.split('/').pop();
  const lessonPages = ['materi.html', 'html-dasar.html', 'css-dasar.html', 'javascript-dasar.html', 'python-dasar.html'];
  const navKey = lessonPages.includes(page) ? 'materi'
    : (page === 'playground.html' || page.startsWith('editor-')) ? 'playground'
    : 'beranda';

  document.querySelectorAll('.nav-links [data-nav]').forEach((link) => {
    const key = link.dataset.nav;
    const active = key === navKey;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
})();

// Update copyright year automatically.
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// Toggle the mobile navigation.
if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Tutup navigasi" : "Buka navigasi"
    );
  });

  // Close the menu after a navigation link is selected.
  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Buka navigasi");
    });
  });
}

// Halaman materi

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.querySelector("#search-materi");
  const filterButtons = document.querySelectorAll(".filter-btn");
  const materiCards = document.querySelectorAll(".materi-card");
  const hasilMateri = document.querySelector("#hasil-materi");

  // Berhenti jika halaman ini bukan halaman Materi.
  if (!searchInput || !hasilMateri || materiCards.length === 0) {
    return;
  }

  let filterAktif = "semua";

  function tampilkanMateri() {
    const kataKunci = searchInput.value.trim().toLowerCase();
    let jumlahTampil = 0;

    materiCards.forEach((card) => {
      const teksKartu = card.textContent.toLowerCase();
      const tingkat = card.dataset.level;

      const cocokKata = teksKartu.includes(kataKunci);
      const cocokFilter =
        filterAktif === "semua" || tingkat === filterAktif;

      const tampil = cocokKata && cocokFilter;

      card.hidden = !tampil;

      if (tampil) {
        jumlahTampil++;
      }
    });

    hasilMateri.textContent = jumlahTampil === 0
      ? "Materi tidak ditemukan. Coba kata kunci lain."
      : `${jumlahTampil} materi ditemukan.`;
  }

  searchInput.addEventListener("input", tampilkanMateri);

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterAktif = button.dataset.filter;

      filterButtons.forEach((item) => {
        item.classList.toggle("active", item === button);
      });

      tampilkanMateri();
    });
  });

  tampilkanMateri();
});

// Kuis pada halaman materi (html-dasar, css-dasar, javascript-dasar, python-dasar)
// Atur lewat atribut di #quiz-options: data-correct, data-benar, data-salah.

document.addEventListener("DOMContentLoaded", () => {
  const quizOptions = document.querySelector("#quiz-options");
  const quizFeedback = document.querySelector("#quiz-feedback");

  if (!quizOptions || !quizFeedback) {
    return;
  }

  const buttons = quizOptions.querySelectorAll("button");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const jawabanBenar = quizOptions.dataset.correct || "b";
      const benar = button.dataset.answer === jawabanBenar;

      buttons.forEach((item) => {
        item.disabled = true;

        if (item.dataset.answer === jawabanBenar) {
          item.classList.add("correct");
        } else if (item === button && !benar) {
          item.classList.add("incorrect");
        }
      });

      quizFeedback.textContent = benar
        ? (quizOptions.dataset.benar || "Benar!")
        : (quizOptions.dataset.salah || "Belum tepat. Coba lagi.");
    });
  });
});
