/* Penjelas error ramah: mengubah pesan error Python, C++, dan JavaScript menjadi penjelasan sederhana.
   Berbasis aturan (tanpa AI, tanpa internet). Dipakai oleh editor Python, C++, dan HTML. */
(() => {
  const q = (s) => "“" + s + "”";

  /* ---------------- Python ---------------- */
  const PY = [
    [/IndentationError: expected an indented block/i, () => ({
      judul: "Kurang menjorok (indentasi)",
      isi: "Setelah baris berakhiran titik dua (:) seperti if, for, while, atau def, isinya harus digeser ke kanan.",
      saran: "Tambahkan 4 spasi (atau tekan Tab) di awal baris setelahnya.",
      singkat: "Baris setelah titik dua (:) harus digeser ke kanan ya."
    })],
    [/IndentationError: unexpected indent/i, () => ({
      judul: "Ada spasi di awal yang tidak perlu",
      isi: "Baris ini menjorok ke kanan padahal tidak berada di dalam blok mana pun.",
      saran: "Hapus spasi di awal baris itu supaya sejajar dengan baris di atasnya.",
      singkat: "Ada spasi berlebih di awal baris."
    })],
    [/(IndentationError|TabError):.*(unindent|inconsistent)/i, () => ({
      judul: "Jorokan tidak sejajar",
      isi: "Letak awal barismu tidak sama dengan baris-baris lain dalam satu blok.",
      saran: "Samakan jumlah spasinya. Jangan campur Tab dengan spasi.",
      singkat: "Jorokan barisnya belum sejajar."
    })],
    [/SyntaxError: expected ':'/i, () => ({
      judul: "Kurang titik dua (:)",
      isi: "Baris if, else, for, while, def, dan class harus diakhiri tanda titik dua.",
      saran: "Tambahkan : di ujung baris itu.",
      singkat: "Sepertinya kurang titik dua (:) di akhir baris."
    })],
    [/SyntaxError: unterminated (triple-quoted )?string/i, () => ({
      judul: "Tanda kutip belum ditutup",
      isi: "Teks harus diapit dua tanda kutip yang sama, di awal dan di akhir.",
      saran: "Tambahkan tanda kutip penutup (\" atau ') di ujung teksnya.",
      singkat: "Tanda kutip teksnya belum ditutup."
    })],
    [/SyntaxError: '([\(\[\{])' was never closed/i, (m) => ({
      judul: "Kurung " + q(m[1]) + " belum ditutup",
      isi: "Setiap kurung buka harus punya pasangan kurung tutup.",
      saran: "Cek barisnya dan tambahkan kurung penutupnya.",
      singkat: "Ada kurung yang belum ditutup."
    })],
    [/SyntaxError: unmatched '([\)\]\}])'/i, (m) => ({
      judul: "Kurung tutup " + q(m[1]) + " berlebih",
      isi: "Ada kurung tutup yang tidak punya pasangan kurung buka.",
      saran: "Hapus yang berlebih, atau tambahkan kurung bukanya.",
      singkat: "Ada kurung tutup yang berlebih."
    })],
    [/SyntaxError: Missing parentheses in call to 'print'/i, () => ({
      judul: "print harus pakai kurung",
      isi: "Di Python 3, print dipakai seperti fungsi.",
      saran: "Tulis print(\"teksmu\") dengan kurung.",
      singkat: "Tulis print dengan kurung: print(\"...\")."
    })],
    [/SyntaxError: invalid syntax. Maybe you meant '==' or ':=' instead of '='/i, () => ({
      judul: "Membandingkan pakai ==",
      isi: "Satu tanda = dipakai untuk mengisi nilai. Untuk membandingkan dua nilai (misalnya di if), pakai dua tanda ==.",
      saran: "Ganti = dengan == pada baris itu.",
      singkat: "Untuk membandingkan, pakai == bukan =."
    })],
    [/SyntaxError: cannot assign to/i, () => ({
      judul: "Tidak bisa mengisi nilai ke sini",
      isi: "Sisi kiri tanda = harus berupa nama variabel, bukan angka, teks, atau hasil hitungan.",
      saran: "Contoh yang benar: umur = 17.",
      singkat: "Sisi kiri tanda = harus nama variabel."
    })],
    [/SyntaxError: invalid decimal literal/i, () => ({
      judul: "Nama variabel tidak boleh diawali angka",
      isi: "Nama variabel tidak boleh dimulai dengan angka atau mengandung spasi.",
      saran: "Pakai huruf di awal, misalnya nilai1 atau nilai_1.",
      singkat: "Nama variabel tidak boleh diawali angka."
    })],
    [/SyntaxError/i, () => ({
      judul: "Penulisan kodenya belum tepat",
      isi: "Python tidak bisa membaca baris ini. Biasanya kurang tanda baca (titik dua, kurung, atau kutip) di baris itu atau baris sebelumnya.",
      saran: "Bandingkan dengan contoh yang berjalan, dan periksa kurung serta kutipnya satu per satu.",
      singkat: "Ada kesalahan penulisan. Cek kurung, kutip, dan titik dua."
    })],
    [/NameError: name '([^']+)' is not defined(?:\. Did you mean: '([^']+)'\?)?/i, (m) => ({
      judul: "Nama " + q(m[1]) + " belum dikenal",
      isi: "Python belum tahu apa itu " + m[1] + ". Penyebab yang sering: salah ketik, huruf besar dan kecil berbeda (Python membedakannya), atau variabelnya belum dibuat sebelum dipakai." + (m[2] ? " Maksudmu " + q(m[2]) + "?" : ""),
      saran: "Kalau maksudmu teks, tulis dengan kutip: \"" + m[1] + "\". Kalau variabel, isi dulu, misalnya " + m[1] + " = 5.",
      singkat: "Nama " + m[1] + " belum dibuat atau salah ketik." + (m[2] ? " Maksudmu " + m[2] + "?" : "")
    })],
    [/UnboundLocalError: .*'([^']+)'/i, (m) => ({
      judul: "Variabel " + q(m[1]) + " dipakai sebelum diberi nilai",
      isi: "Di dalam fungsi, variabel yang diubah dianggap variabel lokal sehingga belum punya nilai.",
      saran: "Beri nilai awal di dalam fungsi, atau tulis global " + m[1] + " di awal fungsi.",
      singkat: "Variabel " + m[1] + " belum punya nilai di dalam fungsi ini."
    })],
    [/TypeError: can only concatenate str \(not "(\w+)"\) to str/i, (m) => ({
      judul: "Teks tidak bisa langsung digabung dengan " + (m[1] === "int" ? "angka" : m[1]),
      isi: "Operator + untuk teks hanya bisa menggabung teks dengan teks.",
      saran: "Ubah dulu pakai str(), misalnya \"Umur: \" + str(umur). Atau pakai f-string: f\"Umur: {umur}\".",
      singkat: "Ubah angkanya dulu pakai str() sebelum digabung dengan teks."
    })],
    [/TypeError: unsupported operand type\(s\) for ([^:]+): '(\w+)' and '(\w+)'/i, (m) => ({
      judul: "Dua jenis nilai ini tidak bisa dioperasikan",
      isi: "Kamu memakai " + m[1].trim() + " pada " + m[2] + " dan " + m[3] + ". Hasil input() itu selalu teks (str), meski yang diketik angka.",
      saran: "Ubah dulu jenisnya dengan int() atau float(), misalnya umur = int(input()).",
      singkat: "Jenis nilainya beda. Coba ubah dengan int() atau float()."
    })],
    [/TypeError: '(<|>|<=|>=)' not supported between instances of '(\w+)' and '(\w+)'/i, (m) => ({
      judul: "Tidak bisa membandingkan " + m[2] + " dengan " + m[3],
      isi: "Teks dan angka tidak bisa dibandingkan. Ingat, input() selalu menghasilkan teks.",
      saran: "Ubah dulu pakai int() atau float() sebelum dibandingkan.",
      singkat: "Ubah dulu pakai int() sebelum membandingkan dengan angka."
    })],
    [/TypeError: can't multiply sequence by non-int/i, () => ({
      judul: "Teks hanya bisa dikali bilangan bulat",
      isi: "Teks bisa diulang dengan * tetapi pengalinya harus bilangan bulat.",
      saran: "Pastikan pengalinya int, misalnya \"ha\" * int(n).",
      singkat: "Pengali teks harus bilangan bulat (int)."
    })],
    [/TypeError: '(\w+)' object is not callable/i, (m) => ({
      judul: "Kamu memanggil " + m[1] + " seperti fungsi",
      isi: "Ada tanda kurung ( ) di belakang sesuatu yang bukan fungsi. Sering terjadi saat variabel diberi nama yang sama dengan fungsi bawaan (seperti str, sum, list, max).",
      saran: "Ganti nama variabelnya, atau periksa tanda kurung yang tidak perlu.",
      singkat: "Ada ( ) setelah sesuatu yang bukan fungsi."
    })],
    [/TypeError: (\w+)\(\) takes (\d+) positional arguments? but (\d+) (?:was|were) given/i, (m) => ({
      judul: "Jumlah isian fungsi " + m[1] + "() tidak cocok",
      isi: "Fungsi itu meminta " + m[2] + " nilai, tetapi kamu memberi " + m[3] + ".",
      saran: "Samakan jumlah nilai yang kamu kirim dengan yang diminta saat fungsi dibuat (def).",
      singkat: "Jumlah nilai yang dikirim ke " + m[1] + "() belum pas."
    })],
    [/TypeError: (\w+)\(\) missing (\d+) required positional argument/i, (m) => ({
      judul: "Fungsi " + m[1] + "() kurang isian",
      isi: "Fungsi ini butuh " + m[2] + " nilai lagi saat dipanggil.",
      saran: "Tambahkan nilai yang kurang di dalam kurung saat memanggilnya.",
      singkat: "Fungsi " + m[1] + "() masih kurang isian."
    })],
    [/TypeError: 'NoneType' object/i, () => ({
      judul: "Nilainya kosong (None)",
      isi: "Kamu memakai sesuatu yang isinya None. Biasanya karena fungsi tidak memakai return, atau hasil dari .sort() dan .append() dipakai sebagai nilai.",
      saran: "Pastikan fungsinya mengembalikan nilai dengan return. Jangan tulis x = x.sort().",
      singkat: "Isinya None. Mungkin lupa return di fungsi?"
    })],
    [/TypeError: '(\w+)' object is not (iterable|subscriptable)/i, (m) => ({
      judul: m[1] + " tidak bisa " + (m[2] === "iterable" ? "diulang dengan for" : "diambil isinya dengan [ ]"),
      isi: "Jenis nilai " + m[1] + " tidak mendukung cara itu.",
      saran: m[1] === "int" ? "Untuk mengulang sebanyak n kali, pakai for i in range(n)." : "Periksa apakah variabelnya benar-benar daftar (list) atau teks.",
      singkat: "Jenis " + m[1] + " tidak bisa dipakai seperti itu."
    })],
    [/TypeError: (list|string) indices must be integers/i, () => ({
      judul: "Nomor urut harus bilangan bulat",
      isi: "Isi daftar atau teks diambil lewat nomor urut bulat, bukan teks atau pecahan.",
      saran: "Pakai int(...) atau perbaiki nilai di dalam [ ].",
      singkat: "Nomor urut di [ ] harus bilangan bulat."
    })],
    [/ValueError: invalid literal for int\(\) with base 10: (.+)/i, (m) => ({
      judul: "Tidak bisa diubah jadi bilangan bulat",
      isi: "int() hanya bisa mengubah teks yang isinya angka bulat saja. Kamu memberinya " + m[1] + ".",
      saran: "Pastikan yang diketik hanya angka (tanpa spasi, huruf, atau koma).",
      singkat: "Isinya bukan angka bulat, jadi int() gagal."
    })],
    [/ValueError: could not convert string to float: (.+)/i, (m) => ({
      judul: "Tidak bisa diubah jadi angka desimal",
      isi: "float() hanya bisa mengubah teks seperti 3.14 (pakai titik, bukan koma). Kamu memberinya " + m[1] + ".",
      saran: "Periksa isinya, dan pakai titik untuk desimal.",
      singkat: "Isinya bukan angka desimal yang benar."
    })],
    [/ValueError: (too many|not enough) values to unpack/i, () => ({
      judul: "Jumlah nilai dan variabel tidak sama",
      isi: "Kamu membagi sekumpulan nilai ke beberapa variabel, tapi jumlahnya tidak pas.",
      saran: "Samakan jumlah variabel di kiri dengan jumlah nilai di kanan.",
      singkat: "Jumlah nilai dan variabelnya belum sama."
    })],
    [/ZeroDivisionError/i, () => ({
      judul: "Dibagi nol",
      isi: "Pembagian dengan nol tidak bisa dihitung.",
      saran: "Pastikan pembaginya bukan 0, misalnya dengan if pembagi != 0:.",
      singkat: "Ada pembagian dengan nol."
    })],
    [/IndexError: (list|string|tuple) index out of range/i, () => ({
      judul: "Nomor urut di luar jangkauan",
      isi: "Kamu mengambil urutan yang tidak ada. Urutan dimulai dari 0, jadi daftar berisi 3 item punya nomor 0, 1, 2 saja.",
      saran: "Cek len(daftar) dan batas perulanganmu.",
      singkat: "Nomor urutnya melewati isi daftar. Ingat mulai dari 0."
    })],
    [/KeyError: (.+)/i, (m) => ({
      judul: "Kunci " + m[1] + " tidak ada di dictionary",
      isi: "Dictionary tidak punya kunci itu. Huruf besar dan kecil juga dibedakan.",
      saran: "Periksa ejaannya, atau pakai nama.get(" + m[1] + ") supaya tidak error.",
      singkat: "Kunci " + m[1] + " tidak ada di dictionary."
    })],
    [/AttributeError: '(\w+)' object has no attribute '(\w+)'/i, (m) => ({
      judul: m[1] + " tidak punya " + q(m[2]),
      isi: "Jenis nilai " + m[1] + " tidak memiliki fungsi atau sifat bernama " + m[2] + ". Mungkin salah ketik atau salah jenis.",
      saran: "Cek ejaan (huruf besar kecil berpengaruh), atau pastikan variabelnya berjenis yang benar.",
      singkat: m[1] + " tidak punya " + m[2] + ". Cek ejaannya."
    })],
    [/ModuleNotFoundError: No module named '([^']+)'/i, (m) => ({
      judul: "Modul " + q(m[1]) + " tidak tersedia",
      isi: "Editor ini berjalan di browser, jadi tidak semua modul tambahan tersedia. Mungkin juga salah ketik.",
      saran: "Pakai modul bawaan Python seperti math, random, atau datetime, dan periksa ejaannya.",
      singkat: "Modul " + m[1] + " belum ada di editor ini."
    })],
    [/RecursionError/i, () => ({
      judul: "Fungsi memanggil dirinya terus-menerus",
      isi: "Fungsi rekursif tidak punya kondisi berhenti, atau kondisinya tidak pernah tercapai.",
      saran: "Tambahkan kondisi dasar (if ...: return ...) yang akan menghentikan panggilan.",
      singkat: "Fungsinya memanggil dirinya tanpa berhenti."
    })],
    [/EOFError/i, () => ({
      judul: "input() tidak mendapat jawaban",
      isi: "Program meminta input, tetapi masukannya sudah habis atau dibatalkan.",
      saran: "Jalankan lagi, lalu ketik jawabannya dan tekan Enter.",
      singkat: "Program menunggu input yang belum diketik."
    })],
    [/(FileNotFoundError|PermissionError)/i, () => ({
      judul: "File tidak bisa dibuka",
      isi: "Editor ini berjalan di browser dan tidak bisa membaca file dari komputermu.",
      saran: "Pakai teks langsung di dalam kode untuk latihan.",
      singkat: "Editor di browser tidak bisa membuka file komputer."
    })]
  ];

  /* ---------------- C++ (pesan g++) ---------------- */
  const CPP = [
    [/stray '\\\d+' in program|extended character|invalid character/i, () => ({
      judul: "Ada karakter aneh di kode",
      isi: "Biasanya muncul kalau kode disalin dari WhatsApp, Word, atau web, sehingga tanda kutip berubah menjadi kutip melengkung (“ ”).",
      saran: "Hapus lalu ketik ulang tanda kutip dan tanda baca di baris itu langsung dari keyboard.",
      singkat: "Ada karakter aneh, ketik ulang tanda kutipnya."
    })],
    [/missing terminating " character|missing terminating ' character/i, () => ({
      judul: "Tanda kutip belum ditutup",
      isi: "Teks harus diapit kutip dua di awal dan di akhir.",
      saran: "Tambahkan tanda kutip penutup di ujung teksnya.",
      singkat: "Tanda kutip teksnya belum ditutup."
    })],
    [/expected '[;]' (before|after|at end)/i, () => ({
      judul: "Kurang titik koma (;)",
      isi: "Hampir setiap perintah di C++ harus diakhiri titik koma. Kesalahannya sering ada di baris sebelum yang ditunjuk compiler.",
      saran: "Cek akhir baris yang ditunjuk dan baris di atasnya, lalu tambahkan ;.",
      singkat: "Sepertinya kurang titik koma (;) di akhir baris."
    })],
    [/expected '\}' at end of input/i, () => ({
      judul: "Kurang kurung kurawal tutup }",
      isi: "Ada { yang belum punya pasangan }.",
      saran: "Hitung kurung kurawalnya, setiap { harus punya }.",
      singkat: "Ada { yang belum ditutup dengan }."
    })],
    [/'(cout|cin|endl|cerr)' was not declared|'(string|vector|map|set)' (was not declared|does not name a type)/i, (m) => ({
      judul: "Kamu belum menyiapkan " + (m[1] || m[2]),
      isi: "Perintah " + (m[1] || m[2]) + " berasal dari pustaka standar C++.",
      saran: "Tambahkan di paling atas: #include <iostream> (untuk cout/cin), #include <string>, atau #include <vector>, lalu tulis using namespace std;.",
      singkat: "Tambah #include di atas dan using namespace std;."
    })],
    [/'([^']+)' was not declared in this scope/i, (m) => ({
      judul: "Nama " + q(m[1]) + " belum dikenal",
      isi: "Variabel atau fungsi " + m[1] + " belum dibuat sebelum dipakai, atau salah ketik. C++ membedakan huruf besar dan kecil.",
      saran: "Buat dulu, misalnya int " + m[1] + " = 0;, dan periksa ejaannya.",
      singkat: "Nama " + m[1] + " belum dibuat atau salah ketik."
    })],
    [/no match for 'operator(<<|>>)'/i, (m) => ({
      judul: "Tanda " + m[1] + " dipakai tidak pas",
      isi: "cout memakai << (menunjuk ke arah cout) dan cin memakai >> (menunjuk ke arah variabel).",
      saran: "Cek arah panahnya: cout << x; dan cin >> x;.",
      singkat: "Cek arah << untuk cout dan >> untuk cin."
    })],
    [/expected primary-expression before/i, () => ({
      judul: "Ada yang kurang atau berlebih di ungkapan ini",
      isi: "Compiler menemukan tanda atau kata di tempat yang tidak sesuai, misalnya operator berurutan atau kurung kosong.",
      saran: "Periksa tanda baca di sekitar baris itu.",
      singkat: "Ada tanda baca yang berlebih atau kurang."
    })],
    [/expected '\)' before|expected '\(' before|expected ',' or ';'/i, () => ({
      judul: "Kurung atau pemisah belum lengkap",
      isi: "Biasanya ada kurung ( ) yang belum ditutup atau koma yang kurang.",
      saran: "Hitung kurung buka dan kurung tutupnya pada baris itu.",
      singkat: "Cek pasangan kurung ( ) di baris itu."
    })],
    [/invalid conversion from|cannot convert|conversion from/i, () => ({
      judul: "Jenis data tidak cocok",
      isi: "Kamu mengisi variabel dengan jenis nilai yang berbeda, misalnya teks ke dalam int.",
      saran: "Samakan jenisnya, misalnya int untuk bilangan bulat dan string untuk teks.",
      singkat: "Jenis datanya tidak cocok (int/string)."
    })],
    [/redeclaration|redefinition|conflicting declaration/i, () => ({
      judul: "Nama dibuat dua kali",
      isi: "Variabel dengan nama yang sama dideklarasikan lebih dari sekali dalam satu bagian.",
      saran: "Hapus tulisan jenis (int, string) pada kedua kalinya: cukup beri nilai baru.",
      singkat: "Nama variabel itu sudah dipakai di atas."
    })],
    [/too (few|many) arguments to function/i, () => ({
      judul: "Jumlah isian fungsi tidak pas",
      isi: "Fungsi dipanggil dengan nilai yang terlalu " + "sedikit atau banyak dibanding saat dibuat.",
      saran: "Samakan jumlah dan jenis nilainya dengan definisi fungsi.",
      singkat: "Jumlah nilai untuk fungsinya belum pas."
    })],
    [/undefined reference to `?(WinMain|main)/i, () => ({
      judul: "Fungsi main tidak ditemukan",
      isi: "Setiap program C++ harus punya fungsi main sebagai titik mulainya.",
      saran: "Tambahkan int main() { ... return 0; }.",
      singkat: "Program belum punya fungsi main()."
    })],
    [/'main' must return 'int'/i, () => ({
      judul: "main harus mengembalikan int",
      isi: "Fungsi main ditulis dengan jenis lain, misalnya void.",
      saran: "Tulis int main() dan akhiri dengan return 0;.",
      singkat: "Tulis int main(), bukan void main()."
    })]
  ];

  /* ---------------- JavaScript (pesan browser) ---------------- */
  const JS = [
    [/ReferenceError: (\S+) is not defined/i, (m) => ({
      judul: "Nama " + q(m[1]) + " belum dikenal",
      isi: m[1] + " belum dibuat, salah ketik, atau huruf besar dan kecilnya berbeda (JavaScript membedakannya).",
      saran: "Buat dulu dengan let " + m[1] + " = ..., atau periksa ejaannya.",
      singkat: "Nama " + m[1] + " belum dibuat atau salah ketik."
    })],
    [/Cannot (read|set) properties of (null|undefined)(?: \((?:reading|setting) '([^']+)'\))?/i, (m) => ({
      judul: "Elemennya tidak ditemukan",
      isi: "Kodemu memakai sesuatu yang kosong (" + m[2] + ")" + (m[3] ? " untuk mengakses " + q(m[3]) : "") + ". Paling sering: id di getElementById / querySelector salah ketik, atau script berjalan sebelum elemen HTML-nya ada.",
      saran: "Cek id atau class elemennya di HTML, dan taruh <script> setelah elemen tersebut.",
      singkat: "Elemen tidak ditemukan. Cek id atau class-nya."
    })],
    [/(\S+) is not a function/i, (m) => ({
      judul: q(m[1]) + " bukan fungsi",
      isi: "Kamu memanggil " + m[1] + " dengan ( ) padahal itu bukan fungsi, atau namanya salah ketik.",
      saran: "Periksa ejaannya dan pastikan fungsinya sudah dibuat.",
      singkat: m[1] + " bukan fungsi. Cek ejaannya."
    })],
    [/Assignment to constant variable/i, () => ({
      judul: "const tidak bisa diubah",
      isi: "Variabel yang dibuat dengan const nilainya tetap.",
      saran: "Ganti const menjadi let kalau nilainya perlu berubah.",
      singkat: "Ganti const jadi let kalau nilainya mau diubah."
    })],
    [/Identifier '([^']+)' has already been declared/i, (m) => ({
      judul: "Nama " + q(m[1]) + " dibuat dua kali",
      isi: "let atau const dengan nama yang sama tidak boleh ditulis dua kali.",
      saran: "Hapus let/const pada yang kedua, atau pakai nama lain.",
      singkat: "Nama " + m[1] + " sudah dipakai."
    })],
    [/Unexpected end of input|missing \) after argument list|Unexpected token '?\}'?/i, () => ({
      judul: "Kurung atau kurawal belum lengkap",
      isi: "Ada ( ) { } yang belum berpasangan.",
      saran: "Hitung pasangan kurungnya, mulai dari bagian paling atas.",
      singkat: "Ada kurung yang belum berpasangan."
    })],
    [/Invalid or unexpected token|Unexpected (identifier|string|token)/i, () => ({
      judul: "Ada tanda yang salah tempat",
      isi: "Biasanya kurang koma, kurang titik koma, atau tanda kutip tidak berpasangan di dekat baris itu.",
      saran: "Periksa baris itu dan baris sebelumnya.",
      singkat: "Ada tanda baca yang salah tempat."
    })]
  ];

  const ATURAN = { python: PY, cpp: CPP, js: JS };

  function cariBaris(bahasa, teks) {
    let m;
    if (bahasa === "python") {
      const semua = Array.from(teks.matchAll(/File "([^"]*)", line (\d+)/g)).filter((x) => !/\/lib\/python|site-packages/.test(x[1]));
      const exec = semua.filter((x) => /exec|<string>|main/.test(x[1]));
      const pilih = (exec.length ? exec : semua).pop();
      return pilih ? Number(pilih[2]) : null;
    }
    if (bahasa === "cpp") {
      m = teks.match(/(?:main\.cpp|prog\.cc|[\w.]+\.(?:cpp|cc)):(\d+):(?:\d+:)?\s*(?:fatal )?error/i);
      return m ? Number(m[1]) : null;
    }
    m = teks.match(/\(baris (\d+)/i);
    return m ? Number(m[1]) : null;
  }

  // Mengembalikan { judul, isi, saran, singkat, baris } atau null bila tidak ada aturan yang cocok.
  function jelaskan(bahasa, teks) {
    const aturan = ATURAN[bahasa];
    if (!aturan || typeof teks !== "string" || !teks.trim()) return null;
    let sumber = teks;
    if (bahasa === "python") {
      const baris = teks.trim().split("\n").filter((x) => x.trim());
      sumber = baris.slice(-3).join("\n"); // baris terakhir memuat jenis error
    } else if (bahasa === "cpp") {
      const i = teks.search(/error:/i);
      sumber = i >= 0 ? teks.slice(i, i + 500) : teks;
    }
    for (const [pola, buat] of aturan) {
      const m = sumber.match(pola);
      if (m) {
        const info = buat(m);
        info.baris = cariBaris(bahasa, teks);
        return info;
      }
    }
    return null;
  }

  /* ---------------- Tampilan ---------------- */
  const EXTRA = new WeakMap();

  function hapus(output) {
    const lama = EXTRA.get(output);
    if (lama) { lama.remove(); EXTRA.delete(output); }
  }

  function tampilkan(output, bahasa, teks) {
    hapus(output);
    const info = jelaskan(bahasa, teks);
    if (!info) return null;

    const kotak = document.createElement("div");
    kotak.className = "error-ramah";
    kotak.setAttribute("role", "note");
    const judul = document.createElement("strong");
    judul.textContent = "💡 " + info.judul;
    const isi = document.createElement("p");
    isi.textContent = info.isi;
    const saran = document.createElement("p");
    saran.className = "er-saran";
    saran.textContent = "Coba: " + info.saran;
    kotak.append(judul, isi, saran);
    if (info.baris) {
      const baris = document.createElement("span");
      baris.className = "er-baris";
      baris.textContent = "Lihat sekitar baris " + info.baris;
      kotak.appendChild(baris);
    }
    output.insertAdjacentElement("afterend", kotak);
    EXTRA.set(output, kotak);

    // Hilang sendiri saat output tidak lagi berstatus error (program dijalankan ulang).
    const amat = new MutationObserver(() => {
      if (!output.classList.contains("is-error")) { hapus(output); amat.disconnect(); }
    });
    amat.observe(output, { attributes: true, attributeFilter: ["class"] });

    document.dispatchEvent(new CustomEvent("skani:ucap", { detail: { jenis: "semangat", teks: info.singkat } }));
    return info;
  }

  window.CodingSkanetraError = { jelaskan, tampilkan, hapus };
})();
