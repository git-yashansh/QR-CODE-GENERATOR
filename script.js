// Simple QR Code Generator using API - NO LIBRARIES NEEDED!

function generateQRCode() {
  const input = document.getElementById("qr-input")
  const qrImage = document.getElementById("qr-image")
  const fgColor = document.getElementById("fg-color").value.replace("#", "")
  const bgColor = document.getElementById("bg-color").value.replace("#", "")
  const size = document.getElementById("size-slider").value

  const text = input.value.trim() || "Hello World!"

  // Create QR code URL using free API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&color=${fgColor}&bgcolor=${bgColor}`

  // Update the image
  qrImage.src = qrUrl
  qrImage.style.maxWidth = "100%"
  qrImage.style.height = "auto"
  qrImage.style.borderRadius = "12px"
  qrImage.style.boxShadow = "0 8px 30px rgba(0, 0, 0, 0.12)"

  console.log("QR Generated:", qrUrl)
}

function setColor(type, color) {
  const colorInput = document.getElementById(type === "fg" ? "fg-color" : "bg-color")
  colorInput.value = color

  // Update active state
  const colorGroup = colorInput.closest(".color-input-group")
  colorGroup.querySelectorAll(".color-preset").forEach((p) => p.classList.remove("active"))
  event.target.classList.add("active")

  generateQRCode()
}

function updateSize() {
  const sizeSlider = document.getElementById("size-slider")
  const sizeValue = document.getElementById("size-value")
  sizeValue.textContent = sizeSlider.value
}

function downloadQR() {
  const qrImage = document.getElementById("qr-image")
  const link = document.createElement("a")
  link.download = `qr-code-${Date.now()}.png`
  link.href = qrImage.src
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Show success feedback
  const downloadBtn = document.getElementById("download-btn")
  const originalHTML = downloadBtn.innerHTML
  downloadBtn.innerHTML = '<i class="fas fa-check"></i>'
  downloadBtn.style.background = "#22c55e"

  setTimeout(() => {
    downloadBtn.innerHTML = originalHTML
    downloadBtn.style.background = ""
  }, 2000)
}

function copyQR() {
  const qrImage = document.getElementById("qr-image")

  // Create canvas to convert image to blob
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  qrImage.onload = () => {
    canvas.width = qrImage.naturalWidth
    canvas.height = qrImage.naturalHeight
    ctx.drawImage(qrImage, 0, 0)

    canvas.toBlob((blob) => {
      if (navigator.clipboard && navigator.clipboard.write) {
        const item = new ClipboardItem({ "image/png": blob })
        navigator.clipboard
          .write([item])
          .then(() => {
            showCopySuccess()
          })
          .catch(() => {
            copyImageURL()
          })
      } else {
        copyImageURL()
      }
    })
  }

  // Trigger onload if image is already loaded
  if (qrImage.complete) {
    qrImage.onload()
  }
}

function copyImageURL() {
  const qrImage = document.getElementById("qr-image")
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(qrImage.src)
      .then(() => {
        showCopySuccess()
      })
      .catch(() => {
        alert("Failed to copy QR code. Please try downloading instead.")
      })
  } else {
    alert("Copy not supported. Please download the QR code instead.")
  }
}

function showCopySuccess() {
  const copyBtn = document.getElementById("copy-btn")
  const originalHTML = copyBtn.innerHTML
  copyBtn.innerHTML = '<i class="fas fa-check"></i>'
  copyBtn.style.borderColor = "#22c55e"
  copyBtn.style.color = "#22c55e"

  setTimeout(() => {
    copyBtn.innerHTML = originalHTML
    copyBtn.style.borderColor = ""
    copyBtn.style.color = ""
  }, 2000)
}

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId)
  if (section) {
    const offsetTop = section.offsetTop - 70
    window.scrollTo({
      top: offsetTop,
      behavior: "smooth",
    })

    // Update active nav link
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active")
      if (link.getAttribute("href") === `#${sectionId}`) {
        link.classList.add("active")
      }
    })
  }
}

// Initialize on page load - SIMPLIFIED
document.addEventListener("DOMContentLoaded", () => {
  // Generate initial QR code
  generateQRCode()

  // Initialize GIF background FIRST
  initGifBackground()

  // Initialize other features with delay
  setTimeout(() => {
    initScrollAnimations()
    initCounterAnimations()
    addHoverEffects()
  }, 500)

  // Setup navbar scroll effect
  window.addEventListener("scroll", () => {
    const navbar = document.querySelector(".navbar")
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop

    if (scrollTop > 50) {
      navbar.style.background = "rgba(255, 255, 255, 0.98)"
      navbar.style.boxShadow = "0 2px 20px rgba(0, 0, 0, 0.1)"
    } else {
      navbar.style.background = "rgba(255, 255, 255, 0.95)"
      navbar.style.boxShadow = "none"
    }

    // Trigger scroll animations
    handleScrollAnimations()
  })

  // Handle mobile navigation
  const navToggle = document.querySelector(".nav-toggle")
  const navMenu = document.querySelector(".nav-menu")

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      navMenu.classList.toggle("active")
      navToggle.classList.toggle("active")
    })
  }

  // Setup smooth scrolling for nav links
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()
      const targetId = this.getAttribute("href").substring(1)
      scrollToSection(targetId)
    })
  })
})

