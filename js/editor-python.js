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

  if (!textarea || !runButton || !resetButton || !clearButton || !output || !status || !runtimeStatus) return;
  if (!window.CkTerminal) {
    output.textContent = "Modul terminal gagal dimuat. Muat ulang halaman.";
    return;
  }

  // Kotak output berperan sebagai terminal: teks program + kolom ketik untuk input().
  const term = window.CkTerminal.create(output);

  const initialCode = textarea.value;
  let editor = null;
  let pyodide = null;
  let pyodideLoading = null;
  let outputMode = "console";
  let saver = null; // pengelola tombol Simpan (lihat bagian "Simpan kode" di bawah)
  const stopAnimationButton = document.querySelector("#py-stop-animation");
  const fullscreenButton = document.querySelector("#py-fullscreen");
  const restartButton = document.querySelector("#py-restart");
  const outputPanel = document.querySelector(".py-output-panel");
  const visualExampleButtons = document.querySelectorAll("[data-visual-example]");

  // Gambar, animasi, mouse, dan keyboard untuk mode Visual ada di python-visual.js.
  const visualApi = canvas && window.CodingSkanetraVisual
    ? window.CodingSkanetraVisual.create({
        canvas,
        onAnimationChange: (aktif) => {
          if (stopAnimationButton) stopAnimationButton.hidden = !aktif;
          if (aktif) status.textContent = "Animasi berjalan. Klik kanvas untuk memakai mouse dan keyboard.";
        },
        onError: (pesan) => {
          output.hidden = false;
          output.classList.add("is-error");
          term.show("Error pada animasi:\n" + pesan);
          status.textContent = "Animasi berhenti karena error.";
        }
      })
    : null;

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
        Tab: (cm) => cm.execCommand("insertSoftTab"),
        "Shift-Tab": (cm) => cm.execCommand("indentLess"),
        "Ctrl-Enter": () => runCode(),
        "Cmd-Enter": () => runCode()
      }
    });
    editor.setSize("100%", "390px");
    if (window.CodingSkanetraEditorPrefs) window.CodingSkanetraEditorPrefs.pasang(editor);
  }

  function getCode() {
    return editor ? editor.getValue() : textarea.value;
  }

  function setCode(code, options) {
    if (editor) editor.setValue(code);
    else textarea.value = code;
    if (editor && !(options && options.quiet)) editor.focus();
    if (saver) saver.refresh();
  }

  // Setiap mode punya kode sendiri (seperti tab HTML dan CSS di editor web):
  // pindah mode tidak menimpa kode mode lainnya.
  const modeCodes = { console: initialCode, visual: visualExample };
  const modeDefaults = { console: initialCode, visual: visualExample };

  // Kode yang pernah disimpan dimuat otomatis, terpisah untuk tiap mode.
  const saveKeys = { console: "python-console", visual: "python-visual" };
  let restoredNote = "";
  if (window.CodeStorage) {
    const savedConsole = window.CodeStorage.read(saveKeys.console);
    const savedVisual = window.CodeStorage.read(saveKeys.visual);
    if (savedVisual && typeof savedVisual.data === "string") modeCodes.visual = savedVisual.data;
    if (savedConsole && typeof savedConsole.data === "string") {
      modeCodes.console = savedConsole.data;
      setCode(savedConsole.data, { quiet: true });
    }
    if (savedConsole || savedVisual) {
      const terbaru = Math.max(savedConsole ? savedConsole.savedAt : 0, savedVisual ? savedVisual.savedAt : 0);
      restoredNote = "Kode tersimpan dimuat (disimpan " + window.CodeStorage.formatTime(terbaru) + ").";
    }
  }

  // Layar penuh untuk kanvas Visual: panel output menutupi seluruh layar (seperti di editor web).
  function setFullscreen(on) {
    if (!outputPanel) return;
    const aktif = Boolean(on);
    outputPanel.classList.toggle("is-fullscreen", aktif);
    document.documentElement.classList.toggle("py-fs-open", aktif);
    if (fullscreenButton) {
      fullscreenButton.textContent = aktif ? "✕ Keluar layar penuh" : "⛶ Layar penuh";
      fullscreenButton.setAttribute("aria-pressed", String(aktif));
    }
    // Fokus ke kanvas agar tombol keyboard langsung terbaca oleh program.
    if (aktif && canvas) canvas.focus({ preventScroll: true });
    else if (fullscreenButton) fullscreenButton.focus({ preventScroll: true });
  }

  function setOutputMode(mode) {
    if (mode !== outputMode) {
      setFullscreen(false);
      cancelSession();
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
    if (visual) clearCanvas();
    if (visual && editor) editor.refresh();
  }

  function clearCanvas(color) {
    if (visualApi) visualApi.clear(color);
  }

  function installVisualHelpers(runtime) {
    if (!visualApi) return;
    visualApi.install(runtime);
  }

  // ---------- Input program: input() ----------
  // Pyodide berjalan di thread utama dan input() harus mengembalikan nilai secara sinkron,
  // sehingga program tidak bisa "berhenti menunggu" sambil menampilkan kolom ketik.
  // Caranya: program dijalankan dari awal setiap kali pengguna menjawab. Jawaban yang sudah
  // ada dipakai oleh input() satu per satu; bila jawabannya habis, input() melempar
  // _CkNeedInput, tampilan berhenti di situ, dan kolom ketik muncul di ujung output.
  // Seed random dibuat tetap selama satu sesi supaya hasil acak sama di setiap putaran.
  const EOF_MARK = { eof: true };
  let session = 0;

  const RUNTIME_PATCH = [
    "import builtins, sys",
    "class _CkNeedInput(BaseException):",
    "    pass",
    "class _CkOut:",
    "    encoding = 'utf-8'",
    "    errors = 'strict'",
    "    def write(self, s):",
    "        s = str(s)",
    "        _ck_write(s)",
    "        return len(s)",
    "    def flush(self):",
    "        pass",
    "    def isatty(self):",
    "        return False",
    "    def writable(self):",
    "        return True",
    "def _ck_next(prompt):",
    "    reply = _ck_read_line(prompt)",
    "    if reply is None:",
    "        raise _CkNeedInput()",
    "    return reply",
    "def _ck_input(prompt=''):",
    "    prompt = str(prompt)",
    "    reply = _ck_next(prompt)",
    "    if reply == 'E':",
    "        sys.stdout.write(prompt)",
    "        raise EOFError('EOF when reading a line')",
    "    value = reply[1:]",
    "    sys.stdout.write(prompt + value + '\\n')",
    "    return value",
    "class _CkIn:",
    "    encoding = 'utf-8'",
    "    def readline(self, size=-1):",
    "        reply = _ck_next('')",
    "        if reply == 'E':",
    "            return ''",
    "        value = reply[1:]",
    "        sys.stdout.write(value + '\\n')",
    "        return value + '\\n'",
    "    def read(self, size=-1):",
    "        parts = []",
    "        while True:",
    "            line = self.readline()",
    "            if not line:",
    "                break",
    "            parts.append(line)",
    "        return ''.join(parts)",
    "    def readlines(self, hint=-1):",
    "        return self.read().splitlines(True)",
    "    def __iter__(self):",
    "        return self",
    "    def __next__(self):",
    "        line = self.readline()",
    "        if not line:",
    "            raise StopIteration",
    "        return line",
    "    def isatty(self):",
    "        return False",
    "    def readable(self):",
    "        return True",
    "builtins.input = _ck_input",
    "sys.stdout = _CkOut()",
    "sys.stderr = _CkOut()",
    "sys.stdin = _CkIn()"
  ].join("\n");

  function installRuntimePatch(runtime) {
    runtime.runPython(RUNTIME_PATCH);
  }

  // Menjalankan kode sekali dari awal dengan daftar jawaban yang sudah ada.
  // Hasil: { text, pending, error } — pending berisi teks prompt bila program menunggu input.
  async function runOnce(runtime, code, answers, seed) {
    let text = "";
    let pending = null;
    let textAtPending = 0; // panjang output tepat saat program berhenti meminta input
    let readIndex = 0;

    runtime.globals.set("_ck_write", (chunk) => { text += String(chunk); });
    runtime.globals.set("_ck_read_line", (promptText) => {
      const index = readIndex++;
      if (index < answers.length) {
        const answer = answers[index];
        return answer === EOF_MARK ? "E" : "L" + answer;
      }
      if (pending === null) {
        pending = String(promptText || "");
        textAtPending = text.length;
      }
      return undefined; // undefined selalu menjadi None di Python (null bisa berbeda antar versi Pyodide)
    });
    installVisualHelpers(runtime);
    runtime.runPython("import random\nrandom.seed(" + seed + ")");

    // Namespace baru di setiap putaran, supaya variabel putaran sebelumnya tidak ikut terbawa.
    const namespace = runtime.runPython("dict(globals())");
    // Saat program dihentikan untuk meminta input, Python ikut mencetak traceback "_CkNeedInput"
    // ke stderr. Semua yang tercetak setelah titik berhenti dibuang, supaya tidak tampil di output.
    const cleanPending = () => text.slice(0, textAtPending);
    // Untuk error sungguhan, traceback ditampilkan dari pesan error; hapus salinan di output agar tidak ganda.
    const cleanError = () => {
      const at = text.indexOf("Traceback (most recent call last)");
      return at >= 0 ? text.slice(0, at) : text;
    };
    try {
      await runtime.runPythonAsync(code, { globals: namespace });
      return { text: pending !== null ? cleanPending() : text, pending, error: null };
    } catch (error) {
      if (pending !== null) return { text: cleanPending(), pending, error: null };
      return { text: cleanError(), pending: null, error: error && error.message ? error.message : String(error) };
    } finally {
      namespace.destroy();
    }
  }

  function cancelSession() {
    session++;
    term.cancel();
    if (visualApi) visualApi.stop();
    runButton.disabled = false;
  }

  async function loadRuntime() {
    if (pyodide) return pyodide;
    if (pyodideLoading) return pyodideLoading;

    runtimeStatus.textContent = "Memuat Python…";
    status.textContent = "Menyiapkan runtime Python…";

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
      installRuntimePatch(pyodide);
      runtimeStatus.textContent = "Python siap";
      return pyodide;
    })();

    try {
      return await pyodideLoading;
    } catch (error) {
      pyodideLoading = null;
      runtimeStatus.textContent = "Gagal memuat runtime";
      throw error;
    }
  }

  async function runCode() {
    if (runButton.disabled) return;

    const token = ++session;
    term.cancel();
    if (visualApi) visualApi.stop();
    const code = getCode();
    const seed = Math.floor(Math.random() * 2147483647);
    const answers = [];

    output.classList.remove("is-error");
    if (outputMode === "visual") {
      clearCanvas();
      output.hidden = true;
    }
    term.show("Menjalankan kode…");
    status.textContent = "Sedang menjalankan…";
    runButton.disabled = true;

    try {
      const runtime = await loadRuntime();

      for (;;) {
        if (token !== session) return;
        if (outputMode === "visual") clearCanvas();

        const result = await runOnce(runtime, code, answers, seed);
        if (token !== session) return;

        if (result.pending !== null) {
          // Program menunggu input: tampilkan kolom ketik di ujung output.
          output.hidden = false;
          status.textContent = "Program menunggu input. Ketik di kotak output lalu tekan Enter.";
          runButton.disabled = false;
          const reply = await term.prompt(result.text + result.pending);
          if (reply === null || token !== session) return;
          runButton.disabled = true;
          answers.push(reply.eof ? EOF_MARK : reply.line);
          status.textContent = "Sedang menjalankan…";
          continue;
        }

        if (result.error !== null) {
          // Tetap di mode saat ini; di mode Visual, tampilkan pesan error di bawah kanvas.
          if (outputMode === "visual") output.hidden = false;
          const printed = result.text ? result.text.replace(/\n?$/, "\n") : "";
          term.show(printed + result.error);
          output.classList.add("is-error");
          status.textContent = "Terjadi error.";
        } else {
          term.show(result.text.trimEnd() || "Program selesai tanpa output.");
          // Mode Visual: tampilkan teks print() hanya bila ada.
          if (outputMode === "visual") output.hidden = !result.text.trim();
          status.textContent = visualApi && visualApi.isAnimating()
            ? "Animasi berjalan. Klik kanvas untuk memakai mouse dan keyboard."
            : "Program selesai.";
        }
        break;
      }
    } catch (error) {
      if (token !== session) return;
      if (outputMode === "visual") output.hidden = false;
      let message = error && error.message ? error.message : String(error);
      if (String(error).includes("Runtime Python gagal dimuat")) {
        message = "Runtime Python tidak berhasil dimuat. Periksa koneksi internet, lalu coba lagi.\n\n" + message;
      }
      term.show(message);
      output.classList.add("is-error");
      status.textContent = "Terjadi error.";
    } finally {
      if (token === session) runButton.disabled = false;
    }
  }

  const visualExampleButton = document.querySelector("#py-load-visual-example");
  if (visualExampleButton) visualExampleButton.addEventListener("click", () => {
    setOutputMode("visual");
    setCode(visualExample);
    status.textContent = "Contoh Visual dimuat.";
  });


  // Contoh untuk mode Visual. Judul dan deskripsi kartunya ada di editor-python.html.
  const visualExamples = {
    wajah: visualExample,
    spiral: `# Spiral dengan kura-kura
# Kura-kura mulai di tengah kanvas dan menghadap kanan.
bersihkan("#101814")
warna_pena("#74d49a")
tebal_pena(2)

for i in range(120):
    maju(i * 2.5)
    kiri(91)`,
    bunga: `# Pola bunga: kotak yang diputar sedikit demi sedikit
bersihkan("#101814")
tebal_pena(2)
lompat(250, 250)

for i in range(36):
    warna_pena(hsl(i * 10, 80, 60))
    for sisi in range(4):
        maju(90)
        kiri(90)
    kiri(10)`,
    bintang: `# Bintang dari poligon dan matematika
import math

bersihkan("#101814")
titik = []
for i in range(10):
    jari = 130 if i % 2 == 0 else 55
    sudut = math.radians(-90 + i * 36)
    titik.append((320 + jari * math.cos(sudut), 200 + jari * math.sin(sudut)))

poligon(titik, "#f3bd59", "#ffffff", 3)
teks("Bintang", 320, 385, "#99a89e", 16)`,
    bola: `# Bola memantul: fungsi dipanggil berulang oleh animasi()
x, y = 100, 100
dx, dy = 4, 3

def gerak():
    global x, y, dx, dy
    x += dx
    y += dy
    if x < 20 or x > LEBAR - 20:
        dx = -dx
    if y < 20 or y > TINGGI - 20:
        dy = -dy
    bersihkan("#101814")
    lingkaran(x, y, 20, "#74d49a")

animasi(gerak)`,
    mouse: `# Lingkaran yang mengejar mouse
# Gerakkan mouse di atas kanvas. Klik untuk mengganti warna.
x, y = 320, 200
warna = "#f3bd59"

def gerak():
    global x, y, warna
    x += (mouse_x() - x) * 0.1
    y += (mouse_y() - y) * 0.1
    if mouse_klik():
        warna = warna_acak()
    bersihkan("#101814")
    lingkaran(x, y, 24, warna)
    teks("Gerakkan mouse, lalu klik", 320, 380, "#99a89e", 16)

animasi(gerak)`,
    game: `# Game kecil: tangkap bintang
# Klik kanvas dulu, lalu gerakkan dengan tombol panah.
import random

px, py = 320, 200
bx, by = 500, 120
skor = 0

def jalan():
    global px, py, bx, by, skor
    if tombol("kiri"):
        px -= 5
    if tombol("kanan"):
        px += 5
    if tombol("atas"):
        py -= 5
    if tombol("bawah"):
        py += 5
    px = max(15, min(LEBAR - 15, px))
    py = max(15, min(TINGGI - 15, py))

    if (px - bx) ** 2 + (py - by) ** 2 < 25 ** 2:
        skor += 1
        bx = random.randint(30, LEBAR - 30)
        by = random.randint(30, TINGGI - 30)

    bersihkan("#101814")
    lingkaran(bx, by, 10, "#f3bd59")
    lingkaran(px, py, 15, "#74d49a")
    teks("Skor: " + str(skor), 60, 30, "#ffffff", 20)

animasi(jalan)`
  };

  visualExampleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const kode = visualExamples[button.dataset.visualExample];
      if (!kode) return;
      setOutputMode("visual");
      setCode(kode);
      modeCodes.visual = kode;
      clearCanvas();
      const judul = button.querySelector("strong");
      status.textContent = "Contoh " + (judul ? judul.textContent : "Visual") + " dimuat. Tekan Jalankan.";
      const editorPanel = document.querySelector(".py-editor-layout");
      if (editorPanel) editorPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  if (fullscreenButton) {
    fullscreenButton.addEventListener("click", () => {
      setFullscreen(!outputPanel.classList.contains("is-fullscreen"));
    });
  }

  // Jalankan ulang tanpa keluar dari layar penuh (tombol Jalankan ada di panel kode).
  if (restartButton) {
    restartButton.addEventListener("click", () => runButton.click());
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && outputPanel && outputPanel.classList.contains("is-fullscreen")) {
      setFullscreen(false);
    }
  });

  if (stopAnimationButton) {
    stopAnimationButton.addEventListener("click", () => {
      if (visualApi) visualApi.stop();
      status.textContent = "Animasi dihentikan.";
    });
  }

  // Unduh kode yang sedang diedit sebagai file Python (.py), baik dari mode Console maupun Visual.
  const downloadButton = document.querySelector("#py-download");
  if (downloadButton) {
    downloadButton.addEventListener("click", () => {
      const blob = new Blob(["\uFEFF", getCode()], { type: "text/x-python;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = outputMode === "visual" ? "main-visual.py" : "main.py";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = "File Python berhasil disiapkan untuk diunduh.";
    });
  }

  runButton.addEventListener("click", runCode);
  if (consoleModeButton) consoleModeButton.addEventListener("click", () => setOutputMode("console"));
  if (visualModeButton) visualModeButton.addEventListener("click", () => {
    setOutputMode("visual");
    status.textContent = "Mode Visual dipilih. Jalankan kode untuk menggambar.";
  });
  resetButton.addEventListener("click", () => {
    cancelSession();
    // Hanya mengembalikan kode pada mode yang sedang aktif.
    setCode(modeDefaults[outputMode]);
    output.classList.remove("is-error");
    term.show("Output program akan muncul di sini.");
    if (outputMode === "visual") output.hidden = true;
    clearCanvas();
    status.textContent = "Kode mode " + (outputMode === "visual" ? "Visual" : "Console") + " dikembalikan ke contoh awal.";
  });
  clearButton.addEventListener("click", () => {
    cancelSession();
    output.classList.remove("is-error");
    term.show("Output dibersihkan.");
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

  // ---------- Simpan kode di browser ini ----------
  // Tombol Simpan (atau Ctrl + S) menyimpan kode mode yang sedang aktif; Console dan Visual
  // punya simpanan sendiri-sendiri. Kode tersimpan dimuat otomatis saat halaman dibuka.
  const saveButton = document.querySelector("#py-save");
  if (saveButton && window.CodeStorage) {
    saver = window.CodeStorage.bindButton({
      button: saveButton,
      getKey: () => saveKeys[outputMode],
      getData: getCode,
      notify: (pesan) => { status.textContent = pesan; },
      successMessage: () =>
        "Kode mode " + (outputMode === "visual" ? "Visual" : "Console") + " disimpan di browser ini."
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

  // Tahun footer bila main.js tidak mengisinya.
  const year = document.querySelector("#year");
  if (year && !year.textContent) year.textContent = new Date().getFullYear();
});
