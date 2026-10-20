(function () {
  'use strict'
  var C = window.CUMPLE || {}
  var FOTOS = window.FOTOS || []
  var $ = function (id) { return document.getElementById(id) }

  // ---------- Textos del cumpleaños ----------
  document.title = 'Cumpleaños de ' + C.nombre
  $('tituloNombre').textContent = C.nombre
  $('fechaLugar').textContent = [C.fecha, C.lugar].filter(Boolean).join(' · ')
  $('mensaje').textContent = C.mensaje || ''
  if (C.edad) { $('edad').textContent = '¡' + C.edad + ' años!'; $('edad').hidden = false }

  // ---------- Fechas ----------
  var fmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  function fecha(s) {
    if (!s) return ''
    var d = new Date(String(s).replace(' ', 'T'))
    return isNaN(d) ? String(s) : fmt.format(d)
  }

  // ---------- Álbum ----------
  var inclinaciones = [-2.2, 1.6, -1, 2.2, -1.8, 1]
  var muro = $('muro')
  function el(tag, cls, text) {
    var n = document.createElement(tag)
    if (cls) n.className = cls
    if (text) n.textContent = text
    return n
  }
  FOTOS.forEach(function (f, i) {
    var fig = el('figure', 'polaroid')
    fig.style.setProperty('--tilt', inclinaciones[i % 6] + 'deg')
    var btn = el('button', 'polaroid-btn')
    btn.type = 'button'
    btn.setAttribute('aria-label', 'Ampliar foto de ' + f.nombre)
    var img = el('img')
    img.src = f.archivo
    img.alt = 'Foto compartida por ' + f.nombre
    img.loading = 'lazy'
    btn.appendChild(img)
    btn.addEventListener('click', function () { abrir(i) })
    var cap = el('figcaption')
    cap.appendChild(el('span', 'p-nombre', f.nombre))
    if (f.dedicatoria) cap.appendChild(el('span', 'p-dedic', f.dedicatoria))
    if (f.fecha) cap.appendChild(el('time', 'p-fecha', fecha(f.fecha)))
    fig.appendChild(btn)
    fig.appendChild(cap)
    muro.appendChild(fig)
  })
  $('vacio').hidden = FOTOS.length > 0

  // ---------- Vista ampliada ----------
  var actual = 0
  var lb = $('lightbox')
  function mostrar(i) {
    actual = i
    var f = FOTOS[i]
    $('lbImg').src = f.archivo
    $('lbImg').alt = 'Foto compartida por ' + f.nombre
    $('lbNombre').textContent = f.nombre
    $('lbDedic').textContent = f.dedicatoria || ''
    $('lbFecha').textContent = fecha(f.fecha)
    $('lbPos').textContent = (i + 1) + ' / ' + FOTOS.length
    $('lbPrev').disabled = i === 0
    $('lbNext').disabled = i === FOTOS.length - 1
  }
  function abrir(i) { mostrar(i); lb.hidden = false; document.body.classList.add('no-scroll') }
  function cerrar() { lb.hidden = true; document.body.classList.remove('no-scroll') }
  $('lbCerrar').addEventListener('click', cerrar)
  lb.addEventListener('click', function (e) { if (e.target === lb) cerrar() })
  $('lbPrev').addEventListener('click', function () { if (actual > 0) mostrar(actual - 1) })
  $('lbNext').addEventListener('click', function () { if (actual < FOTOS.length - 1) mostrar(actual + 1) })
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return
    if (e.key === 'Escape') cerrar()
    if (e.key === 'ArrowLeft' && actual > 0) mostrar(actual - 1)
    if (e.key === 'ArrowRight' && actual < FOTOS.length - 1) mostrar(actual + 1)
  })

  // ---------- Subir foto ----------
  var TIPOS = ['image/jpeg', 'image/png', 'image/webp']
  var MAX_ORIGINAL = 25 * 1024 * 1024 // la foto se reduce antes de enviarse
  var form = $('formFoto')
  var inputArchivo = $('archivo')
  var inputCamara = $('camara')
  var archivoElegido = null
  var urlPrevia = ''

  // Modo prueba: al abrir el archivo directamente o en tu computadora no hay Netlify que reciba la foto.
  var h = location.hostname
  var q = location.search
  var modoPrueba = (location.protocol === 'file:' || h === 'localhost' || h === '127.0.0.1' || q.indexOf('prueba') > -1) && q.indexOf('real') === -1

  function mostrarError(msg) {
    var e = $('error')
    e.textContent = msg
    e.hidden = !msg
  }
  function paso(n) {
    $('paso1').hidden = n !== 1
    $('paso2').hidden = n !== 2
  }
  function reiniciar() {
    archivoElegido = null
    if (urlPrevia) URL.revokeObjectURL(urlPrevia)
    urlPrevia = ''
    inputArchivo.value = ''
    inputCamara.value = ''
    $('nombre').value = ''
    $('dedicatoria').value = ''
    $('contador').textContent = '0 / 250'
    mostrarError('')
    paso(1)
    form.hidden = false
    $('exito').hidden = true
  }
  function elegida(f) {
    if (!f) return
    if (TIPOS.indexOf(f.type) === -1) return mostrarError('Ese formato no está permitido. Usa una foto JPG, PNG o WebP.')
    if (f.size > MAX_ORIGINAL) return mostrarError('La foto es demasiado grande. Elige otra o tómala de nuevo.')
    mostrarError('')
    archivoElegido = f
    if (urlPrevia) URL.revokeObjectURL(urlPrevia)
    urlPrevia = URL.createObjectURL(f)
    $('previa').src = urlPrevia
    paso(2)
  }
  $('btnElegir').addEventListener('click', function () { inputArchivo.click() })
  $('btnCamara').addEventListener('click', function () { inputCamara.click() })
  inputArchivo.addEventListener('change', function () { elegida(inputArchivo.files[0]) })
  inputCamara.addEventListener('change', function () { elegida(inputCamara.files[0]) })
  $('btnOtra').addEventListener('click', function () {
    archivoElegido = null
    inputArchivo.value = ''
    inputCamara.value = ''
    mostrarError('')
    paso(1)
  })
  $('btnCancelar').addEventListener('click', reiniciar)
  $('btnNueva').addEventListener('click', reiniciar)
  $('dedicatoria').addEventListener('input', function (e) {
    $('contador').textContent = e.target.value.length + ' / 250'
  })

  // Reduce la foto a ~1100 px (JPEG). Netlify acepta máximo 8 MB por envío.
  function reducir(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file)
      var img = new Image()
      img.onload = function () {
        var k = Math.min(1, 1100 / Math.max(img.naturalWidth, img.naturalHeight))
        var w = Math.max(1, Math.round(img.naturalWidth * k))
        var hh = Math.max(1, Math.round(img.naturalHeight * k))
        var c = document.createElement('canvas')
        c.width = w; c.height = hh
        var ctx = c.getContext('2d')
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, hh)
        ctx.drawImage(img, 0, 0, w, hh)
        URL.revokeObjectURL(url)
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error('blob')) }, 'image/jpeg', 0.85)
      }
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('img')) }
      img.src = url
    })
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault()
    var nombre = $('nombre').value.trim()
    if (!archivoElegido) return mostrarError('Primero elige una foto.')
    if (!nombre) return mostrarError('Escribe tu nombre para que sepamos quién la compartió.')
    mostrarError('')
    var btn = $('btnEnviar')
    btn.disabled = true
    btn.textContent = 'Enviando…'

    reducir(archivoElegido).then(function (blob) {
      var fd = new FormData(form)
      fd.set('form-name', C.formulario || 'fotos-cumple')
      fd.set('foto', blob, 'foto.jpg')
      fd.set('nombre', nombre)
      if (modoPrueba) return { ok: true }
      return fetch('/', { method: 'POST', body: fd })
    }).then(function (res) {
      if (!res.ok) throw new Error('http ' + res.status)
      $('exitoNombre').textContent = nombre
      $('avisoPrueba').hidden = !modoPrueba
      form.hidden = true
      $('exito').hidden = false
    }).catch(function () {
      mostrarError('No pudimos enviar tu foto. Revisa tu conexión e inténtalo de nuevo.')
    }).then(function () {
      btn.disabled = false
      btn.textContent = 'Enviar foto'
    })
  })
})()
