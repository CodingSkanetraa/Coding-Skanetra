
(() => {
  "use strict";

  const root = document.querySelector(".games-page");
  if (!root) return;

  const $ = (selector) => root.querySelector(selector);

  const languageSelect = $("#gameLanguage");
    const difficultySelect = $("#gameDifficulty");
    
  // ===== AUDIO SYSTEM =====
  const audioButton = $("#gameAudioToggle");

  let audioContext = null;
  let masterGain = null;
  let musicTimer = null;
  let musicStep = 0;
  let audioMuted = false;
  let lastCountdownSecond = null;

  function initAudio() {
    if (audioContext) return;

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.gain.value = audioMuted ? 0 : 0.18;
    masterGain.connect(audioContext.destination);
  }

  async function unlockAudio() {
    initAudio();

    if (!audioContext) return;

    if (audioContext.state === "suspended") {
      try {
        await audioContext.resume();
      } catch (error) {
        console.warn("Audio belum bisa diaktifkan:", error);
      }
    }
  }

  function playTone({
    frequency = 440,
    duration = 0.12,
    type = "sine",
    volume = 0.25,
    slideTo = null
  } = {}) {
    if (
      audioMuted ||
      !audioContext ||
      !masterGain ||
      audioContext.state !== "running"
    ) {
      return;
    }

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    if (slideTo !== null) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, slideTo),
        now + duration
      );
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(
      volume,
      now + Math.min(0.02, duration / 3)
    );
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + duration
    );

    oscillator.connect(gain);
    gain.connect(masterGain);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);

    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      gain.disconnect();
    }, { once: true });
  }

  function playSfx(name) {
    if (audioMuted) return;

    switch (name) {
      case "correct":
        playTone({
          frequency: 620,
          slideTo: 920,
          duration: 0.12,
          type: "sine",
          volume: 0.22
        });
        window.setTimeout(() => {
          playTone({
            frequency: 920,
            duration: 0.13,
            type: "sine",
            volume: 0.16
          });
        }, 100);
        break;

      case "wrong":
        playTone({
          frequency: 260,
          slideTo: 115,
          duration: 0.3,
          type: "sawtooth",
          volume: 0.13
        });
        break;

      case "tick":
        playTone({
          frequency: 760,
          duration: 0.055,
          type: "square",
          volume: 0.09
        });
        break;

      case "timeout":
        playTone({
          frequency: 420,
          slideTo: 100,
          duration: 0.45,
          type: "sawtooth",
          volume: 0.16
        });
        break;

      case "win":
        [523, 659, 784, 1047].forEach((frequency, index) => {
          window.setTimeout(() => {
            playTone({
              frequency,
              duration: 0.22,
              type: "triangle",
              volume: 0.18
            });
          }, index * 130);
        });
        break;

      case "lose":
        [300, 230, 160].forEach((frequency, index) => {
          window.setTimeout(() => {
            playTone({
              frequency,
              duration: 0.25,
              type: "sawtooth",
              volume: 0.12
            });
          }, index * 170);
        });
        break;
    }
  }

  function startMusic() {
    stopMusic();
    if (audioMuted || !audioContext) return;

    // Nada elektronik sederhana; tidak membutuhkan file musik.
    const notes = [110, 164.81, 220, 164.81, 130.81, 196, 261.63, 196];

    const playMusicStep = () => {
      if (
        !running ||
        audioMuted ||
        !audioContext ||
        audioContext.state !== "running"
      ) {
        return;
      }

      const frequency = notes[musicStep % notes.length];
      musicStep++;

      playTone({
        frequency,
        duration: 0.48,
        type: "triangle",
        volume: 0.12
      });

      // Lapisan nada tinggi agar musik terasa futuristik.
      if (musicStep % 2 === 0) {
        playTone({
          frequency: frequency * 2,
          duration: 0.22,
          type: "sine",
          volume: 0.045
        });
      }
    };

    playMusicStep();
    musicTimer = window.setInterval(playMusicStep, 420);
  }

  function stopMusic() {
    if (musicTimer !== null) {
      window.clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  function setAudioMuted(muted) {
    audioMuted = muted;

    if (masterGain && audioContext) {
      const now = audioContext.currentTime;

      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setTargetAtTime(
        muted ? 0 : 0.18,
        now,
        0.025
      );
    }

    if (audioButton) {
      audioButton.textContent = muted
        ? "🔇 Audio mati"
        : "🔊 Audio aktif";

      audioButton.setAttribute("aria-pressed", String(muted));
      audioButton.setAttribute(
        "aria-label",
        muted ? "Nyalakan semua audio" : "Matikan semua audio"
      );
    }

    if (muted) {
      stopMusic();
    } else if (running && audioContext?.state === "running") {
      startMusic();
    }
  }

  if (audioButton) {
    audioButton.addEventListener("click", async () => {
      if (audioMuted) {
        await unlockAudio();
        setAudioMuted(false);
      } else {
        setAudioMuted(true);
      }
    });
  }
  // ===== END AUDIO SYSTEM =====

  const ui = {
    start: $("#gameStart"),
    restart: $("#gameRestart"),
    overlay: $("#gameOverlay"),
    overlayTitle: $("#overlayTitle"),
    overlayText: $("#overlayText"),
    overlayButton: $("#overlayButton"),
    question: $("#gameQuestion"),
    questionNumber: $("#questionNumber"),
    answers: $("#gameAnswers"),
    feedback: $("#gameFeedback"),
    timer: $("#gameTimer"),
    timerFill: $("#gameProgressFill"),
    lives: $("#gameLives"),
    score: $("#gameScore"),
    highScore: $("#gameHighScore"),
    robot: $("#robotCharacter"),
    distance: $("#robotDistance"),
    arena: $("#gameArena"),
    level: $("#gameLevel")
  };


const QUESTION_BANK = {
  python: {
    1: [
      {
        question: "Fungsi untuk menampilkan teks di Python adalah ...",
        answers: ["echo()", "print()", "console.log()", "displayText()"],
        correct: 1,
        explanation: "print() menampilkan nilai ke output."
      },
      {
        question: "Manakah deklarasi variabel Python yang valid?",
        answers: ["int nama = 'Kai'", "let nama = 'Kai'", "nama = 'Kai'", "var nama := 'Kai'"],
        correct: 2,
        explanation: "Variabel Python dibuat melalui assignment tanpa kata kunci khusus."
      },
      {
        question: "Apa hasil dari 7 + 3?",
        answers: ["73", "10", "21", "4"],
        correct: 1,
        explanation: "Operator + menjumlahkan 7 dan 3."
      },
      {
        question: "Tipe data dari nilai True adalah ...",
        answers: ["str", "int", "bool", "list"],
        correct: 2,
        explanation: "True dan False merupakan nilai bertipe bool."
      },
      {
        question: "Fungsi untuk mengetahui panjang sebuah string adalah ...",
        answers: ["size()", "count()", "len()", "length()"],
        correct: 2,
        explanation: "len() mengembalikan jumlah elemen atau karakter."
      },
      {
        question: "Simbol komentar satu baris Python adalah ...",
        answers: ["//", "<!--", "#", "**"],
        correct: 2,
        explanation: "Tanda # digunakan untuk komentar satu baris."
      },
      {
        question: "Apa hasil dari print(3 * 4)?",
        answers: ["7", "12", "34", "9"],
        correct: 1,
        explanation: "Operator * mengalikan 3 dengan 4."
      },
      {
        question: "Tipe data untuk teks adalah ...",
        answers: ["str", "bool", "float", "tuple"],
        correct: 0,
        explanation: "String atau str digunakan untuk menyimpan teks."
      },
      {
        question: "Bagaimana menulis kondisi jika x lebih besar dari 5?",
        answers: ["if x > 5:", "if x => 5:", "when x > 5:", "if (x greater 5)"],
        correct: 0,
        explanation: "Python menggunakan if diikuti kondisi dan titik dua."
      },
      {
        question: "Apa hasil dari print(10 // 3)?",
        answers: ["3", "3.33", "1", "4"],
        correct: 0,
        explanation: "Operator // melakukan pembagian bulat, menghasilkan 3."
      }
    ],
    2: [
      {
        question: "Apa hasil dari for i in range(3): print(i)?",
        answers: ["1 2 3", "0 1 2", "0 1 2 3", "3"],
        correct: 1,
        explanation: "range(3) menghasilkan 0, 1, dan 2."
      },
      {
        question: "Apa hasil dari len([2, 4, 6, 8])?",
        answers: ["3", "4", "8", "20"],
        correct: 1,
        explanation: "List tersebut berisi empat elemen."
      },
      {
        question: "Apa hasil dari 'Hi' * 3?",
        answers: ["Hi3", "HiHiHi", "Error", "3Hi"],
        correct: 1,
        explanation: "Mengalikan string dengan bilangan bulat mengulang string tersebut."
      },
      {
        question: "Apa hasil dari kode berikut?\nx = 8\nif x > 5:\n    print('Aman')",
        answers: ["8", "Aman", "False", "Tidak ada output"],
        correct: 1,
        explanation: "Kondisi x > 5 benar, sehingga Aman ditampilkan."
      },
      {
        question: "Metode list untuk menambahkan elemen di akhir adalah ...",
        answers: ["add()", "push()", "append()", "insertEnd()"],
        correct: 2,
        explanation: "append() menambahkan satu elemen ke akhir list."
      },
      {
        question: "Apa hasil dari list bernilai [10, 20, 30], lalu list[1]?",
        answers: ["10", "20", "30", "1"],
        correct: 1,
        explanation: "Indeks list dimulai dari 0, jadi indeks 1 adalah elemen kedua."
      },
      {
        question: "Kata kunci untuk membuat fungsi adalah ...",
        answers: ["function", "func", "def", "make"],
        correct: 2,
        explanation: "Python memakai def untuk mendefinisikan fungsi."
      },
      {
        question: "Apa hasil dari 5 == '5'?",
        answers: ["True", "False", "5", "Error"],
        correct: 1,
        explanation: "Angka 5 dan string '5' memiliki tipe berbeda."
      },
      {
        question: "Apa hasil dari range(2, 6)?",
        answers: ["2, 3, 4, 5", "2, 3, 4, 5, 6", "1, 2, 3, 4, 5", "6 saja"],
        correct: 0,
        explanation: "Batas akhir range tidak disertakan."
      },
      {
        question: "Operator logika untuk menyatakan kedua kondisi benar adalah ...",
        answers: ["or", "not", "and", "both"],
        correct: 2,
        explanation: "and bernilai True jika kedua kondisi benar."
      }
    ],
    3: [
      {
        question: "Apa hasil dari 7 / 2 di Python 3?",
        answers: ["3", "3.5", "4", "Error"],
        correct: 1,
        explanation: "Operator / menghasilkan pembagian biasa, yaitu 3.5."
      },
      {
        question: "Apa masalah pada kode: if x = 5:?",
        answers: ["Tidak ada masalah", "Gunakan == untuk membandingkan", "x harus string", "if tidak valid"],
        correct: 1,
        explanation: "Assignment dengan = tidak digunakan sebagai kondisi perbandingan."
      },
      {
        question: "Apa hasil dari [x * 2 for x in [1, 2, 3]]?",
        answers: ["[1, 2, 3]", "[2, 4, 6]", "[1, 4, 9]", "[3, 6, 9]"],
        correct: 1,
        explanation: "Setiap elemen dikalikan dua melalui list comprehension."
      },
      {
        question: "Apa hasil dari kode?\ndef tambah(a, b):\n    return a + b\nprint(tambah(2, 4))",
        answers: ["24", "6", "2", "None"],
        correct: 1,
        explanation: "Fungsi mengembalikan hasil 2 + 4, yaitu 6."
      },
      {
        question: "Apa hasil dari bool([])?",
        answers: ["True", "False", "None", "Error"],
        correct: 1,
        explanation: "List kosong merupakan nilai falsy di Python."
      },
      {
        question: "Apa keluaran dari kode?\nx = 0\nwhile x < 3:\n    x += 1\nprint(x)",
        answers: ["0", "2", "3", "4"],
        correct: 2,
        explanation: "Perulangan berhenti ketika x mencapai 3."
      },
      {
        question: "Apa masalah dari kode: print(nama) jika nama belum didefinisikan?",
        answers: ["SyntaxError", "NameError", "TypeError", "Tidak ada masalah"],
        correct: 1,
        explanation: "Nama variabel yang belum didefinisikan menimbulkan NameError."
      },
      {
        question: "Apa hasil dari 'python'[1:4]?",
        answers: ["pyt", "yth", "tho", "ytho"],
        correct: 1,
        explanation: "Slicing mengambil indeks 1 sampai sebelum indeks 4."
      },
      {
        question: "Apa hasil dari set([1, 1, 2, 3])?",
        answers: ["{1, 1, 2, 3}", "{1, 2, 3}", "[1, 2, 3]", "Error"],
        correct: 1,
        explanation: "Set menyimpan elemen unik tanpa duplikasi."
      },
      {
        question: "Apa fungsi try dan except?",
        answers: ["Membuat perulangan", "Menangani pengecualian", "Mendeklarasikan kelas", "Menghentikan komputer"],
        correct: 1,
        explanation: "try-except digunakan untuk menangani exception."
      }
    ]
  },

  cpp: {
    1: [
      {
        question: "Fungsi utama program C++ biasanya bernama ...",
        answers: ["start()", "main()", "program()", "run()"],
        correct: 1,
        explanation: "Eksekusi program biasa dimulai dari main()."
      },
      {
        question: "Header untuk cin dan cout adalah ...",
        answers: ["<string>", "<iostream>", "<input>", "<console>"],
        correct: 1,
        explanation: "<iostream> menyediakan fasilitas input dan output."
      },
      {
        question: "Tipe data untuk bilangan bulat adalah ...",
        answers: ["int", "string", "booltext", "char[]"],
        correct: 0,
        explanation: "int digunakan untuk bilangan bulat."
      },
      {
        question: "Operator untuk menampilkan output dengan cout adalah ...",
        answers: ["<<", ">>", "<>", "=>"],
        correct: 0,
        explanation: "Operator << mengirimkan data ke stream output."
      },
      {
        question: "Simbol komentar satu baris C++ adalah ...",
        answers: ["#", "//", "<!--", "**"],
        correct: 1,
        explanation: "// memulai komentar satu baris."
      },
      {
        question: "Apa hasil dari int x = 4; cout << x + 3;?",
        answers: ["43", "7", "4", "Error"],
        correct: 1,
        explanation: "Nilai 4 ditambah 3 menghasilkan 7."
      },
      {
        question: "Tipe data untuk satu karakter adalah ...",
        answers: ["string", "char", "int", "double"],
        correct: 1,
        explanation: "char menyimpan satu karakter."
      },
      {
        question: "Operator untuk membandingkan kesamaan dua nilai adalah ...",
        answers: ["=", "==", ":=", "!="],
        correct: 1,
        explanation: "== membandingkan apakah kedua nilai sama."
      },
      {
        question: "Kata kunci untuk kondisi percabangan adalah ...",
        answers: ["repeat", "if", "define", "loop"],
        correct: 1,
        explanation: "if menjalankan blok kode berdasarkan kondisi."
      },
      {
        question: "Manakah deklarasi variabel integer yang benar?",
        answers: ["integer x = 5;", "int x = 5;", "x int = 5;", "number x = 5;"],
        correct: 1,
        explanation: "Deklarasi integer dalam C++ dapat ditulis int x = 5;."
      }
    ],
    2: [
      {
        question: "Struktur untuk mengulang selama kondisi benar adalah ...",
        answers: ["if", "switch", "while", "return"],
        correct: 2,
        explanation: "while mengulang blok selama kondisi bernilai true."
      },
      {
        question: "Apa hasil dari for (int i=0; i<3; i++) cout << i;?",
        answers: ["123", "012", "0123", "3"],
        correct: 1,
        explanation: "Nilai i yang dicetak adalah 0, 1, dan 2."
      },
      {
        question: "Apa hasil dari 10 % 3?",
        answers: ["3", "1", "0", "3.33"],
        correct: 1,
        explanation: "Operator % menghasilkan sisa pembagian, yaitu 1."
      },
      {
        question: "Apa hasil dari int x = 5; x += 2;?",
        answers: ["5", "2", "7", "52"],
        correct: 2,
        explanation: "x += 2 menambahkan 2 ke nilai x."
      },
      {
        question: "Untuk menerima input ke variabel x, penulisan yang benar adalah ...",
        answers: ["cin << x;", "cout >> x;", "cin >> x;", "input(x);"],
        correct: 2,
        explanation: "Operator >> mengambil input dari cin ke variabel."
      },
      {
        question: "Apa fungsi break dalam sebuah loop?",
        answers: ["Melanjutkan iterasi berikutnya", "Mengakhiri loop", "Memulai program", "Menghapus variabel"],
        correct: 1,
        explanation: "break menghentikan loop yang sedang berjalan."
      },
      {
        question: "Apa hasil dari bool aktif = (4 < 8);?",
        answers: ["true", "false", "4", "Error"],
        correct: 0,
        explanation: "Perbandingan 4 < 8 bernilai true."
      },
      {
        question: "Kata kunci untuk mengembalikan nilai dari fungsi adalah ...",
        answers: ["send", "break", "return", "output"],
        correct: 2,
        explanation: "return mengembalikan nilai dari fungsi."
      },
      {
        question: "Apa hasil dari string nama = \"Kai\"; cout << nama;?",
        answers: ["nama", "Kai", "\"Kai\"", "Error"],
        correct: 1,
        explanation: "cout menampilkan isi variabel nama."
      },
      {
        question: "Header standar untuk menggunakan std::string adalah ...",
        answers: ["<iostream>", "<string>", "<text>", "<char>"],
        correct: 1,
        explanation: "Header <string> mendeklarasikan fasilitas string standar."
      }
    ],
    3: [
      {
        question: "Apa hasil dari int x = 7 / 2; cout << x;?",
        answers: ["3", "3.5", "4", "Error"],
        correct: 0,
        explanation: "Pembagian integer membuang bagian desimal."
      },
      {
        question: "Apa fungsi return 0; di main()?",
        answers: ["Mengulang program", "Menandakan program selesai dengan sukses", "Mencetak nol", "Menghapus variabel"],
        correct: 1,
        explanation: "Nilai 0 lazim menandakan program selesai dengan sukses."
      },
      {
        question: "Apa masalah dari if (x = 5) jika maksudnya membandingkan x dengan 5?",
        answers: ["Tidak ada masalah", "Seharusnya x == 5", "Harus menggunakan x != 5", "if tidak boleh memakai angka"],
        correct: 1,
        explanation: "= melakukan assignment, sedangkan == membandingkan kesamaan."
      },
      {
        question: "Apa keluaran kode: int a=2; int b=3; cout << a*b+1;?",
        answers: ["7", "8", "6", "5"],
        correct: 0,
        explanation: "Perkalian dilakukan lebih dahulu: 2 * 3 + 1 = 7."
      },
      {
        question: "Apa yang terjadi jika loop for tidak pernah memenuhi kondisi berhenti?",
        answers: ["Pasti langsung selesai", "Dapat menjadi loop tak berujung", "Variabel otomatis dihapus", "Program selalu mencetak nol"],
        correct: 1,
        explanation: "Kondisi yang selalu benar dapat membuat loop berjalan terus."
      },
      {
        question: "Apa keluaran dari int x=3; cout << ++x;?",
        answers: ["2", "3", "4", "Error"],
        correct: 2,
        explanation: "Pre-increment menaikkan x sebelum nilainya digunakan."
      },
      {
        question: "Apa masalah dari mengakses array int a[3] dengan a[3]?",
        answers: ["Indeks valid terakhir adalah 3", "Indeks berada di luar batas array", "Array otomatis bertambah", "Tidak ada masalah"],
        correct: 1,
        explanation: "Array berukuran 3 memiliki indeks valid 0, 1, dan 2."
      },
      {
        question: "Apa hasil dari fungsi int kali(int a,int b){return a*b;} saat dipanggil kali(3,4)?",
        answers: ["7", "12", "34", "1"],
        correct: 1,
        explanation: "Fungsi mengembalikan hasil perkalian 3 dan 4."
      },
      {
        question: "Apa yang terjadi jika variabel lokal digunakan sebelum diberi nilai?",
        answers: ["Selalu bernilai nol", "Nilainya selalu satu", "Nilainya tidak dapat diandalkan; membaca nilai tak terinisialisasi dapat menyebabkan perilaku tak terdefinisi", "Compiler selalu mengubahnya menjadi string"],
        correct: 2,
        explanation: "Variabel lokal bawaan seperti int tidak otomatis diinisialisasi menjadi nol."
      },
      {
        question: "Apa kegunaan const pada deklarasi const int batas = 10;?",
        answers: ["Nilai dapat diubah kapan saja", "Menandai objek sebagai tidak dapat diubah melalui nama tersebut", "Menghapus variabel", "Membuat loop otomatis"],
        correct: 1,
        explanation: "const mencegah modifikasi nilai melalui objek const tersebut."
      }
    ]
  },

  website: {
    1: [
      {
        question: "Tag HTML untuk membuat paragraf adalah ...",
        answers: ["<h1>", "<p>", "<img>", "<footer>"],
        correct: 1,
        explanation: "Elemen <p> digunakan untuk paragraf."
      },
      {
        question: "Tag HTML untuk menyisipkan gambar adalah ...",
        answers: ["<picture-text>", "<img>", "<image-file>", "<src>"],
        correct: 1,
        explanation: "Elemen <img> menyematkan gambar."
      },
      {
        question: "Atribut untuk menentukan tujuan tautan adalah ...",
        answers: ["src", "href", "alt", "class"],
        correct: 1,
        explanation: "Atribut href berisi URL tujuan tautan."
      },
      {
        question: "Properti CSS untuk mengubah warna teks adalah ...",
        answers: ["background", "font-size", "color", "border"],
        correct: 2,
        explanation: "color mengatur warna teks."
      },
      {
        question: "CSS untuk membuat sudut elemen membulat adalah ...",
        answers: ["corner", "border-round", "radius", "border-radius"],
        correct: 3,
        explanation: "border-radius mengatur pembulatan sudut."
      },
      {
        question: "Tag untuk judul utama HTML biasanya adalah ...",
        answers: ["<h1>", "<title-text>", "<head1>", "<main-title>"],
        correct: 0,
        explanation: "<h1> menandai heading tingkat utama pada konten halaman."
      },
      {
        question: "Properti CSS untuk mengubah ukuran teks adalah ...",
        answers: ["text-weight", "font-size", "size-text", "font-scale"],
        correct: 1,
        explanation: "font-size menentukan ukuran teks."
      },
      {
        question: "Manakah deklarasi variabel JavaScript yang valid?",
        answers: ["let nama = 'Kai';", "variable nama = 'Kai';", "text nama = 'Kai';", "define nama = 'Kai';"],
        correct: 0,
        explanation: "let adalah salah satu cara mendeklarasikan variabel JavaScript."
      },
      {
        question: "Apa hasil dari 2 + 3 dalam JavaScript?",
        answers: ["23", "5", "6", "undefined"],
        correct: 1,
        explanation: "Kedua operand adalah angka, sehingga hasil penjumlahan adalah 5."
      },
      {
        question: "Simbol komentar satu baris JavaScript adalah ...",
        answers: ["<!-- -->", "**", "//", "##"],
        correct: 2,
        explanation: "// memulai komentar satu baris JavaScript."
      }
    ],
    2: [
      {
        question: "CSS untuk mengaktifkan Flexbox adalah ...",
        answers: ["display: block", "position: flex", "display: flex", "layout: flex"],
        correct: 2,
        explanation: "display: flex mengaktifkan layout Flexbox."
      },
      {
        question: "Metode untuk memilih elemen berdasarkan ID adalah ...",
        answers: ["document.getElementById()", "document.getClass()", "document.findId()", "window.selectId()"],
        correct: 0,
        explanation: "getElementById() mencari elemen berdasarkan ID."
      },
      {
        question: "Apa fungsi CSS margin?",
        answers: ["Mengatur ruang di luar border", "Mengubah isi teks", "Menjalankan JavaScript", "Menentukan URL gambar"],
        correct: 0,
        explanation: "margin mengatur ruang di luar border elemen."
      },
      {
        question: "Atribut HTML untuk teks alternatif gambar adalah ...",
        answers: ["title", "alt", "href", "role"],
        correct: 1,
        explanation: "alt memberikan teks alternatif untuk gambar."
      },
      {
        question: "Apa hasil dari Boolean('') di JavaScript?",
        answers: ["true", "false", "undefined", "Error"],
        correct: 1,
        explanation: "String kosong adalah nilai falsy."
      },
      {
        question: "Metode untuk menambahkan elemen di akhir array JavaScript adalah ...",
        answers: ["append()", "push()", "addEnd()", "insertLast()"],
        correct: 1,
        explanation: "push() menambahkan elemen ke akhir array."
      },
      {
        question: "Event yang umumnya dipakai saat tombol diklik adalah ...",
        answers: ["hover", "changeColor", "click", "pressing"],
        correct: 2,
        explanation: "Event click merespons klik pengguna."
      },
      {
        question: "CSS mana yang membuat teks tebal?",
        answers: ["font-style: bold", "font-weight: bold", "text: strong", "text-decoration: bold"],
        correct: 1,
        explanation: "font-weight mengatur ketebalan huruf."
      },
      {
        question: "Apa hasil dari [1, 2, 3].length di JavaScript?",
        answers: ["2", "3", "6", "undefined"],
        correct: 1,
        explanation: "Properti length mengembalikan jumlah elemen array."
      },
      {
        question: "Atribut yang menghubungkan label dengan ID input adalah ...",
        answers: ["for", "src", "href", "target"],
        correct: 0,
        explanation: "Nilai for pada label harus cocok dengan ID input."
      }
    ],
    3: [
      {
        question: "Apa hasil dari typeof 'Halo' di JavaScript?",
        answers: ["text", "string", "char", "object"],
        correct: 1,
        explanation: "typeof pada string menghasilkan 'string'."
      },
      {
        question: "Apa hasil dari 2 == '2' di JavaScript?",
        answers: ["true", "false", "undefined", "SyntaxError"],
        correct: 0,
        explanation: "== melakukan perbandingan dengan konversi tipe tertentu."
      },
      {
        question: "Apa hasil dari 2 === '2' di JavaScript?",
        answers: ["true", "false", "2", "Error"],
        correct: 1,
        explanation: "=== membandingkan nilai dan tipe tanpa konversi tipe."
      },
      {
        question: "Apa fungsi preventDefault() pada event?",
        answers: ["Menghapus semua event", "Mencegah aksi bawaan browser", "Menghapus elemen HTML", "Menghentikan CSS"],
        correct: 1,
        explanation: "preventDefault() mencegah aksi default suatu event."
      },
      {
        question: "Selector CSS untuk elemen dengan class kartu adalah ...",
        answers: ["#kartu", ".kartu", "kartu()", "@kartu"],
        correct: 1,
        explanation: "Selector class CSS diawali dengan titik."
      },
      {
        question: "Apa masalah dari document.getElementById('judul').textContent jika ID tidak ditemukan?",
        answers: ["Selalu menghasilkan string kosong", "Akses textContent akan gagal karena hasilnya null", "Browser otomatis membuat elemen", "CSS akan memperbaikinya"],
        correct: 1,
        explanation: "Jika elemen tidak ditemukan, hasilnya null; akses properti perlu dicegah atau ditangani."
      },
      {
        question: "Properti CSS untuk mengatur jarak di dalam border adalah ...",
        answers: ["margin", "padding", "outline", "border-spacing"],
        correct: 1,
        explanation: "padding mengatur ruang antara konten dan border."
      },
      {
        question: "Apa hasil dari [1, 2, 3].map(n => n * 2)?",
        answers: ["[1, 2, 3]", "[2, 4, 6]", "[3, 6, 9]", "6"],
        correct: 1,
        explanation: "map() membuat array baru dengan setiap nilai dikalikan dua."
      },
      {
        question: "Manakah yang membantu mencegah input pengguna ditafsirkan sebagai HTML saat hanya ingin menampilkan teks?",
        answers: ["innerHTML", "textContent", "outerHTML", "document.write"],
        correct: 1,
        explanation: "textContent memasukkan konten sebagai teks, bukan mem-parsingnya sebagai HTML."
      },
      {
        question: "Apa kegunaan media query @media (max-width: 600px)?",
        answers: ["Menjalankan Python", "Menerapkan CSS pada kondisi lebar layar tertentu", "Menghapus HTML", "Mempercepat JavaScript"],
        correct: 1,
        explanation: "Media query dapat menerapkan gaya berdasarkan karakteristik viewport."
      }
    ]
  }
};


  const MAX_LIVES = 3;
  const MAX_DISTANCE = 5;
  const POINTS_PER_ANSWER = 100;
  const MIN_SECONDS = 7;
  const MAX_SECONDS = 10;
  const HIGH_SCORE_KEY = "codingskanetra-code-rush-high-score";

  let running = false;
  let acceptingAnswer = false;
  let lives = MAX_LIVES;
  let distance = 0;
  let score = 0;
  let round = 0;
  let seconds = 8;
  let deadline = 0;
  let tickId = null;
  let questionSet = [];
  let currentQuestion = null;
  let currentShuffledAnswers = [];

  function getHighScore() {
    try {
      return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  function saveHighScore() {
    try {
      if (score > getHighScore()) {
        localStorage.setItem(HIGH_SCORE_KEY, String(score));
        if (window.CodingSkanetraAkun) window.CodingSkanetraAkun.sinkron.catat(HIGH_SCORE_KEY);
      }
    } catch {
      // Game tetap bisa dimainkan jika penyimpanan tidak tersedia.
    }
    ui.highScore.textContent = getHighScore();
  }

  function shuffle(items) {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }
  
    function shuffleAnswers(question) {
    const answers = question.answers.map((text, index) => ({
        text,
        isCorrect: index === question.correct
    }));

    return shuffle(answers);
    }

  function clearTimer() {
    if (tickId !== null) {
      clearInterval(tickId);
      tickId = null;
    }
  }

  function showOverlay(title, message, buttonText) {
    ui.overlayTitle.textContent = title;
    ui.overlayText.textContent = message;
    ui.overlayButton.textContent = buttonText;
    ui.overlay.hidden = false;
  }

  function hideOverlay() {
    ui.overlay.hidden = true;
  }

  function setFeedback(message, state = "") {
    ui.feedback.textContent = message;
    ui.feedback.dataset.state = state;
  }


function updateHUD() {
  ui.lives.textContent = "♥ ".repeat(lives).trim() || "0";
  ui.score.textContent = score;
  ui.level.textContent = Math.floor(round / 5) + 1;

  // Jarak robot mengikuti nyawa yang tersisa.
  const dangerLevel = MAX_LIVES - lives;
  const percentage = (dangerLevel / MAX_LIVES) * 100;

  ui.distance.style.width = `${percentage}%`;

  ui.arena.dataset.danger =
    lives <= 1 ? "critical" :
    lives === 2 ? "true" : "false";

  // Robot semakin dekat ketika nyawa berkurang.
  ui.robot.style.transform =
    `translateX(${-dangerLevel * 18}px)`;
}


  function disableAnswers() {
    acceptingAnswer = false;

    ui.answers.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });
  }
  
    function updateStats() {
    ui.score.textContent = score;
    ui.highScore.textContent = getHighScore();
    }

    function updateRobot() {
    updateHUD();
    }

    function advanceAfterAnswer(wasCorrect) {
    if (!running) return;

    if (round >= questionSet.length) {
        endGame(wasCorrect);
        return;
    }

    renderQuestion();
    }

  function renderQuestion() {
    if (!running) return;

    if (round >= questionSet.length) {
        endGame(true);
        return;
    }
    

    if (distance >= MAX_DISTANCE) {
      endGame(false);
      return;
    }

    if (lives <= 0) {
      endGame(false);
      return;
    }

    currentQuestion = questionSet[round];
    round++;

    seconds = Math.floor(
      Math.random() * (MAX_SECONDS - MIN_SECONDS + 1)
    ) + MIN_SECONDS;
    lastCountdownSecond = null;
    ui.questionNumber.textContent = `SOAL ${round}`;
    ui.question.textContent = currentQuestion.question;
    ui.answers.replaceChildren();

    
    currentShuffledAnswers = shuffleAnswers(currentQuestion);

    currentShuffledAnswers.forEach((answer, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "game-answer";
    button.textContent = answer.text;

    button.addEventListener("click", () => {
        submitAnswer(index, button);
    });

    ui.answers.appendChild(button);
    });


    setFeedback("Pilih jawaban sebelum robot mendekat!");
    ui.timer.textContent = `${seconds} detik`;
    ui.timerFill.style.width = "100%";

    acceptingAnswer = true;
    deadline = Date.now() + seconds * 1000;

    clearTimer();
    tickId = setInterval(updateTimer, 100);
    updateHUD();
  }

  function updateTimer() {
    if (!running || !acceptingAnswer) return;

    const remaining = Math.max(0, deadline - Date.now());
    const remainingSeconds = Math.ceil(remaining / 1000);

    if (
        remainingSeconds <= 3 &&
        remainingSeconds > 0 &&
        remainingSeconds !== lastCountdownSecond
        ) {
        lastCountdownSecond = remainingSeconds;
        playSfx("tick");
        }

    ui.timer.textContent = `${remainingSeconds} detik`;
    ui.timerFill.style.width =
      `${(remaining / (seconds * 1000)) * 100}%`;

    if (remaining <= 0) {
      playSfx("timeout");
        handleMiss("Waktu habis! Robot berhasil mendekat.");
    }
  }


    
    function submitAnswer(selectedIndex, selectedButton) {
    if (!running || !acceptingAnswer) return;

    clearTimer();

    const correct =
        currentShuffledAnswers[selectedIndex]?.isCorrect;

    if (correct) {
        disableAnswers();
        playSfx("correct");
        selectedButton.classList.add("is-correct");

        setFeedback(
        "Benar! Kamu berhasil menjauh dari robot.",
        "success"
        );

        score += POINTS_PER_ANSWER;
        updateStats();

        window.setTimeout(() => {
        if (!running) return;
        advanceAfterAnswer(true);
        }, 900);
    } else {
        selectedButton.classList.add("is-wrong");
        playSfx("wrong");
        handleMiss("Jawaban salah! Robot semakin dekat.");
    }
    }



  function handleMiss(message) {
    if (!running || !acceptingAnswer) return;

    disableAnswers();
    clearTimer();

    lives = Math.max(0, lives - 1);
    updateHUD();

    setFeedback(message, "error");
    updateHUD();

    
    window.setTimeout(() => {
    if (!running) return;

    if (lives <= 0 || distance >= MAX_DISTANCE) {
        endGame(false);
    } else {
        advanceAfterAnswer(false);
    }
    }, 1100);

  }

  function endGame(won) {
    running = false;
    acceptingAnswer = false;
    clearTimer();
    stopMusic();
    playSfx(won ? "win" : "lose");
    saveHighScore();

    if (won) {
      showOverlay(
        "Kamu berhasil kabur!",
        `Skor akhir: ${score}. Robot tertinggal di ruang server.`,
        "Main lagi"
      );
    } else {
      showOverlay(
        "Robot menang kali ini!",
        `Skor akhir: ${score}. Tarik napas, pelajari soal, lalu coba lagi.`,
        "Coba lagi"
      );
    }

    ui.start.textContent = "Main lagi";
    ui.start.disabled = false;
    ui.restart.disabled = false;
  }

  function startGame() {
    clearTimer();

    unlockAudio().then(() => {
    if (running && !audioMuted) {
        startMusic();
    }
    });
    running = true;
    acceptingAnswer = false;
    lives = MAX_LIVES;
    distance = 0;
    score = 0;
    round = 0;
    musicStep = 0;
    const language = languageSelect?.value || "website";
    const difficulty = difficultySelect?.value || "1";
    const availableQuestions = QUESTION_BANK[language]?.[difficulty] || [];

    if (availableQuestions.length === 0) {
    showOverlay(
        "Soal belum tersedia",
        "Belum ada soal untuk pilihan ini.",
        "Kembali"
    );
    return;
    }

    questionSet = shuffle(availableQuestions);

    ui.start.textContent = "Permainan berjalan";
    ui.start.disabled = true;
    ui.restart.disabled = false;

    updateHUD();
    hideOverlay();
    renderQuestion();
  }

  ui.start.addEventListener("click", startGame);
  ui.restart.addEventListener("click", startGame);
  ui.overlayButton.addEventListener("click", startGame);

  ui.highScore.textContent = getHighScore();
  ui.timer.textContent = "—";
  ui.level.textContent = "1";
  ui.lives.textContent = "♥ ♥ ♥";
  ui.score.textContent = "0";
  ui.distance.style.width = "0%";

  showOverlay(
    "Code Rush: Robot Escape",
    "Jawab soal coding sebelum waktu habis. Jangan biarkan robot penjaga mendekat!",
    "Mulai bermain"
  );
})();
