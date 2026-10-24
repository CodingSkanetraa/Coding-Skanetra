document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.querySelector("#cpp-code");
  const stdinInput = document.querySelector("#cpp-stdin");
  const runButton = document.querySelector("#cpp-run");
  const resetButton = document.querySelector("#cpp-reset");
  const clearButton = document.querySelector("#cpp-clear");
  const output = document.querySelector("#cpp-output");
  const status = document.querySelector("#cpp-status");
  const exampleButtons = document.querySelectorAll("[data-example]");

  if (!textarea || !runButton || !resetButton || !clearButton || !output || !status) return;

  // Logika layanan kompilasi (Wandbox + cadangan) ada di cpp-runner.js.
  const MAX_OUTPUT_CHARS = 20000;
  const initialCode = textarea.value;
  let editor = null;
  let abortController = null;

  const examples = {
    print: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Halo dunia!" << endl;\n    return 0;\n}\n',
    variables: '#include <iostream>\n#include <string>\nusing namespace std;\n\nint main() {\n    string nama = "Kaito";\n    int umur = 17;\n\n    cout << "Nama: " << nama << endl;\n    cout << "Umur: " << umur << endl;\n    return 0;\n}\n',
    input: '#include <iostream>\n#include <string>\nusing namespace std;\n\n// Isi kotak "Input program" dengan satu nama, lalu jalankan.\nint main() {\n    string nama;\n    cin >> nama;\n    cout << "Halo, " << nama << "!" << endl;\n    return 0;\n}\n',
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
        Tab: (cm) => cm.replaceSelection("    ", "end"),
        "Shift-Tab": (cm) => cm.execCommand("indentLess"),
        "Ctrl-Enter": () => runCode(),
        "Cmd-Enter": () => runCode()
      }
    });
    editor.setSize("100%", "390px");
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

  function setCode(code) {
    if (editor) {
      editor.setValue(code);
      editor.focus();
    } else {
      textarea.value = code;
    }
  }

  function clip(text) {
    return text.length > MAX_OUTPUT_CHARS
      ? text.slice(0, MAX_OUTPUT_CHARS) + "\n… (output dipotong, terlalu panjang)"
      : text;
  }

  // Program C++ dikompilasi dan dijalankan di server, jadi seluruh input harus
  // disiapkan sebelum program berjalan (tidak bisa diketik saat program berjalan).
  const INPUT_PATTERN = /\b(cin|getline|scanf|fscanf|gets|fgets|getchar)\b/;
  let inputWarned = false;

  function usesInput(code) {
    const bersih = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    return INPUT_PATTERN.test(bersih);
  }

  if (stdinInput) {
    stdinInput.addEventListener("input", () => {
      inputWarned = false;
      stdinInput.classList.remove("needs-input");
    });
  }

  function finish(message, isError) {
    runButton.disabled = false;
    status.textContent = message;
    output.classList.toggle("is-error", Boolean(isError));
  }

  async function runCode() {
    if (runButton.disabled) return;

    const code = getCode();
    if (!code.trim()) {
      output.textContent = "Kode masih kosong.";
      status.textContent = "Tulis kode dulu.";
      return;
    }
    if (stdinInput && !stdinInput.value.trim() && usesInput(code) && !inputWarned) {
      inputWarned = true;
      stdinInput.classList.add("needs-input");
      stdinInput.focus();
      output.classList.remove("is-error");
      output.textContent = "Program ini membaca input (cin / getline / scanf), tetapi kotak \"Input program\" masih kosong.\n\n" +
        "Isi kotak Input program di bawah editor dengan semua nilai yang akan dibaca, urut sesuai pemanggilan cin. " +
        "Pisahkan dengan spasi atau baris baru. Contoh: Kaito 17\n\n" +
        "Lalu tekan Kompilasi & Jalankan lagi. (Menekan tombolnya sekali lagi tanpa mengisi input akan tetap menjalankan program.)";
      status.textContent = "Isi Input program dulu.";
      return;
    }
    inputWarned = false;
    if (stdinInput) stdinInput.classList.remove("needs-input");
    if (!window.CppRunner) {
      output.textContent = "Modul penjalan C++ gagal dimuat. Muat ulang halaman.";
      finish("Terjadi error.", true);
      return;
    }

    output.classList.remove("is-error");
    output.textContent = "Mengompilasi dan menjalankan…";
    status.textContent = "Sedang diproses…";
    runButton.disabled = true;

    abortController = new AbortController();

    try {
      const result = await window.CppRunner.run(code, stdinInput ? stdinInput.value : "", {
        signal: abortController.signal,
        onStatus: (text) => { status.textContent = text; }
      });

      const parts = [];
      if (result.compilerMessage) parts.push((result.compileFailed ? "Kompilasi gagal:\n" : "Pesan compiler:\n") + result.compilerMessage);
      if (result.stdout) parts.push(result.stdout.trimEnd());
      if (result.stderr) parts.push("stderr:\n" + result.stderr.trimEnd());
      if (result.signal) parts.push("(program dihentikan: " + result.signal + ". Periksa perulangan tanpa akhir atau akses memori yang salah.)");
      if (!parts.length) parts.push("Program selesai tanpa output.");
      if (!result.compileFailed && result.exitCode !== 0) parts.push("(program berakhir dengan kode " + result.exitCode + ")");

      output.textContent = clip(parts.join("\n\n"));
      if (result.compileFailed) finish("Kompilasi gagal.", true);
      else if (result.signal || result.exitCode !== 0) finish("Program berakhir dengan error.", true);
      else finish("Program selesai.", false);
    } catch (error) {
      if (error && error.name === "AbortError") {
        output.textContent = "Proses dibatalkan.";
        finish("Dibatalkan.", true);
      } else {
        const details = error && error.details ? "\n\nRincian:\n- " + error.details.join("\n- ") : "";
        output.textContent = "Layanan kompilasi sedang tidak bisa dihubungi. Periksa koneksi internet, tunggu sebentar, lalu coba lagi. Kodemu tidak hilang." + details;
        finish("Gagal terhubung.", true);
      }
    } finally {
      abortController = null;
    }
  }

  runButton.addEventListener("click", runCode);

  resetButton.addEventListener("click", () => {
    if (abortController) abortController.abort();
    runButton.disabled = false;
    setCode(initialCode);
    if (stdinInput) stdinInput.value = "";
    output.classList.remove("is-error");
    output.textContent = "Output program akan muncul di sini.";
    status.textContent = "Kode dikembalikan ke contoh awal.";
  });

  clearButton.addEventListener("click", () => {
    output.classList.remove("is-error");
    output.textContent = "Output dibersihkan.";
    status.textContent = "Output dibersihkan.";
  });

  exampleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const example = examples[button.dataset.example];
      if (example) {
        setCode(example);
        if (button.dataset.example === "input" && stdinInput && !stdinInput.value) stdinInput.value = "Kaito";
        status.textContent = "Contoh " + button.querySelector("strong").textContent + " dimuat.";
      }
    });
  });

  const year = document.querySelector("#year");
  if (year && !year.textContent) year.textContent = new Date().getFullYear();
});
