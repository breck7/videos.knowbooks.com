// Knowbooks Videos player.
//
// Bandwidth design:
//  - Each card shows a small poster JPG that the browser loads lazily
//    (native <img loading="lazy">).
//  - No <video> downloads anything on page load. A single shared <video>
//    lives in a <dialog> and only gets a src when you press play
//    (preload="none" + src set on demand), so you only ever fetch the
//    video you actually watch.
//  - Closing the dialog drops the src, which aborts any in-flight fetch.

(function () {
  "use strict"

  const gallery = document.getElementById("kb-gallery")
  if (!gallery) return

  const dialog = document.getElementById("kb-dialog")
  const player = document.getElementById("kb-player")
  const dialogTitle = document.getElementById("kb-dialog-title")
  const download = document.getElementById("kb-download")
  const sortButton = document.getElementById("kb-sort")
  const countLabel = document.getElementById("kb-count")

  const cards = Array.from(gallery.querySelectorAll(".kb-card"))
  if (countLabel) countLabel.textContent = cards.length + (cards.length === 1 ? " video" : " videos")

  // Newest first by default; chronological is one click away.
  let ascending = false

  function renderSortLabel() {
    if (!sortButton) return
    sortButton.textContent = ascending ? "Oldest first" : "Newest first"
    sortButton.setAttribute("aria-label", "Sort by date: " + sortButton.textContent)
  }

  function sortCards() {
    order = cards.slice().sort((a, b) => {
      const cmp = String(a.dataset.date).localeCompare(String(b.dataset.date))
      return ascending ? cmp : -cmp
    })
    const fragment = document.createDocumentFragment()
    order.forEach((card) => fragment.appendChild(card))
    gallery.appendChild(fragment)
  }

  // Current display order + which card is showing, so arrows can cycle.
  let order = cards.slice()
  let currentIndex = 0

  function loadCard(card) {
    if (!card) return
    currentIndex = order.indexOf(card)
    player.poster = card.dataset.poster || ""
    player.src = card.dataset.src
    dialogTitle.textContent = card.dataset.title || ""
    download.href = card.dataset.src
    download.setAttribute("download", card.dataset.src)
    const attempt = player.play()
    if (attempt && typeof attempt.catch === "function") attempt.catch(() => {})
  }

  // Move by delta (+1 next, -1 previous), wrapping around the ends.
  function step(delta) {
    if (!order.length) return
    currentIndex = (currentIndex + delta + order.length) % order.length
    loadCard(order[currentIndex])
  }

  function openPlayer(card) {
    loadCard(card)
    if (!dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal()
      } else {
        dialog.setAttribute("open", "")
      }
    }
  }

  function stopPlayback() {
    player.pause()
    player.removeAttribute("src")
    player.load()
  }

  function closePlayer() {
    stopPlayback()
    if (dialog.open) dialog.close()
  }

  gallery.addEventListener("click", (event) => {
    const card = event.target.closest(".kb-card")
    if (card) openPlayer(card)
  })

  const closeButton = document.getElementById("kb-close")
  if (closeButton) closeButton.addEventListener("click", closePlayer)

  // Both the header arrows (desktop) and the large on-video arrows (touch)
  // cycle through videos.
  const prevButton = document.getElementById("kb-prev")
  const nextButton = document.getElementById("kb-next")
  const prevOverlay = document.getElementById("kb-prev-overlay")
  const nextOverlay = document.getElementById("kb-next-overlay")
  if (prevButton) prevButton.addEventListener("click", () => step(-1))
  if (nextButton) nextButton.addEventListener("click", () => step(1))
  if (prevOverlay) prevOverlay.addEventListener("click", () => step(-1))
  if (nextOverlay) nextOverlay.addEventListener("click", () => step(1))

  // Left/right arrow keys cycle through videos while the player is open.
  document.addEventListener("keydown", (event) => {
    if (!dialog.open) return
    if (event.key === "ArrowRight") {
      event.preventDefault()
      step(1)
    } else if (event.key === "ArrowLeft") {
      event.preventDefault()
      step(-1)
    }
  })

  // Clicking the dark area around the dialog closes it.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closePlayer()
  })

  // Fires for Esc too, so make sure the network fetch is dropped either way.
  dialog.addEventListener("close", stopPlayback)

  if (sortButton) {
    sortButton.addEventListener("click", () => {
      ascending = !ascending
      renderSortLabel()
      sortCards()
    })
  }

  renderSortLabel()
  sortCards()
})()
