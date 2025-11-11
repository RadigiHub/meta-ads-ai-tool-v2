import { useState, useRef } from 'react'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

const PRESETS = [
  { key: 'square', label: 'Feed (1080×1080)', w:1080, h:1080 },
  { key: 'story', label: 'Story/Reel (1080×1920)', w:1080, h:1920 },
  { key: 'land', label: 'Landscape (1200×628)', w:1200, h:628 },
]

export default function Home() {
  const [form, setForm] = useState({
    brand: '', idea: '', audience: '', objective: '',
    mood: 'Bold high-contrast', headline: '',
    contact: '', website: ''
  })
  const [loading, setLoading] = useState(false)
  const [baseImg, setBaseImg] = useState(null)
  const [sizes, setSizes] = useState(['square'])
  const canvasesRef = useRef({})

  const onChange = (e)=> setForm(f=>({...f, [e.target.name]: e.target.value }))

  const toggleSize = (k) => {
    setSizes(prev => prev.includes(k) ? prev.filter(x=>x!==k) : [...prev, k])
  }

  async function generate() {
    setLoading(true)
    setBaseImg(null)
    try {
      const prompt = buildPrompt(form)
      const r = await fetch('/api/generate-image', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ prompt })
      })
      const data = await r.json()
      if (data.error) throw new Error(data.error)
      const dataUrl = `data:image/png;base64,${data.b64}`
      setBaseImg(dataUrl)
      await new Promise(res=>setTimeout(res, 30))
      await createVariants(dataUrl)
    } catch (e) {
      alert('Error: '+e.message)
    } finally {
      setLoading(false)
    }
  }

  function buildPrompt(f) {
    return `Design a high-conversion social ad creative for brand "${f.brand}". Offer: ${f.idea}. Audience: ${f.audience}. Objective: ${f.objective}. Mood: ${f.mood}. Headline: "${f.headline}". Include footer with "${f.contact}" and "${f.website}". Clean layout, strong contrast, brand-safe typography.`
  }

  async function createVariants(dataUrl) {
    const img = await loadImage(dataUrl)
    canvasesRef.current = {}
    for (const p of PRESETS.filter(p=>sizes.includes(p.key))) {
      const canvas = document.createElement('canvas')
      canvas.width = p.w; canvas.height = p.h
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,p.w,p.h)
      const ratio = Math.max(p.w/img.width, p.h/img.height)
      const newW = img.width * ratio
      const newH = img.height * ratio
      const dx = (p.w - newW)/2
      const dy = (p.h - newH)/2
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, dx, dy, newW, newH)
      drawFooter(ctx, p.w, p.h, form)
      canvasesRef.current[p.key] = canvas
    }
  }

  function drawFooter(ctx, w, h, f){
    if (!f.contact && !f.website) return
    const pad = Math.round(h*0.02)
    const barH = Math.round(h*0.08)
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, h-barH, w, barH)
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${Math.round(barH*0.45)}px Arial, Helvetica, sans-serif`
    ctx.textBaseline = 'middle'
    const text = [f.contact, f.website].filter(Boolean).join('   •   ')
    ctx.fillText(text, pad, h-barH/2)
  }

  function loadImage(src){
    return new Promise((res, rej)=>{
      const i = new Image()
      i.crossOrigin = 'anonymous'
      i.onload = ()=>res(i)
      i.onerror = ()=>rej(new Error('Image decode failed'))
      i.src = src
    })
  }

  async function downloadAll(){
    const zip = new JSZip()
    for (const p of PRESETS.filter(p=>sizes.includes(p.key))) {
      const canvas = canvasesRef.current[p.key]
      if (!canvas) continue
      const b64 = canvas.toDataURL('image/png').split(',')[1]
      zip.file(`${slug(form.brand)}_${p.w}x${p.h}.png`, b64, {base64:true})
    }
    const content = await zip.generateAsync({type:'blob'})
    saveAs(content, `${slug(form.brand)||'creative'}_variants.zip`)
  }

  const slug = (s)=> (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl p-6">
        <h1 className="text-2xl font-bold">Meta Ads AI Creative Generator — v2</h1>
        <p className="text-sm text-gray-600 mb-4">Enter inputs → Generate → Export multi-sizes + ZIP.</p>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Input label="Brand Name" name="brand" value={form.brand} onChange={onChange}/>
            <Input label="Idea / Offer" name="idea" value={form.idea} onChange={onChange}/>
            <Input label="Audience" name="audience" value={form.audience} onChange={onChange}/>
            <Input label="Objective" name="objective" value={form.objective} onChange={onChange}/>
            <Input label="Mood (style)" name="mood" value={form.mood} onChange={onChange}/>
            <Input label="Headline" name="headline" value={form.headline} onChange={onChange}/>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Contact" name="contact" value={form.contact} onChange={onChange}/>
              <Input label="Website" name="website" value={form.website} onChange={onChange}/>
            </div>

            <div className="mt-2">
              <p className="text-sm font-semibold mb-1">Choose sizes</p>
              <div className="flex flex-wrap gap-3">
                {PRESETS.map(p=>(
                  <label key={p.key} className="inline-flex items-center gap-2 text-sm bg-gray-100 px-3 py-1 rounded-full cursor-pointer">
                    <input type="checkbox" checked={sizes.includes(p.key)} onChange={()=>toggleSize(p.key)}/>
                    {p.label}
                  </label>
                ))}
              </div>
            </div>

            <button disabled={loading} onClick={generate}
              className="mt-3 px-4 py-2 rounded-lg bg-black text-white hover:opacity-90 disabled:opacity-50">
              {loading? 'Generating…' : 'Generate Image'}
            </button>

            {baseImg && (
              <button onClick={downloadAll} className="ml-3 mt-3 px-4 py-2 rounded-lg border border-black hover:bg-black hover:text-white">
                Download All (ZIP)
              </button>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-semibold mb-2">Preview</p>
            {!baseImg && <div className="h-[360px] flex items-center justify-center text-gray-400 border border-dashed rounded-lg">No image yet</div>}
            {baseImg && (
              <div className="space-y-4">
                <div className="flex gap-3 flex-wrap">
                  {PRESETS.filter(p=>sizes.includes(p.key)).map(p=>(
                    <div key={p.key} className="border rounded-lg p-2">
                      <p className="text-xs mb-1 text-gray-500">{p.label}</p>
                      <canvas id={`c-${p.key}`} width={p.w} height={p.h}
                        ref={el=>{ if (el && canvasesRef.current[p.key]) {
                          const ctx = el.getContext('2d'); ctx.drawImage(canvasesRef.current[p.key],0,0)
                        }}}
                        style={{width: Math.min(240, p.w/3)+'px', height: 'auto'}}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx global>{`
        *{box-sizing:border-box}
        body{font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial}
      `}</style>
    </main>
  )
}

function Input({label, ...props}){
  return (
    <label className="block">
      <span className="text-xs text-gray-600">{label}</span>
      <input {...props} className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"/>
    </label>
  )
}
