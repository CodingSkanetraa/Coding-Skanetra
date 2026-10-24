// Penjalan kode C++ dengan dua layanan kompilasi gratis (Wandbox, lalu Godbolt sebagai cadangan).
// Error "layanan" (jaringan, 5xx, 429, respons rusak, waktu habis) dicoba ulang dan dialihkan ke
// layanan lain. Error kode pengguna (kompilasi gagal, program crash) TIDAK dicoba ulang.
(function () {
  const WANDBOX = "https://wandbox.org/api";
  const GODBOLT = "https://godbolt.org/api";
  const GODBOLT_COMPILER = "g132";
  const FLAGS = ["-std=c++17", "-O1", "-Wall"];
  const ATTEMPT_TIMEOUT_MS = 20000;
  const RETRY_DELAY_MS = 900;
  const ATTEMPTS_PER_SERVICE = 2;

  class ServiceError extends Error {}

  const abortError = () => new DOMException("Dibatalkan", "AbortError");
  const stripAnsi = (text) => String(text || "").replace(/\x1b\[[0-9;]*m/g, "");
  const joinLines = (lines) => Array.isArray(lines) ? lines.map((line) => line.text).join("\n") : String(lines || "");

  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal && signal.aborted) return reject(abortError());
      const timer = setTimeout(resolve, ms);
      if (signal) signal.addEventListener("abort", () => { clearTimeout(timer); reject(abortError()); }, { once: true });
    });
  }

  async function fetchJson(url, options, userSignal) {
    if (userSignal && userSignal.aborted) throw abortError();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
    const onUserAbort = () => controller.abort();
    if (userSignal) userSignal.addEventListener("abort", onUserAbort, { once: true });

    try {
      let response;
      try {
        response = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
      } catch (error) {
        if (userSignal && userSignal.aborted) throw abortError();
        throw new ServiceError(controller.signal.aborted ? "waktu tunggu habis" : "tidak bisa terhubung");
      }
      if (!response.ok) throw new ServiceError("server menjawab kode " + response.status);
      try {
        return await response.json();
      } catch (error) {
        if (userSignal && userSignal.aborted) throw abortError();
        throw new ServiceError("respons server tidak valid");
      }
    } finally {
      clearTimeout(timer);
      if (userSignal) userSignal.removeEventListener("abort", onUserAbort);
    }
  }

  // ---------- Wandbox ----------
  let wandboxCompiler = null;

  function versionParts(name) {
    return name.replace("gcc-", "").split(".").map(Number);
  }

  // Pakai versi gcc rilis terbaru (stabil), bukan gcc-head yang berubah-ubah.
  async function pickWandboxCompiler(signal) {
    if (wandboxCompiler) return wandboxCompiler;
    try {
      const list = await fetchJson(WANDBOX + "/list.json", {}, signal);
      const releases = (Array.isArray(list) ? list : [])
        .filter((item) => item && item.language === "C++" && /^gcc-\d+(\.\d+)*$/.test(item.name))
        .sort((a, b) => {
          const va = versionParts(a.name);
          const vb = versionParts(b.name);
          for (let i = 0; i < Math.max(va.length, vb.length); i++) {
            if ((vb[i] || 0) !== (va[i] || 0)) return (vb[i] || 0) - (va[i] || 0);
          }
          return 0;
        });
      if (releases.length) {
        wandboxCompiler = releases[0].name;
        return wandboxCompiler;
      }
    } catch (error) {
      if (error && error.name === "AbortError") throw error;
    }
    return "gcc-head"; // cadangan; tidak disimpan agar dicoba lagi pada permintaan berikutnya
  }

  async function runWandbox(code, stdin, signal) {
    const compiler = await pickWandboxCompiler(signal);
    const result = await fetchJson(WANDBOX + "/compile.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, compiler, "compiler-option-raw": FLAGS.join("\n"), stdin, save: false })
    }, signal);

    if (!result || typeof result !== "object" || !("status" in result || "compiler_error" in result || "program_output" in result)) {
      throw new ServiceError("respons server tidak lengkap");
    }
    const compilerMessage = stripAnsi(result.compiler_error || result.compiler_message).trim();
    const stdout = String(result.program_output || "");
    const stderr = String(result.program_error || "");
    const exitCode = Number(result.status || 0);
    const ran = Boolean(result.program_message || stdout || stderr) || exitCode === 0;
    return {
      service: "Wandbox",
      compileFailed: !ran && Boolean(compilerMessage),
      compilerMessage,
      stdout,
      stderr,
      exitCode,
      signal: result.signal ? String(result.signal) : ""
    };
  }

  // ---------- Godbolt (Compiler Explorer) ----------
  async function runGodbolt(code, stdin, signal) {
    const result = await fetchJson(GODBOLT + "/compiler/" + GODBOLT_COMPILER + "/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        source: code,
        lang: "c++",
        options: {
          userArguments: FLAGS.join(" "),
          executeParameters: { args: [], stdin },
          compilerOptions: { executorRequest: true },
          filters: { execute: true },
          tools: [],
          libraries: []
        },
        allowStoreCodeDebug: false
      })
    }, signal);

    if (!result || typeof result !== "object" || !("code" in result || "buildResult" in result)) {
      throw new ServiceError("respons server tidak lengkap");
    }
    const build = result.buildResult || {};
    const buildMessage = stripAnsi(joinLines(build.stderr) + "\n" + joinLines(build.stdout)).trim();
    const buildFailed = typeof build.code === "number" && build.code !== 0;
    return {
      service: "Compiler Explorer",
      compileFailed: buildFailed,
      compilerMessage: buildMessage,
      stdout: buildFailed ? "" : joinLines(result.stdout),
      stderr: buildFailed ? "" : joinLines(result.stderr),
      exitCode: buildFailed ? 1 : Number(result.code || 0),
      signal: ""
    };
  }

  const SERVICES = [
    { name: "Wandbox", run: runWandbox },
    { name: "Compiler Explorer", run: runGodbolt }
  ];

  // onStatus(teks) dipanggil saat percobaan ulang / pindah layanan.
  async function run(code, stdin, options) {
    const signal = options && options.signal;
    const onStatus = (options && options.onStatus) || function () {};
    const problems = [];

    for (let s = 0; s < SERVICES.length; s++) {
      const service = SERVICES[s];
      for (let attempt = 1; attempt <= ATTEMPTS_PER_SERVICE; attempt++) {
        try {
          return await service.run(code, stdin, signal);
        } catch (error) {
          if (!(error instanceof ServiceError)) throw error; // termasuk AbortError dari pengguna
          problems.push(service.name + ": " + error.message);
          const lastAttempt = attempt === ATTEMPTS_PER_SERVICE;
          if (!lastAttempt) {
            onStatus("Server sibuk, mencoba lagi…");
            await sleep(RETRY_DELAY_MS, signal);
          } else if (s < SERVICES.length - 1) {
            onStatus("Beralih ke server cadangan…");
          }
        }
      }
    }
    const failure = new ServiceError("Semua layanan kompilasi gagal dihubungi.");
    failure.details = problems;
    throw failure;
  }

  window.CppRunner = { run, ServiceError };
})();
