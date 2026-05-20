import { useState, useEffect } from 'react'

// ── PRICING ──
const RECURRING = { base: 0.065, min: 125, fa: { weekly: -0.10, biweekly: 0, monthly: 0.15 }, ca: { light: -0.05, standard: 0, heavy: 0.10 } }
const DEEP_RATE = 0.18, DEEP_MIN = 225
const MIO_RATE = 0.22, MIO_MIN = 275
const AIRBNB_RATE = 0.12, AIRBNB_MIN = 150

function calcRecurring(sqft, freq, cond, pets) {
  let b = sqft * RECURRING.base * (1 + RECURRING.fa[freq]) * (1 + RECURRING.ca[cond])
  if (pets) b *= 1.08
  return Math.max(Math.ceil(b / 5) * 5, RECURRING.min)
}
function calcPrice(sqft, svc, freq, cond, pets) {
  const s = parseInt(sqft)
  if (svc === 'recurring') return calcRecurring(s, freq, cond, pets)
  if (svc === 'deep') return Math.max(Math.ceil(s * DEEP_RATE / 5) * 5, DEEP_MIN)
  if (svc === 'mio') return Math.max(Math.ceil(s * MIO_RATE / 5) * 5, MIO_MIN)
  if (svc === 'airbnb') return Math.max(Math.ceil(s * AIRBNB_RATE / 5) * 5, AIRBNB_MIN)
  return 0
}
function rng(exact) { return { lo: Math.max(Math.floor(exact * 0.85 / 5) * 5, RECURRING.min), hi: Math.ceil(exact * 1.10 / 5) * 5 } }
function fmtP(n) {
  const d = n.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

const FL = { weekly: 'week', biweekly: '2 weeks', monthly: 'month' }
const SVC_LABELS = { recurring: 'Recurring Clean', deep: 'Deep Clean', mio: 'Move In / Move Out', airbnb: 'Airbnb Turnover' }

const SCOPES = {
  recurring: { sections: [
    { title: 'Throughout Your Home', items: ['Dust all accessible surfaces — flat surfaces, shelves, décor', 'Wipe exterior of appliances', 'Clean and sanitize countertops', 'Clean sinks and faucets', 'Clean mirrors and glass (interior)', 'Vacuum carpets and rugs', 'Sweep and mop hard floors', 'Empty trash (client-provided liners)'] },
    { title: 'Bathrooms', items: ['Toilets — full clean and sanitize', 'Tubs and showers', 'Vanities and sinks', 'Mirrors'] },
    { title: 'Kitchen', items: ['Exterior of appliances — stove, fridge, dishwasher, microwave', 'Countertops and backsplash', 'Sink and faucet', 'Spot clean cabinet exteriors'] },
    { title: 'Bedrooms & Living Areas', items: ['Dust surfaces and furniture', 'Make beds (if linens are left out)', 'Vacuum and mop floors', 'Empty trash'] }
  ]},
  deep: { sections: [
    { title: 'Everything in Recurring, Plus:', items: ['Baseboards hand-wiped', 'Door frames, doors, and handles wiped', 'Light switches and outlet covers wiped', 'Interior window sills and tracks', 'Interior glass on windows (ground-level, reachable)', 'Blinds dusted slat by slat', 'Ceiling fans wiped', 'Vents and air returns dusted and wiped', 'Detailed dusting of décor, frames, shelves — items moved', 'Behind and under furniture that can be reasonably moved'] },
    { title: 'Kitchen Additions', items: ['Interior of microwave', 'Interior of oven', 'Detailed cabinet exterior cleaning — full degrease', 'Backsplash scrubbed including grout lines', 'Range hood and vent cleaned', 'Small appliance exteriors detailed', 'Around stove drip pans and under burners'] },
    { title: 'Bathroom Additions', items: ['Tile and grout scrubbed in showers and tubs', 'Soap scum and hard water buildup treated', 'Detailed cleaning of toilet base, behind toilet, and hinges', 'Exhaust fan covers dusted and wiped'] },
    { title: 'Bedroom Additions', items: ['Headboards and bed frames dusted and wiped', 'Lamp bases and shades dusted', 'Closet floors vacuumed where accessible'] }
  ]},
  mio: { sections: [
    { title: 'Everything in Deep Clean, Plus:', items: ['Full empty-home clean — no furniture or clutter assumed', 'Inside all cabinets and drawers', 'Inside all closets', 'Inside refrigerator (full interior)', 'Inside oven (full interior)', 'All appliance interiors', 'Garage sweep if accessible', 'Window sills throughout', 'Final walk-through inspection before handoff'] }
  ]},
  airbnb: { sections: [
    { title: 'General Reset', items: ['Dust all surfaces, shelves, décor, and reachable ledges', 'Wipe doors, handles, light switches, and baseboards', 'Vacuum carpets and rugs', 'Sweep and mop all hard floors', 'Empty trash and replace liners', 'Straighten furniture and stage spaces for guest arrival', 'Check for left-behind guest items — place in designated lost and found area'] },
    { title: 'Kitchen', items: ['Clean and sanitize countertops and backsplash', 'Wipe exterior of all appliances', 'Unload dishwasher and put dishes away', 'Load dishwasher with dirty dishes', 'Clean inside of microwave', 'Clean sink and polish faucet', 'Wipe cabinet fronts and handles', 'Clear fridge of guest food unless otherwise requested'] },
    { title: 'Bedrooms', items: ['Strip used beds and replace with clean linens (host-provided)', 'Make beds neatly — hotel-style', 'Dust nightstands, lamps, dressers, and surfaces', 'Clean mirrors', 'Empty bedroom trash'] },
    { title: 'Bathrooms', items: ['Clean and sanitize toilets, sinks, tubs, and showers', 'Scrub shower walls, doors, and fixtures', 'Clean mirrors and glass', 'Wipe counters and cabinet fronts', 'Replace towels (host-provided)', 'Restock toilet paper, soap, and basic amenities', 'Mop floors'] },
    { title: 'Laundry (Standard Turnover)', items: ['Wash, dry, and fold standard bedding and towels', 'One set per bed', 'Standard towel count per bathroom'] }
  ]}
}

async function ping(data) {
  if (!window.emailjs) return
  try {
    await window.emailjs.send('service_l19rftg', 'template_tealteam', {
      ...data,
      submitted_at: new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })
    }, 'SyIUlMbLViLl21uCj')
  } catch (e) {}
}

