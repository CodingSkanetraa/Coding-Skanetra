
const yearElement = document.querySelector("#year");
const menuToggle = document.querySelector("#menu-toggle");
const navLinks = document.querySelector("#nav-links");


// Update copyright year automatically.
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// Navigasi mobile (hamburger).
// Aktif di semua halaman yang memuat navbar. Tautan aktif ditandai langsung di HTML
// (class "active" + aria-current), jadi tidak perlu ditebak dari URL.
if (menuToggle && navLinks) {
  // Harus sama dengan breakpoint hamburger di css/style.css.
  const desktopQuery = window.matchMedia("(min-width: 1025px)");

  function setMenu(open) {
    navLinks.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Tutup navigasi" : "Buka navigasi");
  }

  menuToggle.addEventListener("click", () => {
    setMenu(!navLinks.classList.contains("is-open"));
  });

  // Tutup menu setelah salah satu tautan dipilih.
  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });

  // Tutup saat mengetuk di luar menu.
  document.addEventListener("click", (event) => {
    if (!navLinks.classList.contains("is-open")) return;
    if (navLinks.contains(event.target) || menuToggle.contains(event.target)) return;
    setMenu(false);
  });

  // Tutup dengan tombol Escape dan kembalikan fokus ke tombol menu.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navLinks.classList.contains("is-open")) {
      setMenu(false);
      menuToggle.focus();
    }
  });

  // Reset saat layar membesar ke tampilan desktop.
  desktopQuery.addEventListener("change", (event) => {
    if (event.matches) setMenu(false);
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
