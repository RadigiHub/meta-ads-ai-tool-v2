export default async function handler(req, res){
  try{
    const { prompt } = req.body || {}
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY missing in env.' })
    }
    if (!prompt || prompt.length < 8){
      return res.status(400).json({ error: 'Prompt is required.' })
    }
    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size: '1024x1024',
        n: 1,
      })
    })
    const data = await resp.json()
    if (!resp.ok){
      return res.status(500).json({ error: data.error?.message || 'OpenAI request failed' })
    }
    const b64 = data.data?.[0]?.b64_json
    return res.status(200).json({ b64 })
  }catch(e){
    return res.status(500).json({ error: e.message })
  }
}