// ── CALCULATOR ──
function Calculator() {
  const [step, setStep] = useState(1)
  const [svc, setSvc] = useState('recurring')
  const [sqft, setSqft] = useState('')
  const [freq, setFreq] = useState('biweekly')
  const [cond, setCond] = useState('standard')
  const [pets, setPets] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [scopeOpen, setScopeOpen] = useState(false)

  const isRecurring = svc === 'recurring'
  const exact = sqft ? calcPrice(sqft, svc, freq, cond, pets) : 0
  const range = exact ? rng(exact) : { lo: 0, hi: 0 }

  const dots = [1, 2, 3, 4].map(n => (
    <div key={n} className={`d${n <= step ? ' on' : ''}`} />
  ))

  const ScopeContent = () => (
    <div style={{ marginTop: 12, borderTop: '1px solid var(--borderw)', paddingTop: 12 }}>
      {SCOPES[svc].sections.map(sec => (
        <div key={sec.title} className="scope-section">
          <div className="scope-head">{sec.title}</div>
          {sec.items.map(item => (
            <div key={item} className="scope-item">{item}</div>
          ))}
        </div>
      ))}
    </div>
  )

  const handleStep1 = async () => {
    const s = parseInt(sqft)
    if (!sqft || isNaN(s) || s < 200 || s > 10000) { setErr('Please enter a valid square footage (200–10,000).'); return }
    await ping({ stage: 'TEAL — Saw range', svc, sqft: s, freq, cond, pets: pets ? 'Yes' : 'No' })
    setErr(''); setStep(2)
  }

  const handleStep3 = async () => {
    const d = phone.replace(/\D/g, '')
    if (!name.trim()) { setErr('Please enter your name.'); return }
    if (d.length !== 10) { setErr('Please enter a valid 10-digit phone number.'); return }
    setBusy(true); setErr('')
    const p = calcPrice(parseInt(sqft), svc, freq, cond, pets)
    await ping({ stage: 'TEAL — Lead captured', name, phone: d, svc, sqft, freq, price: `$${p}` })
    setBusy(false); setStep(4)
  }

  const handleBook = async () => {
    setBusy(true)
    const p = calcPrice(parseInt(sqft), svc, freq, cond, pets)
    await ping({ stage: 'TEAL — Clicked book', name, phone: phone.replace(/\D/g, ''), svc, sqft, price: `$${p}` })
    alert('Booking system coming soon. We will be in touch to confirm your appointment.')
    setBusy(false)
  }

  return (
    <div className="calc">
      <div className="calc-hd">
        <span className="calc-hd-l">Quote Calculator</span>
        <div className="dots">{dots}</div>
      </div>
      <div className="calc-bd">
        {step === 1 && (
          <>
            <div className="ctitle">Tell us about your home.</div>
            <div className="csub">See your price in seconds — no phone call required.</div>
            <div className="cf">
              <label className="cl">Service</label>
              <div className="segs" style={{ flexWrap: 'wrap' }}>
                {['recurring', 'deep', 'mio', 'airbnb'].map(s => (
                  <button key={s} className={`seg${svc === s ? ' on' : ''}`} style={{ minWidth: '48%' }} onClick={() => { setSvc(s); setScopeOpen(false) }}>{SVC_LABELS[s]}</button>
                ))}
              </div>
              <div className="ch" style={{ cursor: 'pointer', color: 'var(--teal)', marginTop: 8 }} onClick={() => setScopeOpen(o => !o)}>
                {scopeOpen ? 'Hide' : 'Show'} what's included {scopeOpen ? '▲' : '▼'}
              </div>
              {scopeOpen && <ScopeContent />}
            </div>
            <div className="cf">
              <label className="cl">Square footage</label>
              <input className="ci" type="number" placeholder="e.g. 1,800" value={sqft} onChange={e => { setSqft(e.target.value); setErr('') }} />
              <div className="ch">Not sure? Estimate — we confirm before your first clean.</div>
            </div>
            {isRecurring && (
              <>
                <div className="cf">
                  <label className="cl">Frequency</label>
                  <div className="segs">
                    {['weekly', 'biweekly', 'monthly'].map(f => (
                      <button key={f} className={`seg${freq === f ? ' on' : ''}`} onClick={() => setFreq(f)}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
                    ))}
                  </div>
                </div>
                <div className="cf">
                  <label className="cl">Home condition</label>
                  <div className="segs">
                    {[['light', 'Tidy'], ['standard', 'Standard'], ['heavy', 'Needs work']].map(([v, l]) => (
                      <button key={v} className={`seg${cond === v ? ' on' : ''}`} onClick={() => setCond(v)}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="cf">
                  <div className={`tr${pets ? ' on' : ''}`} onClick={() => setPets(p => !p)}>
                    <div className={`pill${pets ? ' on' : ''}`}><div className={`pd${pets ? ' on' : ''}`} /></div>
                    <span className={`tl${pets ? ' on' : ''}`}>We have pets</span>
                  </div>
                </div>
              </>
            )}
            {err && <div className="cerr">{err}</div>}
            <button className="cbp" onClick={handleStep1}>See My Estimate</button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="ctitle">Your estimate.</div>
            <div className="csub">Most homes like yours in Greenville fall in this range.</div>
            <div className="pb">
              <div className="pb-l">{SVC_LABELS[svc]}</div>
              <div className="pr">${range.lo}&ndash;${range.hi}</div>
              <div className="pf">{isRecurring ? `per ${FL[freq]}` : 'one-time service'}</div>
              <div className="pn">Enter your info to lock in your exact price</div>
            </div>
            <div className="srows">
              <div className="srow"><span className="slabel">Service</span><span className="sval">{SVC_LABELS[svc]}</span></div>
              <div className="srow"><span className="slabel">Home size</span><span className="sval">{parseInt(sqft).toLocaleString()} sqft</span></div>
              {isRecurring && <div className="srow"><span className="slabel">Frequency</span><span className="sval">{freq.charAt(0).toUpperCase() + freq.slice(1)}</span></div>}
            </div>
            <button className="cbt" onClick={() => setStep(3)}>Get My Exact Price</button>
            <button className="cbg" onClick={() => setStep(1)}>Edit details</button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="ctitle">Almost there.</div>
            <div className="csub">Exact quote and availability — 10 seconds.</div>
            <div className="cf">
              <label className="cl">Your name</label>
              <input className="ci" type="text" placeholder="First and last name" value={name} onChange={e => { setName(e.target.value); setErr('') }} />
            </div>
            <div className="cf">
              <label className="cl">Phone number</label>
              <input className="ci" type="tel" placeholder="(864) 555-0100" value={phone} onChange={e => { setPhone(fmtP(e.target.value)); setErr('') }} />
              <div className="ch">Used only to confirm your booking. No spam.</div>
            </div>
            {err && <div className="cerr">{err}</div>}
            <button className="cbp" onClick={handleStep3} disabled={busy}>{busy ? 'One moment...' : 'Show My Exact Price'}</button>
            <button className="cbg" onClick={() => setStep(2)} disabled={busy}>Back</button>
          </>
        )}

        {step === 4 && (
          <>
            <div className="ctitle">{name ? `Your price, ${name.trim().split(' ')[0]}.` : 'Your exact price.'}</div>
            <div className="csub">Transparent pricing — what you see is what you pay.</div>
            <div className="pb">
              <div className="pb-l">{SVC_LABELS[svc]}</div>
              <div className="pe">${exact}</div>
              <div className="pf">{isRecurring ? `every ${FL[freq]}` : 'one-time service'}</div>
            </div>
            <div className="srows">
              <div className="srow"><span className="slabel">Service</span><span className="sval">{SVC_LABELS[svc]}</span></div>
              <div className="srow"><span className="slabel">Home size</span><span className="sval">{parseInt(sqft).toLocaleString()} sqft</span></div>
              {isRecurring && <div className="srow"><span className="slabel">Frequency</span><span className="sval">{freq.charAt(0).toUpperCase() + freq.slice(1)}</span></div>}
            </div>
            <button className="cbt" onClick={handleBook} disabled={busy}>{busy ? 'Redirecting...' : 'Book My Cleaning'}</button>
            <button className="cbg" onClick={() => setStep(3)} disabled={busy}>Back</button>
          </>
        )}
      </div>
    </div>
  )
}

// ── MAIN APP ──
export default function App() {
  return (
    <>
      <nav>
        <a href="#" className="nav-id">
          <img src="/logo.png" alt="Teal Team Cleaning" style={{ height: 36, width: 36, objectFit: 'contain', borderRadius: 4 }} />
          <span className="nav-div" />
          <span className="nav-full">Teal Team Cleaning</span>
        </a>
        <ul className="nav-r">
          <li><a href="#services">Services</a></li>
          <li><a href="#brief">How It Works</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#quote" className="ncta">Get a Quote</a></li>
        </ul>
      </nav>

   <section className="hero" style={{ paddingTop: 0 }}>
  <div className="hbg"><img src="/hero.jpg" alt="" /></div>
  <div className="hgrid" />
  <div className="hc" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
    <div style={{ flex: '1 1 340px', maxWidth: 520 }}>
      <div className="heyebrow">Greenville, SC — Residential Cleaning</div>
      <h1>Your home,<br />handled.</h1>
      <p className="hsub">See your price in 60 seconds. Book online. We show up. No calls. No consultations. No waiting.</p>
      <div className="hbtns">
        <a href="#services" className="btn-g">View Services</a>
      </div>
    </div>
    <div style={{ flex: '1 1 340px', maxWidth: 480 }}>
      <Calculator />
    </div>
  </div>
</section>

      <section id="services">
        <div className="svc-top">
          <div>
            <div className="ey">Services</div>
            <h2 className="sh">The mission<br />defines the team.</h2>
          </div>
          <p className="svc-right">Standard recurring cleans. Deep cleans. Move-in and move-out. Airbnb turnovers. Every service is booked online, confirmed instantly, and executed without you having to manage a thing.</p>
        </div>
        <div className="svc-grid">
          {[
            { n: '01', title: 'Recurring Clean', desc: 'Weekly, bi-weekly, or monthly. Your home stays consistently clean without you thinking about it.' },
            { n: '02', title: 'Deep Clean', desc: 'Top to bottom. Every surface. Required for first-time clients — sets the baseline so recurring cleans stay sharp.' },
            { n: '03', title: 'Move In / Out', desc: 'Leave the old place spotless. Start the new one right. We work around closing timelines.' },
            { n: '04', title: 'Airbnb Turnover', desc: 'Fast, reliable turnovers synced to your booking calendar. Post-clean checklist summary sent after every job.' },
          ].map(s => (
            <div key={s.n} className="svc-card">
              <div className="svc-corner" />
              <div className="svc-n">{s.n}</div>
              <h3 className="svc-title">{s.title}</h3>
              <p className="svc-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="brief">
        <div className="brief-in">
          <div className="brief-img">
            <img src="/cleaning.jpg" alt="" />
            <div className="brief-tag">Deployed to your door — Greenville &amp; surrounding areas</div>
          </div>
          <div>
            <div className="ey">The Brief</div>
            <h2 className="sh">Briefed.<br />Booked.<br />Clean.</h2>
            <div className="brief-steps">
              {[
                { i: '01', t: 'Get your instant quote', d: 'Enter your home details. See your price range in seconds. No phone call required.' },
                { i: '02', t: 'Book online', d: 'Pick your date and time. Pay securely. Confirmation comes immediately.' },
                { i: '03', t: 'We execute', d: 'Our vetted, insured team arrives on schedule. You don\'t need to be home.' },
                { i: '04', t: 'Mission debrief', d: 'A post-clean summary lands in your inbox. You know exactly what was done.' },
              ].map(s => (
                <div key={s.i} className="bstep">
                  <div className="bstep-i">{s.i}</div>
                  <div><div className="bstep-t">{s.t}</div><p className="bstep-d">{s.d}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="quote">
        <div className="q-in">
          <div>
            <div className="ey">Instant Quote</div>
            <h2 className="sh">See your price.<br />Right now.</h2>
            <p className="q-body">No forms. No callbacks. No consultations. Other cleaning companies make you call, wait, and sit through an in-person estimate before they'll tell you what it costs. We don't.</p>
            <div className="q-specs">
              {[
                ['Online booking', 'Always open'],
                ['Contracts', 'None'],
                ['Insurance', 'Fully covered'],
                ['Background checks', 'Every cleaner'],
                ['Service area', 'Greenville, SC'],
              ].map(([l, v]) => (
                <div key={l} className="qspec"><span className="qlabel">{l}</span><span className="qval">{v}</span></div>
              ))}
            </div>
          </div>
          <Calculator />
        </div>
      </section>

      <section id="about">
        <div className="about-in">
          <div className="aimg">
            <img src="/supplies.jpg" alt="" />
            <div className="atag">Greenville, SC — Est. 2026</div>
          </div>
          <div>
            <div className="ey">About</div>
            <h2 className="sh">Built different.<br />On purpose.</h2>
            <p className="abody">Most cleaning companies make you work to give them your business. Call for a quote. Wait for a callback. Schedule a consultation. We built Teal Team around the opposite — your time matters, the price should be transparent, and booking should take less than two minutes.<br /><br />Every cleaner is vetted, insured, and trained. Every job includes a post-clean checklist summary. And if something isn't right, we make it right.</p>
            {[
              ['Serving', 'Greenville, Simpsonville, Mauldin, Easley & surrounding areas'],
              ['Insured', 'Every job, every time'],
              ['Background checked', 'Every cleaner before their first assignment'],
              ['Booking', '100% online — no calls required'],
            ].map(([k, v]) => (
              <div key={k} className="aline"><strong>{k}</strong>{v}</div>
            ))}
          </div>
        </div>
      </section>

      <footer>
        <div className="ft">
          <div>
            <div className="fw">Teal Team Cleaning</div>
            <p className="ftag">Your home, handled. Serving Greenville, SC and surrounding areas.</p>
          </div>
          <div>
            <div className="fch">Services</div>
            <ul className="flinks">
              <li><a href="#services">Recurring Clean</a></li>
              <li><a href="#services">Deep Clean</a></li>
              <li><a href="#services">Move In / Out</a></li>
              <li><a href="#services">Airbnb Turnover</a></li>
            </ul>
          </div>
          <div>
            <div className="fch">Company</div>
            <ul className="flinks">
              <li><a href="#brief">How It Works</a></li>
              <li><a href="#about">About</a></li>
              <li><a href="#quote">Get a Quote</a></li>
              <li><a href="mailto:hello@tealteamcleaning.com">hello@tealteamcleaning.com</a></li>
            </ul>
          </div>
        </div>
        <div className="fb">
          <span>2026 Teal Team Cleaning · Greenville, SC</span>
          <span>Licensed · Insured · Background Checked</span>
        </div>
      </footer>
    </>
  )
}
