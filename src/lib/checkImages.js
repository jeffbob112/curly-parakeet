// Helpers for mobile check deposit images.

// Shrinks a photo to a small JPEG data URL so it can be saved with the transaction.
export function compressImage(file, maxWidth = 720, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => reject(new Error("That file doesn't look like an image."))
    img.src = url
  })
}

const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c])
const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

// A realistic-looking sample check (front), drawn as SVG.
export function sampleCheckFront({ payee = 'Jane Cooper', amount = 100, from = 'Sam Archer' } = {}) {
  const amt = Number(amount || 0).toFixed(2)
  const date = new Date().toLocaleDateString('en-US')
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 280">
  <defs><pattern id="p" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 12L12 0" stroke="#dbe7f3" stroke-width="1"/></pattern></defs>
  <rect width="640" height="280" rx="10" fill="#f4f9ff"/><rect width="640" height="280" rx="10" fill="url(#p)"/>
  <rect x="0" y="0" width="640" height="14" fill="#c8102e"/><rect x="320" y="0" width="320" height="14" fill="#012169"/>
  <text x="24" y="46" font-family="Arial" font-size="15" font-weight="700" fill="#1f2937">${esc(from)}</text>
  <text x="24" y="64" font-family="Arial" font-size="11" fill="#4b5563">123 Oak Avenue · Springfield</text>
  <text x="560" y="46" font-family="Arial" font-size="14" fill="#1f2937">1042</text>
  <text x="430" y="86" font-family="Arial" font-size="12" fill="#4b5563">DATE</text><line x1="470" y1="88" x2="616" y2="88" stroke="#6b7280"/>
  <text x="474" y="84" font-family="Courier New" font-size="15" fill="#1e3a8a">${date}</text>
  <text x="24" y="128" font-family="Arial" font-size="11" fill="#4b5563">PAY TO THE</text><text x="24" y="142" font-family="Arial" font-size="11" fill="#4b5563">ORDER OF</text>
  <line x1="92" y1="142" x2="470" y2="142" stroke="#6b7280"/><text x="100" y="137" font-family="Brush Script MT, cursive" font-size="24" fill="#1e3a8a">${esc(payee)}</text>
  <rect x="490" y="116" width="126" height="32" rx="4" fill="#fff" stroke="#6b7280"/><text x="498" y="138" font-family="Courier New" font-size="18" font-weight="700" fill="#1e3a8a">$ ${amt}</text>
  <line x1="24" y1="184" x2="560" y2="184" stroke="#6b7280"/><text x="30" y="179" font-family="Brush Script MT, cursive" font-size="20" fill="#1e3a8a">${amt} dollars only</text><text x="566" y="186" font-family="Arial" font-size="12" fill="#4b5563">DOLLARS</text>
  <text x="24" y="222" font-family="Arial" font-size="11" fill="#4b5563">MEMO</text><line x1="64" y1="224" x2="280" y2="224" stroke="#6b7280"/>
  <line x1="380" y1="224" x2="616" y2="224" stroke="#6b7280"/><text x="400" y="218" font-family="Brush Script MT, cursive" font-size="24" fill="#1e3a8a">${esc(from)}</text>
  <text x="24" y="262" font-family="Courier New" font-size="16" fill="#111827">⑆121000358⑆ 004821930⑈ 1042</text>
</svg>`)
}

// The back of the check: endorsement + "ORIGINAL DOCUMENT" watermark (like the screenshot).
export function sampleCheckBack({ payee = 'Jane Cooper' } = {}) {
  return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 280">
  <rect width="640" height="280" rx="10" fill="#f8fafc"/>
  <g opacity=".13" font-family="Arial" font-weight="700" fill="#334155" transform="rotate(-18 320 140)">
    <text x="90" y="120" font-size="44">ORIGINAL</text><text x="200" y="190" font-size="44">DOCUMENT</text>
  </g>
  <rect x="24" y="24" width="250" height="232" fill="none" stroke="#94a3b8" stroke-dasharray="4 4"/>
  <text x="34" y="44" font-family="Arial" font-size="10" fill="#64748b">ENDORSE HERE</text>
  <line x1="34" y1="94" x2="264" y2="94" stroke="#94a3b8"/><text x="40" y="88" font-family="Brush Script MT, cursive" font-size="24" fill="#1e3a8a">${esc(payee)}</text>
  <text x="40" y="122" font-family="Arial" font-size="13" font-style="italic" fill="#1e3a8a">For deposit only at</text>
  <text x="40" y="140" font-family="Arial" font-size="13" font-style="italic" fill="#1e3a8a">Parakeet Bank</text>
  <line x1="34" y1="160" x2="264" y2="160" stroke="#94a3b8"/>
  <text x="34" y="244" font-family="Arial" font-size="8" fill="#94a3b8">DO NOT WRITE, STAMP OR SIGN BELOW THIS LINE</text>
  <text x="450" y="250" font-family="Arial" font-size="9" fill="#94a3b8">Security features included</text>
</svg>`)
}
