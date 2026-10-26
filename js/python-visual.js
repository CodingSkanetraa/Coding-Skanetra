// Mode Visual untuk Editor Python: kanvas gambar yang dikendalikan dari Python.
//
// Dua bagian:
//   1. PRELUDE: kode Python yang dimuat sekali ke runtime Pyodide. Isinya fungsi yang dipakai
//      pelajar (lingkaran, maju, animasi, tombol, dst.), lengkap dengan pemeriksaan argumen
//      dan pesan error berbahasa Indonesia.
//   2. create(): objek JavaScript yang menggambar ke <canvas>, menjalankan loop animasi,
//      dan membaca mouse/keyboard. Python memanggilnya lewat objek `_ck_js`.
//
// Catatan: PRELUDE memakai String.raw, jadi jangan menulis backtick atau ${ di dalamnya.
(() => {
  "use strict";

  const DEFAULT_BACKGROUND = "#101814";

  const PRELUDE = String.raw`
import math as _ck_math
import random as _ck_random
from pyodide.ffi import create_proxy as _ck_proxy, to_js as _ck_to_js

LEBAR = 640
TINGGI = 400

# ---------- Pemeriksaan argumen ----------

def _ck_num(nilai, nama):
    if isinstance(nilai, bool) or not isinstance(nilai, (int, float)):
        raise TypeError(nama + " harus berupa angka, bukan " + type(nilai).__name__ + ": " + repr(nilai))
    return nilai

def _ck_warna(nilai, nama="warna", boleh_kosong=False):
    if nilai is None:
        if boleh_kosong:
            return None
        raise TypeError(nama + " tidak boleh kosong")
    if not isinstance(nilai, str):
        raise TypeError(nama + " harus berupa teks warna, misalnya '#ff0000' atau 'red', bukan " + type(nilai).__name__)
    return nilai

# ---------- Warna ----------

def rgb(merah, hijau, biru, alfa=1):
    r = int(max(0, min(255, _ck_num(merah, "merah"))))
    g = int(max(0, min(255, _ck_num(hijau, "hijau"))))
    b = int(max(0, min(255, _ck_num(biru, "biru"))))
    a = max(0, min(1, _ck_num(alfa, "alfa")))
    return "rgba(%d,%d,%d,%s)" % (r, g, b, a)

def hsl(rona, jenuh=100, terang=50, alfa=1):
    h = _ck_num(rona, "rona") % 360
    s = max(0, min(100, _ck_num(jenuh, "jenuh")))
    l = max(0, min(100, _ck_num(terang, "terang")))
    a = max(0, min(1, _ck_num(alfa, "alfa")))
    return "hsla(%s,%s%%,%s%%,%s)" % (h, s, l, a)

def warna_acak():
    return "hsl(%d,75%%,60%%)" % _ck_random.randint(0, 359)

# ---------- Bentuk ----------

def bersihkan(warna="#101814"):
    _ck_js.clear(_ck_warna(warna))

def lingkaran(x, y, radius, warna="#74d49a", tepi=None, tebal=2):
    _ck_js.circle(_ck_num(x, "x"), _ck_num(y, "y"), _ck_num(radius, "radius"),
                  _ck_warna(warna, "warna", True), _ck_warna(tepi, "tepi", True), _ck_num(tebal, "tebal"))

def persegi(x, y, lebar, tinggi, warna="#74d49a", tepi=None, tebal=2):
    _ck_js.rect(_ck_num(x, "x"), _ck_num(y, "y"), _ck_num(lebar, "lebar"), _ck_num(tinggi, "tinggi"),
                _ck_warna(warna, "warna", True), _ck_warna(tepi, "tepi", True), _ck_num(tebal, "tebal"))

def elips(x, y, radius_x, radius_y, warna="#74d49a", tepi=None, tebal=2):
    _ck_js.ellipse(_ck_num(x, "x"), _ck_num(y, "y"), _ck_num(radius_x, "radius_x"), _ck_num(radius_y, "radius_y"),
                   _ck_warna(warna, "warna", True), _ck_warna(tepi, "tepi", True), _ck_num(tebal, "tebal"))

def segitiga(x1, y1, x2, y2, x3, y3, warna="#74d49a", tepi=None, tebal=2):
    poligon([(x1, y1), (x2, y2), (x3, y3)], warna, tepi, tebal)

def poligon(titik, warna="#74d49a", tepi=None, tebal=2):
    datar = []
    for pasangan in titik:
        try:
            px, py = pasangan
        except (TypeError, ValueError):
            raise TypeError("titik harus berisi pasangan (x, y), misalnya [(0, 0), (50, 0), (25, 40)]")
        datar.append(float(_ck_num(px, "x")))
        datar.append(float(_ck_num(py, "y")))
    if len(datar) < 6:
        raise ValueError("poligon butuh minimal 3 titik")
    _ck_js.poly(_ck_to_js(datar), _ck_warna(warna, "warna", True), _ck_warna(tepi, "tepi", True), _ck_num(tebal, "tebal"))

def garis(x1, y1, x2, y2, warna="#ffffff", tebal=3):
    _ck_js.line(_ck_num(x1, "x1"), _ck_num(y1, "y1"), _ck_num(x2, "x2"), _ck_num(y2, "y2"),
                _ck_warna(warna), _ck_num(tebal, "tebal"))

def busur(x, y, radius, sudut_awal, sudut_akhir, warna="#ffffff", tebal=3):
    # Sudut dalam derajat, 0 = kanan, bertambah berlawanan arah jarum jam.
    _ck_js.arc(_ck_num(x, "x"), _ck_num(y, "y"), _ck_num(radius, "radius"),
               _ck_num(sudut_awal, "sudut_awal"), _ck_num(sudut_akhir, "sudut_akhir"),
               _ck_warna(warna), _ck_num(tebal, "tebal"))

def teks(isi, x, y, warna="#ffffff", ukuran=20, rata="tengah", tebal=False):
    if rata not in ("kiri", "tengah", "kanan"):
        raise ValueError("rata harus 'kiri', 'tengah', atau 'kanan'")
    _ck_js.text(str(isi), _ck_num(x, "x"), _ck_num(y, "y"), _ck_warna(warna), _ck_num(ukuran, "ukuran"), rata, bool(tebal))

# ---------- Kura-kura ----------
# Kura-kura mulai di tengah kanvas, menghadap kanan (0 derajat), pena di bawah.

_ck_kura = {}

def _ck_gerak_ke(nx, ny, gambar):
    k = _ck_kura
    if gambar and k["pena"]:
        _ck_js.line(k["x"], k["y"], nx, ny, k["warna"], k["tebal"])
    k["x"], k["y"] = nx, ny
    if k["jalur"] is not None:
        k["jalur"].extend((nx, ny))

def _ck_maju(jarak):
    k = _ck_kura
    rad = _ck_math.radians(k["arah"])
    _ck_gerak_ke(k["x"] + jarak * _ck_math.cos(rad), k["y"] - jarak * _ck_math.sin(rad), True)

def maju(jarak=50):
    _ck_maju(_ck_num(jarak, "jarak"))

def mundur(jarak=50):
    _ck_maju(-_ck_num(jarak, "jarak"))

def kiri(derajat=90):
    _ck_kura["arah"] = (_ck_kura["arah"] + _ck_num(derajat, "derajat")) % 360

def kanan(derajat=90):
    _ck_kura["arah"] = (_ck_kura["arah"] - _ck_num(derajat, "derajat")) % 360

def hadap(derajat):
    _ck_kura["arah"] = _ck_num(derajat, "derajat") % 360

def pergi_ke(x, y):
    _ck_gerak_ke(float(_ck_num(x, "x")), float(_ck_num(y, "y")), True)

def lompat(x, y):
    _ck_gerak_ke(float(_ck_num(x, "x")), float(_ck_num(y, "y")), False)

def ke_tengah():
    _ck_gerak_ke(LEBAR / 2, TINGGI / 2, False)
    _ck_kura["arah"] = 0.0

def angkat_pena():
    _ck_kura["pena"] = False

def turunkan_pena():
    _ck_kura["pena"] = True

def warna_pena(warna):
    _ck_kura["warna"] = _ck_warna(warna)

def tebal_pena(tebal):
    _ck_kura["tebal"] = _ck_num(tebal, "tebal")

def posisi_kura():
    return (_ck_kura["x"], _ck_kura["y"])

def arah_kura():
    return _ck_kura["arah"]

def mulai_isi(warna="#74d49a"):
    _ck_kura["isi"] = _ck_warna(warna)
    _ck_kura["jalur"] = [_ck_kura["x"], _ck_kura["y"]]

def selesai_isi():
    k = _ck_kura
    if k["jalur"] is not None and len(k["jalur"]) >= 6:
        _ck_js.poly(_ck_to_js([float(v) for v in k["jalur"]]), k["isi"], None, 1)
    k["isi"] = None
    k["jalur"] = None

# ---------- Animasi, waktu, mouse, dan keyboard ----------

_ck_anim = {}

def animasi(fungsi, fps=60):
    if not callable(fungsi):
        raise TypeError("animasi() butuh sebuah fungsi. Tulis nama fungsinya tanpa tanda kurung, misalnya animasi(gerak)")
    fps = _ck_num(fps, "fps")
    if fps < 1 or fps > 120:
        raise ValueError("fps harus antara 1 dan 120")
    berhenti_animasi()
    _ck_anim["proxy"] = _ck_proxy(fungsi)
    _ck_js.animate(_ck_anim["proxy"], fps)

def berhenti_animasi():
    _ck_js.stopAnimation()
    proxy = _ck_anim.pop("proxy", None)
    if proxy is not None:
        try:
            proxy.destroy()
        except Exception:
            pass

def waktu():
    return _ck_js.now()

def mouse_x():
    return _ck_js.mouseX()

def mouse_y():
    return _ck_js.mouseY()

def mouse_ditekan():
    return bool(_ck_js.mouseDown())

def mouse_klik():
    return bool(_ck_js.mouseClick())

def tombol(nama):
    return bool(_ck_js.key(str(nama).lower()))

# ---------- Mengatur ulang setiap program dijalankan ----------

def _ck_reset():
    proxy = _ck_anim.pop("proxy", None)
    if proxy is not None:
        try:
            proxy.destroy()
        except Exception:
            pass
    _ck_kura.clear()
    _ck_kura.update(x=LEBAR / 2, y=TINGGI / 2, arah=0.0, pena=True, warna="#74d49a", tebal=2, isi=None, jalur=None)

_ck_reset()
`;

  function create(options) {
    const canvas = options.canvas;
    const ctx = canvas.getContext("2d");
    const onError = options.onError || (() => {});
    const onAnimationChange = options.onAnimationChange || (() => {});

    const keys = new Set();
    const pointer = { x: 0, y: 0, down: false, click: false };
    let animation = null;
    let startTime = performance.now();
    const prepared = new WeakSet();

    const num = (value, fallback = 0) => {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
    };

    function paint(fill, stroke, width) {
      if (fill != null) {
        ctx.fillStyle = String(fill);
        ctx.fill();
      }
      if (stroke != null) {
        ctx.strokeStyle = String(stroke);
        ctx.lineWidth = Math.max(1, num(width, 2));
        ctx.lineJoin = "round";
        ctx.stroke();
      }
    }

    function clear(color) {
      ctx.fillStyle = color == null ? DEFAULT_BACKGROUND : String(color);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    function stopAnimation() {
      if (!animation) return;
      cancelAnimationFrame(animation.frame);
      animation = null;
      onAnimationChange(false);
    }

    function startAnimation(callback, fps) {
      stopAnimation();
      const interval = 1000 / Math.min(120, Math.max(1, num(fps, 60)));
      animation = { callback, frame: 0, last: -Infinity };
      const current = animation;

      const step = (timestamp) => {
        if (animation !== current) return;
        if (timestamp - current.last >= interval - 2) {
          current.last = timestamp;
          try {
            current.callback();
          } catch (error) {
            if (animation === current) stopAnimation();
            onError(error && error.message ? error.message : String(error));
            return;
          }
        }
        if (animation === current) current.frame = requestAnimationFrame(step);
      };
      current.frame = requestAnimationFrame(step);
      onAnimationChange(true);
    }

    // Objek yang dipakai Python sebagai `_ck_js`.
    const api = {
      clear,
      circle(x, y, r, fill, stroke, width) {
        ctx.beginPath();
        ctx.arc(num(x), num(y), Math.max(0, num(r)), 0, Math.PI * 2);
        paint(fill, stroke, width);
      },
      rect(x, y, w, h, fill, stroke, width) {
        ctx.beginPath();
        ctx.rect(num(x), num(y), num(w), num(h));
        paint(fill, stroke, width);
      },
      ellipse(x, y, rx, ry, fill, stroke, width) {
        ctx.beginPath();
        ctx.ellipse(num(x), num(y), Math.abs(num(rx)), Math.abs(num(ry)), 0, 0, Math.PI * 2);
        paint(fill, stroke, width);
      },
      poly(flat, fill, stroke, width) {
        const points = Array.from(flat, Number);
        if (points.length < 6) return;
        ctx.beginPath();
        ctx.moveTo(points[0], points[1]);
        for (let i = 2; i + 1 < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
        ctx.closePath();
        paint(fill, stroke, width);
      },
      line(x1, y1, x2, y2, color, width) {
        ctx.beginPath();
        ctx.moveTo(num(x1), num(y1));
        ctx.lineTo(num(x2), num(y2));
        ctx.strokeStyle = String(color);
        ctx.lineWidth = Math.max(1, num(width, 3));
        ctx.lineCap = "round";
        ctx.stroke();
      },
      arc(x, y, r, from, to, color, width) {
        // Sudut matematika (berlawanan arah jarum jam); sumbu y kanvas terbalik.
        ctx.beginPath();
        ctx.arc(num(x), num(y), Math.max(0, num(r)), -num(from) * Math.PI / 180, -num(to) * Math.PI / 180, true);
        ctx.strokeStyle = String(color);
        ctx.lineWidth = Math.max(1, num(width, 3));
        ctx.lineCap = "round";
        ctx.stroke();
      },
      text(content, x, y, color, size, align, bold) {
        ctx.fillStyle = String(color);
        ctx.font = (bold ? "bold " : "") + Math.max(8, num(size, 20)) + "px sans-serif";
        ctx.textAlign = align === "kiri" ? "left" : align === "kanan" ? "right" : "center";
        ctx.fillText(String(content), num(x), num(y));
      },
      animate: startAnimation,
      stopAnimation,
      now: () => (performance.now() - startTime) / 1000,
      mouseX: () => pointer.x,
      mouseY: () => pointer.y,
      mouseDown: () => pointer.down,
      mouseClick: () => {
        const clicked = pointer.click;
        pointer.click = false;
        return clicked;
      },
      key: (name) => keys.has(String(name))
    };

    // ---------- Mouse dan keyboard ----------
    const KEY_NAMES = {
      ArrowLeft: "kiri", ArrowRight: "kanan", ArrowUp: "atas", ArrowDown: "bawah",
      " ": "spasi", Enter: "enter", Escape: "esc", Shift: "shift"
    };
    const CAPTURED = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "]);

    function toCanvas(event) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.x = Math.round((event.clientX - rect.left) * canvas.width / rect.width);
      pointer.y = Math.round((event.clientY - rect.top) * canvas.height / rect.height);
    }

    canvas.tabIndex = 0;
    canvas.addEventListener("pointermove", toCanvas);
    canvas.addEventListener("pointerdown", (event) => {
      toCanvas(event);
      pointer.down = true;
      pointer.click = true;
      canvas.focus({ preventScroll: true });
    });
    window.addEventListener("pointerup", () => { pointer.down = false; });
    canvas.addEventListener("keydown", (event) => {
      const name = KEY_NAMES[event.key] || String(event.key).toLowerCase();
      keys.add(name);
      if (CAPTURED.has(event.key)) event.preventDefault();
    });
    canvas.addEventListener("keyup", (event) => {
      keys.delete(KEY_NAMES[event.key] || String(event.key).toLowerCase());
    });
    canvas.addEventListener("blur", () => keys.clear());

    function resetInput() {
      keys.clear();
      pointer.down = false;
      pointer.click = false;
    }

    // Dipanggil setiap program akan dijalankan: hentikan animasi lama, pasang fungsi Python.
    function install(runtime) {
      stopAnimation();
      resetInput();
      startTime = performance.now();
      runtime.globals.set("_ck_js", api);
      if (!prepared.has(runtime)) {
        runtime.runPython(PRELUDE);
        prepared.add(runtime);
      }
      runtime.runPython("_ck_reset()");
    }

    return {
      install,
      stop: stopAnimation,
      clear,
      isAnimating: () => animation !== null,
      api
    };
  }

  window.CodingSkanetraVisual = { create, prelude: PRELUDE, defaultBackground: DEFAULT_BACKGROUND };
})();