function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible")
      }
    })
  }, observerOptions)

  document.querySelectorAll(".animate-on-scroll").forEach((el) => {
    observer.observe(el)
  })
}

function initCounterAnimations() {
  const counters = document.querySelectorAll(".stat-number")

  counters.forEach((counter) => {
    const target = Number.parseFloat(counter.getAttribute("data-count"))
    const increment = target / 100
    let current = 0

    const updateCounter = () => {
      if (current < target) {
        current += increment
        if (target === 99.9) {
          counter.textContent = current.toFixed(1) + "%"
        } else if (target >= 1000) {
          counter.textContent = Math.floor(current).toLocaleString() + "+"
        } else {
          counter.textContent = Math.floor(current) + "★"
        }
        setTimeout(updateCounter, 20)
      } else {
        if (target === 99.9) {
          counter.textContent = target + "%"
        } else if (target >= 1000) {
          counter.textContent = target.toLocaleString() + "+"
        } else {
          counter.textContent = target + "★"
        }
      }
    }

    // Start animation after delay
    setTimeout(updateCounter, 1000)
  })
}

function handleScrollAnimations() {
  const elements = document.querySelectorAll(".animate-on-scroll")

  elements.forEach((element) => {
    const elementTop = element.getBoundingClientRect().top
    const elementVisible = 150

    if (elementTop < window.innerHeight - elementVisible) {
      element.classList.add("visible")
    }
  })
}

function addHoverEffects() {
  // Add ripple effect to buttons
  document.querySelectorAll(".btn-primary, .btn-secondary, .generate-btn").forEach((button) => {
    button.addEventListener("click", function (e) {
      const ripple = document.createElement("span")
      const rect = this.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      ripple.style.width = ripple.style.height = size + "px"
      ripple.style.left = x + "px"
      ripple.style.top = y + "px"
      ripple.classList.add("ripple")

      this.appendChild(ripple)

      setTimeout(() => {
        ripple.remove()
      }, 600)
    })
  })

  // Add particle effect on QR generation
  const generateBtn = document.querySelector(".generate-btn")
  if (generateBtn) {
    generateBtn.addEventListener("click", () => {
      createParticleEffect(generateBtn)
    })
  }
}

function createParticleEffect(element) {
  const rect = element.getBoundingClientRect()

  for (let i = 0; i < 5; i++) {
    const particle = document.createElement("div")
    particle.style.position = "fixed"
    particle.style.width = "4px"
    particle.style.height = "4px"
    particle.style.background = "#007bff"
    particle.style.borderRadius = "50%"
    particle.style.pointerEvents = "none"
    particle.style.zIndex = "9999"
    particle.style.left = rect.left + rect.width / 2 + "px"
    particle.style.top = rect.top + rect.height / 2 + "px"

    document.body.appendChild(particle)

    const angle = (Math.PI * 2 * i) / 5
    const velocity = 50 + Math.random() * 25

    particle.animate(
      [
        {
          transform: "translate(0, 0) scale(1)",
          opacity: 1,
        },
        {
          transform: `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity}px) scale(0)`,
          opacity: 0,
        },
      ],
      {
        duration: 800,
        easing: "ease-out",
      },
    ).onfinish = () => {
      particle.remove()
    }
  }
}

// Add CSS for ripple effect
const style = document.createElement("style")
style.textContent = `
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: ripple-animation 0.6s linear;
    pointer-events: none;
  }

  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`
document.head.appendChild(style)

// GIF Background Initialization - SIMPLIFIED
function initGifBackground() {
  console.log("🎬 Initializing GIF background...")

  const gif = document.getElementById("bg-gif")
  const gifBackground = document.querySelector(".gif-background")

  if (!gif) {
    console.error("❌ GIF element not found!")
    return
  }

  if (!gifBackground) {
    console.error("❌ GIF background container not found!")
    return
  }

  console.log("✅ GIF elements found")
  console.log("📁 GIF src:", gif.src)

  // Handle GIF loading
  gif.addEventListener("load", () => {
    console.log("✅ Background GIF loaded successfully!")
    gif.style.opacity = "1"
    // Remove debug borders
    setTimeout(() => {
      gifBackground.style.border = "none"
      gif.style.border = "none"
    }, 2000)
  })

  // Handle GIF errors
  gif.addEventListener("error", (e) => {
    console.error("❌ GIF loading error:", e)
    console.error("❌ Failed to load:", gif.src)
    // Hide GIF background if it fails to load
    gifBackground.style.display = "none"
  })

  // Force check if already loaded
  if (gif.complete && gif.naturalWidth > 0) {
    console.log("✅ GIF already loaded")
    gif.style.opacity = "1"
  }

  // Debug info
  setTimeout(() => {
    console.log("🔍 GIF Debug Info:")
    console.log("- Complete:", gif.complete)
    console.log("- Natural Width:", gif.naturalWidth)
    console.log("- Natural Height:", gif.naturalHeight)
    console.log("- Current src:", gif.src)
    console.log("- Display:", window.getComputedStyle(gifBackground).display)
    console.log("- Z-index:", window.getComputedStyle(gifBackground).zIndex)
  }, 1000)
}
