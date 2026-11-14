// Clic en una captura → se abre en grande; clic, Esc o tocar fuera la cierra.
(function () {
  var dialogo = document.createElement("dialog")
  dialogo.className = "fnf-ampliada"
  dialogo.setAttribute("aria-label", "Captura ampliada")
  var grande = document.createElement("img")
  dialogo.appendChild(grande)
  dialogo.addEventListener("click", function () { dialogo.close() })
  document.addEventListener("DOMContentLoaded", function () {
    document.body.appendChild(dialogo)
    document.querySelectorAll(".md-content article img").forEach(function (img) {
      img.setAttribute("tabindex", "0")
      img.setAttribute("role", "button")
      img.setAttribute("title", "Ver en grande")
      function abrir() {
        grande.src = img.currentSrc || img.src
        grande.alt = img.alt
        dialogo.showModal()
      }
      img.addEventListener("click", abrir)
      img.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir() }
      })
    })
  })
})()
