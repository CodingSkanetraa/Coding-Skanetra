document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.querySelector("#cpp-code");
  const runButton = document.querySelector("#cpp-run");
  const resetButton = document.querySelector("#cpp-reset");
  const clearButton = document.querySelector("#cpp-clear");
  const output = document.querySelector("#cpp-output");
  const status = document.querySelector("#cpp-status");
  const exampleButtons = document.querySelectorAll("[data-example]");

  if (!textarea || !runButton || !resetButton || !clearButton || !output || !status) return;
  if (!window.CkTerminal) {
    output.textContent = "Modul terminal gagal dimuat. Muat ulang halaman.";
    return;
  }

  // Kotak output berperan sebagai terminal: teks program + kolom ketik untuk cin / getline / scanf.
  const term = window.CkTerminal.create(output);

  // Logika layanan kompilasi (Wandbox + cadangan) ada di cpp-runner.js.
  const MAX_OUTPUT_CHARS = 20000;
  const initialCode = textarea.value;
  let editor = null;
  let abortController = null;
  let saver = null; // pengelola tombol Simpan (lihat bagian "Simpan kode" di bawah)
  let session = 0;

  const examples = {
    print: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Halo dunia!" << endl;\n    return 0;\n}\n',
    variables: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string nama = "Kaito";\n    int umur = 17;\n\n    cout << "Nama: " << nama << endl;\n    cout << "Umur: " << umur << endl;\n    return 0;\n}\n',
    input: '#include <iostream>\n#include <string>\nusing namespace std;\n\n// Ketik namamu langsung di kotak output saat program menunggu.\nint main() {\n    string nama;\n    cin >> nama;\n    cout << "Halo, " << nama << "!" << endl;\n    return 0;\n}\n',
    condition: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int nilai = 82;\n\n    if (nilai >= 75) {\n        cout << "Lulus" << endl;\n    } else {\n        cout << "Belum lulus" << endl;\n    }\n    return 0;\n}\n',
    loop: '#include <iostream>\nusing namespace std;\n\nint main() {\n    for (int i = 1; i <= 3; i++) {\n        cout << "Perulangan ke-" << i << endl;\n    }\n    return 0;\n}\n',
    function: '#include <iostream>\nusing namespace std;\n\nint tambah(int a, int b) {\n    return a + b;\n}\n\nint main() {\n    cout << "3 + 4 = " << tambah(3, 4) << endl;\n    return 0;\n}\n',
    array: '#include <iostream>\n#include <string>\n#include <vector>\nusing namespace std;\n\nint main() {\n    vector<string> buah = {"apel", "jeruk", "mangga"};\n\n    for (const string& item : buah) {\n        cout << item << endl;\n    }\n    cout << "Jumlah buah: " << buah.size() << endl;\n    return 0;\n}\n',
    class: '#include <iostream>\n#include <string>\nusing namespace std;\n\nclass Siswa {\npublic:\n    string nama;\n    int kelas;\n\n    void perkenalan() {\n        cout << "Aku " << nama << ", kelas " << kelas << endl;\n    }\n};\n\nint main() {\n    Siswa s;\n    s.nama = "Kaito";\n    s.kelas = 11;\n    s.perkenalan();\n    return 0;\n}\n'
  };

  if (typeof CodeMirror !== "undefined") {
    editor = CodeMirror.fromTextArea(textarea, {
      mode: "text/x-c++src",
      theme: "material-darker",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      autoCloseBrackets: true,
      matchBrackets: true,
      extraKeys: {
        Tab: (cm) => cm.execCommand("insertSoftTab"),
        "Shift-Tab": (cm) => cm.execCommand("indentLess"),
        "Ctrl-Enter": () => runCode(),
        "Cmd-Enter": () => runCode()
      }
    });
    editor.setSize("100%", "390px");
    if (window.CodingSkanetraEditorPrefs) window.CodingSkanetraEditorPrefs.pasang(editor);
  } else {
    // Cadangan bila CodeMirror gagal dimuat: textarea biasa tetap bisa dipakai.
    textarea.style.cssText = "width:100%;height:390px;box-sizing:border-box;padding:12px;border:0;background:#000;color:#e6e6e6;font:14px/1.65 Consolas,Monaco,monospace;resize:vertical";
    textarea.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        runCode();
      }
    });
  }

  function getCode() {
    return editor ? editor.getValue() : textarea.value;
  }

  function setCode(code, options) {
    if (editor) {
      editor.setValue(code);
      if (!(options && options.quiet)) editor.focus();
    } else {
      textarea.value = code;
    }
    if (saver) saver.refresh();
  }

  // Kode yang pernah disimpan dimuat otomatis saat halaman dibuka.
  let restoredNote = "";
  if (window.CodeStorage) {
    const saved = window.CodeStorage.read("cpp");
    if (saved && typeof saved.data === "string") {
      setCode(saved.data, { quiet: true });
      restoredNote = "Kode tersimpan dimuat (disimpan " + window.CodeStorage.formatTime(saved.savedAt) + ").";
    }
  }

  function clip(text) {
    return text.length > MAX_OUTPUT_CHARS
      ? text.slice(0, MAX_OUTPUT_CHARS) + "\n… (output dipotong, terlalu panjang)"
      : text;
  }

  // Program yang membaca input dijalankan interaktif: setiap jawaban yang diketik di kotak output
  // membuat program dikompilasi dan dijalankan ulang dari awal bersama semua jawaban sebelumnya
  // (lihat cpp-runner.js). Program tanpa input dijalankan sekali saja seperti biasa.
  const INPUT_PATTERN = /\b(cin|getline|scanf|fscanf|gets|fgets|getchar|getc|fgetc)\b/;

  function usesInput(code) {
    const bersih = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    return INPUT_PATTERN.test(bersih);
  }

  function finish(message, isError) {
    runButton.disabled = false;
    status.textContent = message;
    output.classList.toggle("is-error", Boolean(isError));
    if (isError && window.CodingSkanetraError) window.CodingSkanetraError.tampilkan(output, "cpp", output.textContent || "");
  }

  // Menyusun teks output dari hasil kompilasi/eksekusi.
  // Saat program masih menunggu input, teks berhenti tepat di prompt (tanpa dipotong spasinya).
  function describe(result) {
    const parts = [];
    if (result.compilerMessage) parts.push((result.compileFailed ? "Kompilasi gagal:\n" : "Pesan compiler:\n") + result.compilerMessage);
    if (result.needsInput) {
      if (result.stdout) parts.push(result.stdout);
      return clip(parts.join("\n\n"));
    }
    if (result.stdout) parts.push(result.stdout.trimEnd());
    if (result.stderr) parts.push("stderr:\n" + result.stderr.trimEnd());
    if (result.signal) parts.push("(program dihentikan: " + result.signal + ". Periksa perulangan tanpa akhir atau akses memori yang salah.)");
    if (!parts.length) parts.push("Program selesai tanpa output.");
    if (!result.compileFailed && result.exitCode !== 0) parts.push("(program berakhir dengan kode " + result.exitCode + ")");
    return clip(parts.join("\n\n"));
  }

  async function runCode() {
    if (runButton.disabled) return;

    const code = getCode();
    if (!code.trim()) {
      term.show("Kode masih kosong.");
      status.textContent = "Tulis kode dulu.";
      return;
    }
    if (!window.CppRunner) {
      term.show("Modul penjalan C++ gagal dimuat. Muat ulang halaman.");
      finish("Terjadi error.", true);
      return;
    }

    const token = ++session;
    term.cancel();
    const interactive = usesInput(code);
    const answers = [];
    let eof = false;

    output.classList.remove("is-error");
    term.show("Mengompilasi dan menjalankan…");
    status.textContent = "Sedang diproses…";
    runButton.disabled = true;

    try {
      for (;;) {
        abortController = new AbortController();
        const options = {
          signal: abortController.signal,
          onStatus: (text) => { if (token === session) status.textContent = text; }
        };
        const result = interactive
          ? await window.CppRunner.runInteractive(code, answers, eof, options)
          : await window.CppRunner.run(code, "", options);
        if (token !== session) return;

        if (result.needsInput) {
          // Program menunggu input: tampilkan kolom ketik di ujung output.
          status.textContent = "Program menunggu input. Ketik di kotak output lalu tekan Enter.";
          runButton.disabled = false;
          const reply = await term.prompt(describe(result));
          if (reply === null || token !== session) return;
          runButton.disabled = true;
          if (reply.eof) eof = true;
          else answers.push(reply.line);
          status.textContent = "Menjalankan ulang dengan jawabanmu…";
          continue;
        }

        term.show(describe(result));
        if (result.compileFailed) finish("Kompilasi gagal.", true);
        else if (result.signal || result.exitCode !== 0) finish("Program berakhir dengan error.", true);
        else finish("Program selesai.", false);
        return;
      }
    } catch (error) {
      if (token !== session) return;
      if (error && error.name === "AbortError") {
        term.show("Proses dibatalkan.");
        finish("Dibatalkan.", true);
      } else {
        const details = error && error.details ? "\n\nRincian:\n- " + error.details.join("\n- ") : "";
        term.show("Layanan kompilasi sedang tidak bisa dihubungi. Periksa koneksi internet, tunggu sebentar, lalu coba lagi. Kodemu tidak hilang." + details);
        finish("Gagal terhubung.", true);
      }
    } finally {
      abortController = null;
      if (token === session) runButton.disabled = false;
    }
  }

  // Unduh kode C++ yang sedang diedit sebagai file sumber (.cpp).
  const downloadButton = document.querySelector("#cpp-download");
  if (downloadButton) {
    downloadButton.addEventListener("click", () => {
      const blob = new Blob(["\uFEFF", getCode()], { type: "text/x-c++src;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "main.cpp";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = "File C++ berhasil disiapkan untuk diunduh.";
    });
  }

  runButton.addEventListener("click", runCode);

  resetButton.addEventListener("click", () => {
    session++;
    if (abortController) abortController.abort();
    term.cancel();
    runButton.disabled = false;
    setCode(initialCode);
    output.classList.remove("is-error");
    term.show("Output program akan muncul di sini.");
    status.textContent = "Kode dikembalikan ke contoh awal.";
  });

  clearButton.addEventListener("click", () => {
    session++;
    if (abortController) abortController.abort();
    term.cancel();
    runButton.disabled = false;
    output.classList.remove("is-error");
    term.show("Output dibersihkan.");
    status.textContent = "Output dibersihkan.";
  });

  exampleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const example = examples[button.dataset.example];
      if (example) {
        setCode(example);
        status.textContent = "Contoh " + button.querySelector("strong").textContent + " dimuat.";
      }
    });
  });

  // ---------- Simpan kode di browser ini ----------
  // Tombol Simpan (atau Ctrl + S) menyimpan kode di browser ini dan memuatnya lagi saat halaman dibuka.
  const saveButton = document.querySelector("#cpp-save");
  if (saveButton && window.CodeStorage) {
    saver = window.CodeStorage.bindButton({
      button: saveButton,
      getKey: () => "cpp",
      getData: getCode,
      notify: (pesan) => { status.textContent = pesan; },
      successMessage: () => "Kode C++ disimpan di browser ini."
    });
    if (editor) {
      editor.on("change", () => saver.refresh());
      editor.addKeyMap({
        "Ctrl-S": () => { saver.save(); },
        "Cmd-S": () => { saver.save(); }
      });
    } else {
      textarea.addEventListener("input", () => saver.refresh());
      window.CodeStorage.bindShortcut(textarea, saver.save);
    }
    saver.refresh();
    if (restoredNote) status.textContent = restoredNote;
  }

  // Tombol Bagikan dan Mode fokus (js/editor-alat.js).
  if (window.CodingSkanetraAlat && saveButton) {
    window.CodingSkanetraAlat.daftar({
      jenis: "cpp",
      tombolSimpan: saveButton,
      ambil: () => ({ k: getCode() }),
      terapkan: (d) => setCode(String((d && d.k) || ""), { quiet: true }),
      beritahu: (pesan) => { status.textContent = pesan; }
    });
  }

  const year = document.querySelector("#year");
  if (year && !year.textContent) year.textContent = new Date().getFullYear();
});
