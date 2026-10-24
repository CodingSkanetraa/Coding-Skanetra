document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.querySelector("#python-code");
  const runButton = document.querySelector("#py-run");
  const resetButton = document.querySelector("#py-reset");
  const clearButton = document.querySelector("#py-clear");
  const output = document.querySelector("#py-output");
  const consoleModeButton = document.querySelector("#py-mode-console");
  const visualModeButton = document.querySelector("#py-mode-visual");
  const visualWrap = document.querySelector("#py-visual-wrap");
  const canvas = document.querySelector("#py-canvas");
  const status = document.querySelector("#py-status");
  const runtimeStatus = document.querySelector("#py-runtime-status");
  const exampleButtons = document.querySelectorAll("[data-example]");
  const stdinInput = document.querySelector("#py-stdin");

  if (!textarea || !runButton || !resetButton || !clearButton || !output || !status || !runtimeStatus) return;

  const initialCode = textarea.value;
  let editor = null;
  let pyodide = null;
  let pyodideLoading = null;
  let outputMode = "console";
  const canvasContext = canvas ? canvas.getContext("2d") : null;

  const visualExample = `# Gambar sederhana dengan Python
bersihkan("#101814")
lingkaran(320, 180, 90, "#74d49a")
lingkaran(290, 155, 10, "#101814")
lingkaran(350, 155, 10, "#101814")
garis(280, 220, 360, 220, "#101814", 5)
teks("Halo, Visual Python!", 320, 320, "#ffffff", 24)`;

  const examples = {
    print: 'print("Halo dunia!")',
    variables: 'nama = "Kaito"\numur = 17\nprint("Nama:", nama)\nprint("Umur:", umur)',
    condition: 'nilai = 82\n\nif nilai >= 75:\n    print("Lulus")\nelse:\n    print("Belum lulus")',
    loop: 'for i in range(1, 4):\n    print("Perulangan ke-", i)',
    function: 'def sapa(nama):\n    return "Halo, " + nama + "!"\n\nprint(sapa("Kaito"))',
    list: 'buah = ["apel", "jeruk", "mangga"]\n\nfor item in buah:\n    print(item)',
    input: 'nama = input("Siapa namamu? ")\nprint("Halo, " + nama + "!")',
    number: 'a = int(input("Angka pertama: "))\nb = int(input("Angka kedua: "))\nprint("Hasil penjumlahan:", a + b)'
  };

  if (typeof CodeMirror !== "undefined") {
    editor = CodeMirror.fromTextArea(textarea, {
      mode: "python",
      theme: "material-darker",
      lineNumbers: true,
      indentUnit: 4,
      tabSize: 4,
      indentWithTabs: false,
      lineWrapping: false,
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
  }

  function getCode() {
    return editor ? editor.getValue() : textarea.value;
  }

  function setCode(code) {
    if (editor) editor.setValue(code);
    else textarea.value = code;
    if (editor) editor.focus();
  }

  // Setiap mode punya kode sendiri (seperti tab HTML dan CSS di editor web):
  // pindah mode tidak menimpa kode mode lainnya.
  const modeCodes = { console: initialCode, visual: visualExample };
  const modeDefaults = { console: initialCode, visual: visualExample };

  function setOutputMode(mode) {
    if (mode !== outputMode) {
      modeCodes[outputMode] = getCode();
      outputMode = mode;
      setCode(modeCodes[mode]);
    }
    const visual = mode === "visual";
    if (consoleModeButton) {
      consoleModeButton.classList.toggle("is-active", !visual);
      consoleModeButton.setAttribute("aria-pressed", String(!visual));
    }
    if (visualModeButton) {
      visualModeButton.classList.toggle("is-active", visual);
      visualModeButton.setAttribute("aria-pressed", String(visual));
    }
    output.hidden = visual;
    if (visualWrap) visualWrap.hidden = !visual;
    if (visual && canvasContext) {
      canvasContext.fillStyle = "#101814";
      canvasContext.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (visual && editor) editor.refresh();
  }

  function clearCanvas(color = "#101814") {
    if (!canvasContext || !canvas) return;
    canvasContext.fillStyle = color;
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);
  }

  function installVisualHelpers(runtime) {
    if (!canvasContext) return;
    runtime.globals.set("bersihkan", (warna = "#101814") => clearCanvas(warna));
    runtime.globals.set("lingkaran", (x, y, radius, warna = "#74d49a") => {
      canvasContext.beginPath();
      canvasContext.arc(Number(x), Number(y), Math.max(0, Number(radius)), 0, Math.PI * 2);
      canvasContext.fillStyle = String(warna);
      canvasContext.fill();
    });
    runtime.globals.set("persegi", (x, y, lebar, tinggi, warna = "#74d49a") => {
      canvasContext.fillStyle = String(warna);
      canvasContext.fillRect(Number(x), Number(y), Number(lebar), Number(tinggi));
    });
    runtime.globals.set("garis", (x1, y1, x2, y2, warna = "#ffffff", tebal = 3) => {
      canvasContext.beginPath();
      canvasContext.moveTo(Number(x1), Number(y1));
      canvasContext.lineTo(Number(x2), Number(y2));
      canvasContext.strokeStyle = String(warna);
      canvasContext.lineWidth = Math.max(1, Number(tebal));
      canvasContext.stroke();
    });
    runtime.globals.set("teks", (isi, x, y, warna = "#ffffff", ukuran = 20) => {
      canvasContext.fillStyle = String(warna);
      canvasContext.font = `${Math.max(8, Number(ukuran))}px sans-serif`;
      canvasContext.textAlign = "center";
      canvasContext.fillText(String(isi), Number(x), Number(y));
    });
  }

  // ---------- Input program: input() ----------
  // Baris dari kotak "Input program" dipakai lebih dulu, satu per panggilan input().
  // Jika sudah habis, browser menampilkan kotak dialog untuk mengetik jawabannya.
  let stdinQueue = [];

  function fillStdinQueue() {
    const raw = stdinInput ? stdinInput.value : "";
    stdinQueue = raw === "" ? [] : raw.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n");
  }

  function readInputLine(promptText) {
    if (stdinQueue.length) return stdinQueue.shift();
    const answer = window.prompt(promptText || "Masukkan input untuk program:");
    return answer === null ? null : answer;
  }

  // input() bawaan diganti agar memakai readInputLine, lalu menampilkan jawabannya
  // di output seperti terminal sungguhan ("Nama: Kaito").
  const INPUT_PATCH = [
    "import builtins",
    "def _ck_input(prompt=''):",
    "    prompt = str(prompt)",
    "    value = _ck_read_line(prompt)",
    "    if value is None:",
    "        raise EOFError('Tidak ada input lagi (dialog dibatalkan atau kotak Input sudah habis).')",
    "    value = str(value)",
    "    print(prompt + value)",
    "    return value",
    "builtins.input = _ck_input"
  ].join("\n");

  function installInput(runtime) {
    runtime.globals.set("_ck_read_line", (promptText) => readInputLine(String(promptText || "")));
    runtime.runPython(INPUT_PATCH);
    // Cadangan untuk kode yang membaca sys.stdin langsung.
    try {
      if (typeof runtime.setStdin === "function") {
        runtime.setStdin({ stdin: () => {
          const line = readInputLine("Masukkan input untuk program:");
          return line === null ? undefined : line;
        } });
      }
    } catch (error) { /* tidak fatal: input() tetap berfungsi */ }
  }

  async function loadRuntime() {
    if (pyodide) return pyodide;
    if (pyodideLoading) return pyodideLoading;

    runtimeStatus.textContent = "Memuat Python…";
    status.textContent = "Menyiapkan runtime Python…";
    runButton.disabled = true;

    pyodideLoading = (async () => {
      if (!window.loadPyodide) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";
          script.onload = resolve;
          script.onerror = () => reject(new Error("Runtime Python gagal dimuat. Periksa koneksi internet."));
          document.head.appendChild(script);
        });
      }
      pyodide = await window.loadPyodide();
      installVisualHelpers(pyodide);
      installInput(pyodide);
      runtimeStatus.textContent = "Python siap";
      return pyodide;
    })();

    try {
      return await pyodideLoading;
    } catch (error) {
      pyodideLoading = null;
      runtimeStatus.textContent = "Gagal memuat runtime";
      throw error;
    } finally {
      runButton.disabled = false;
    }
  }

  async function runCode() {
    const code = getCode();
    output.classList.remove("is-error");
    if (outputMode === "visual") {
      clearCanvas();
      output.hidden = true;
    }
    output.textContent = "Menjalankan kode…";
    status.textContent = "Sedang menjalankan…";
    runButton.disabled = true;

    try {
      const runtime = await loadRuntime();
      installVisualHelpers(runtime);
      fillStdinQueue();
      let printed = "";
      runtime.setStdout({ batched: (text) => { printed += text + "\n"; } });
      runtime.setStderr({ batched: (text) => { printed += text + "\n"; } });
      await runtime.runPythonAsync(code);
      output.textContent = printed.trimEnd() || "Program selesai tanpa output.";
      // Mode Visual: tampilkan teks print() hanya bila ada.
      if (outputMode === "visual") output.hidden = !printed.trim();
      status.textContent = "Program selesai.";
    } catch (error) {
      // Tetap di mode saat ini; di mode Visual, tampilkan pesan error di bawah kanvas.
      if (outputMode === "visual") output.hidden = false;
      output.textContent = error && error.message ? error.message : String(error);
      output.classList.add("is-error");
      status.textContent = "Terjadi error.";
      if (String(error).includes("Runtime Python gagal dimuat")) {
        output.textContent = "Runtime Python tidak berhasil dimuat. Periksa koneksi internet, lalu coba lagi.\n\n" + output.textContent;
      }
    } finally {
      runButton.disabled = false;
    }
  }

  const visualExampleButton = document.querySelector("#py-load-visual-example");
  if (visualExampleButton) visualExampleButton.addEventListener("click", () => {
    setOutputMode("visual");
    setCode(visualExample);
    status.textContent = "Contoh Visual dimuat.";
  });

  runButton.addEventListener("click", runCode);
  if (consoleModeButton) consoleModeButton.addEventListener("click", () => setOutputMode("console"));
  if (visualModeButton) visualModeButton.addEventListener("click", () => {
    setOutputMode("visual");
    status.textContent = "Mode Visual dipilih. Jalankan kode untuk menggambar.";
  });
  resetButton.addEventListener("click", () => {
    // Hanya mengembalikan kode pada mode yang sedang aktif.
    setCode(modeDefaults[outputMode]);
    output.classList.remove("is-error");
    output.textContent = "Output program akan muncul di sini.";
    if (outputMode === "visual") output.hidden = true;
    if (canvasContext) clearCanvas();
    status.textContent = "Kode mode " + (outputMode === "visual" ? "Visual" : "Console") + " dikembalikan ke contoh awal.";
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
        // Contoh konsep dasar adalah kode konsol, jadi pindah ke mode Console dulu.
        if (outputMode !== "console") setOutputMode("console");
        setCode(example);
        status.textContent = "Contoh " + button.querySelector("strong").textContent + " dimuat.";
      }
    });
  });

  // Tahun footer bila main.js tidak mengisinya.
  const year = document.querySelector("#year");
  if (year && !year.textContent) year.textContent = new Date().getFullYear();
});
