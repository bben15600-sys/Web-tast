// Pedal — bikeshare signup flow screens
// Blue + white modern aesthetic. Original visuals; no branded UI.

const BLUE = '#0A66FF';
const BLUE_DARK = '#0850CC';
const BLUE_SOFT = '#EAF1FF';
const BLUE_TINT = '#F5F8FF';
const INK = '#0B1220';
const INK_2 = '#445069';
const INK_3 = '#8892A6';
const LINE = '#E6EBF2';
const FONT = '-apple-system, "SF Pro", system-ui, sans-serif';

// ─── shared bits ───────────────────────────────────────────
function ScreenBg({ children, bg = '#fff' }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: bg,
      fontFamily: FONT, color: INK, position: 'relative',
      display: 'flex', flexDirection: 'column',
    }}>{children}</div>
  );
}

function PrimaryBtn({ label, disabled }) {
  return (
    <div style={{
      height: 54, borderRadius: 16, background: disabled ? '#C9D5EC' : BLUE,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 17, fontWeight: 600, letterSpacing: -0.2,
      boxShadow: disabled ? 'none' : '0 8px 20px rgba(10,102,255,0.28)',
    }}>{label}</div>
  );
}

function GhostBtn({ label, icon }) {
  return (
    <div style={{
      height: 54, borderRadius: 16, background: '#fff',
      border: `1px solid ${LINE}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      color: INK, fontSize: 16, fontWeight: 600, letterSpacing: -0.2,
    }}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function TopBar({ step, total, onlyBack = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '70px 20px 12px',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        border: `1px solid ${LINE}`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
          <path d="M8 2L2 8l6 6" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {!onlyBack && (
        <div style={{ flex: 1, height: 6, borderRadius: 999, background: BLUE_SOFT, overflow: 'hidden' }}>
          <div style={{ width: `${(step / total) * 100}%`, height: '100%', background: BLUE, borderRadius: 999 }} />
        </div>
      )}
      {!onlyBack && (
        <div style={{ fontSize: 13, color: INK_3, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
          {step}/{total}
        </div>
      )}
    </div>
  );
}

// Tiny wordmark — geometric "P" in a circle (original mark)
function PedalMark({ size = 56 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56">
      <circle cx="28" cy="28" r="28" fill={BLUE}/>
      <circle cx="28" cy="28" r="22" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity="0.25"/>
      <path d="M21 16h10a8 8 0 010 16h-5v8h-5V16zm5 5v6h5a3 3 0 000-6h-5z" fill="#fff"/>
    </svg>
  );
}

// ─── 1. Welcome ────────────────────────────────────────────
function S1_Welcome() {
  return (
    <ScreenBg>
      {/* hero band */}
      <div style={{
        height: 470, background: `linear-gradient(180deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* faint city grid */}
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.15 }} viewBox="0 0 402 470" preserveAspectRatio="none">
          <defs>
            <pattern id="g1" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0v40" fill="none" stroke="#fff" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g1)"/>
        </svg>
        {/* concentric "ride" rings */}
        <div style={{ position: 'absolute', top: 200, left: '50%', transform: 'translateX(-50%)' }}>
          {[260, 200, 140, 80].map((s, i) => (
            <div key={i} style={{
              position: 'absolute', width: s, height: s, borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.18)',
              top: -s/2, left: -s/2,
            }}/>
          ))}
          <div style={{
            position: 'absolute', width: 88, height: 88, borderRadius: '50%',
            background: '#fff', top: -44, left: -44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
          }}>
            <PedalMark size={48}/>
          </div>
        </div>
        {/* status bar text white */}
        <div style={{
          position: 'absolute', top: 130, left: 24, right: 24, color: '#fff',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 2, opacity: 0.7 }}>PEDAL</div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '36px 28px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1, lineHeight: 1.05 }}>
          The city,<br/>on two wheels.
        </div>
        <div style={{ fontSize: 16, color: INK_2, marginTop: 14, lineHeight: 1.45 }}>
          Unlock a bike at any of 1,200+ stations.
          Pay by the minute, or go unlimited.
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: 44, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PrimaryBtn label="Create account"/>
          <div style={{ textAlign: 'center', fontSize: 15, color: INK_2, paddingTop: 4 }}>
            Already riding? <span style={{ color: BLUE, fontWeight: 600 }}>Sign in</span>
          </div>
        </div>
      </div>
    </ScreenBg>
  );
}

// ─── 2. Phone number ───────────────────────────────────────
function S2_Phone() {
  return (
    <ScreenBg>
      <TopBar step={1} total={5}/>
      <div style={{ padding: '24px 28px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1 }}>
          What's your<br/>phone number?
        </div>
        <div style={{ fontSize: 15, color: INK_2, marginTop: 10, lineHeight: 1.45 }}>
          We'll text you a code to verify it's really you.
        </div>

        {/* input */}
        <div style={{
          marginTop: 36, display: 'flex', alignItems: 'stretch', gap: 10,
        }}>
          <div style={{
            height: 60, padding: '0 14px', borderRadius: 14,
            border: `1.5px solid ${LINE}`, display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 18, fontWeight: 500,
          }}>
            🇺🇸 <span>+1</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ marginLeft: 2 }}>
              <path d="M1 1l4 4 4-4" stroke={INK_3} strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{
            flex: 1, height: 60, padding: '0 16px', borderRadius: 14,
            border: `1.5px solid ${BLUE}`, display: 'flex', alignItems: 'center',
            fontSize: 22, fontWeight: 500, letterSpacing: 0.5,
            background: BLUE_TINT,
          }}>
            (415) 555&nbsp;
            <span style={{ width: 2, height: 26, background: BLUE, animation: 'none' }}/>
          </div>
        </div>

        <div style={{ fontSize: 13, color: INK_3, marginTop: 14, lineHeight: 1.5 }}>
          By continuing you agree to our <span style={{ color: INK, textDecoration: 'underline' }}>Terms</span> and <span style={{ color: INK, textDecoration: 'underline' }}>Privacy Policy</span>. Standard message rates apply.
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: 24 }}>
          <PrimaryBtn label="Send code"/>
        </div>
      </div>
    </ScreenBg>
  );
}

// ─── 3. Verify ─────────────────────────────────────────────
function S3_Verify() {
  const digits = ['4','1','7','2','',''];
  return (
    <ScreenBg>
      <TopBar step={2} total={5}/>
      <div style={{ padding: '24px 28px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1 }}>
          Enter the<br/>6-digit code
        </div>
        <div style={{ fontSize: 15, color: INK_2, marginTop: 10, lineHeight: 1.45 }}>
          Sent to <span style={{ color: INK, fontWeight: 600 }}>+1 (415) 555 0142</span>.
          {' '}<span style={{ color: BLUE, fontWeight: 600 }}>Change</span>
        </div>

        {/* code boxes */}
        <div style={{ display: 'flex', gap: 10, marginTop: 36 }}>
          {digits.map((d, i) => {
            const filled = !!d;
            const active = i === 4;
            return (
              <div key={i} style={{
                flex: 1, aspectRatio: '1 / 1.15',
                borderRadius: 14,
                border: `1.5px solid ${active ? BLUE : (filled ? '#CFD8E6' : LINE)}`,
                background: active ? BLUE_TINT : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 600, color: INK,
              }}>
                {d || (active && <div style={{ width: 2, height: 28, background: BLUE }}/>)}
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: 24, display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 14, color: INK_3,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke={INK_3} strokeWidth="1.4"/>
            <path d="M7 4v3l2 1.5" stroke={INK_3} strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          Resend in <span style={{ color: INK_2, fontWeight: 600 }}>0:24</span>
        </div>
      </div>
      <IOSKeyboardNumeric/>
    </ScreenBg>
  );
}

// numeric keypad — minimal, no library deps
function IOSKeyboardNumeric() {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  return (
    <div style={{
      background: '#D1D5DB', padding: '8px 6px 30px',
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
    }}>
      {keys.map((k, i) => (
        <div key={i} style={{
          height: 46, borderRadius: 8, background: k === '' ? 'transparent' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 400, color: INK,
          boxShadow: k === '' ? 'none' : '0 1px 0 rgba(0,0,0,0.1)',
        }}>{k}</div>
      ))}
    </div>
  );
}

// ─── 4. Profile (name + email) ─────────────────────────────
function S4_Profile() {
  return (
    <ScreenBg>
      <TopBar step={3} total={5}/>
      <div style={{ padding: '24px 28px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1 }}>
          Tell us about<br/>yourself
        </div>
        <div style={{ fontSize: 15, color: INK_2, marginTop: 10 }}>
          We use this for receipts and ride history.
        </div>

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="First name" value="Maya" filled/>
          <Field label="Last name" value="Okafor" filled/>
          <Field label="Email" value="maya.o@example.com" filled active/>
          <Field label="Date of birth" placeholder="MM / DD / YYYY"/>
        </div>

        <label style={{
          marginTop: 22, display: 'flex', alignItems: 'flex-start', gap: 12,
          fontSize: 14, color: INK_2, lineHeight: 1.5,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, background: BLUE,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
          }}>
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path d="M1 5l3.5 3.5L11 1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span>Email me weekly ride stats and station updates.</span>
        </label>

        <div style={{ marginTop: 'auto', paddingBottom: 24 }}>
          <PrimaryBtn label="Continue"/>
        </div>
      </div>
    </ScreenBg>
  );
}

function Field({ label, value, placeholder, filled, active }) {
  return (
    <div style={{
      borderRadius: 14,
      border: `1.5px solid ${active ? BLUE : LINE}`,
      background: active ? BLUE_TINT : '#fff',
      padding: '10px 16px 12px',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: active ? BLUE : INK_3, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: filled ? 500 : 400, color: filled ? INK : INK_3, marginTop: 2 }}>
        {value || placeholder}
      </div>
    </div>
  );
}

// ─── 5. Choose plan ────────────────────────────────────────
function S5_Plan() {
  return (
    <ScreenBg bg="#fff">
      <TopBar step={4} total={5}/>
      <div style={{ padding: '24px 28px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1 }}>
          Pick a plan
        </div>
        <div style={{ fontSize: 15, color: INK_2, marginTop: 10 }}>
          Cancel or switch any time.
        </div>

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PlanCard
            name="Pay as you ride" price="$1" unit="unlock + $0.18/min"
            features={['No commitment', 'Best for occasional riders']}
          />
          <PlanCard
            name="Monthly" price="$19" unit="/ month" badge="POPULAR" selected
            features={['Unlimited 45-min rides', 'Priority unlocks', 'Cancel anytime']}
          />
          <PlanCard
            name="Annual" price="$169" unit="/ year"
            features={['Unlimited 60-min rides', '2 months free', 'Free helmet credit']}
          />
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: 24 }}>
          <PrimaryBtn label="Continue with Monthly"/>
        </div>
      </div>
    </ScreenBg>
  );
}

function PlanCard({ name, price, unit, features, badge, selected }) {
  return (
    <div style={{
      borderRadius: 18, padding: '18px 18px 16px',
      border: `1.5px solid ${selected ? BLUE : LINE}`,
      background: selected ? BLUE_TINT : '#fff',
      position: 'relative',
    }}>
      {badge && (
        <div style={{
          position: 'absolute', top: -10, right: 14,
          background: INK, color: '#fff', fontSize: 10, fontWeight: 700,
          letterSpacing: 1, padding: '4px 8px', borderRadius: 6,
        }}>{badge}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{name}</div>
          <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700, letterSpacing: -0.4 }}>
            {price}<span style={{ fontSize: 14, fontWeight: 500, color: INK_2 }}> {unit}</span>
          </div>
        </div>
        <div style={{
          width: 24, height: 24, borderRadius: 12,
          border: `2px solid ${selected ? BLUE : '#D1D8E4'}`,
          background: selected ? BLUE : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {selected && (
            <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
              <path d="M1 5l3.5 3.5L11 1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: INK_2 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7.5l3 3L12 3" stroke={BLUE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 6. Location permission ────────────────────────────────
function S6_Location() {
  return (
    <ScreenBg>
      <TopBar step={5} total={5}/>
      <div style={{ padding: '24px 28px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1 }}>
          Find bikes<br/>near you
        </div>
        <div style={{ fontSize: 15, color: INK_2, marginTop: 10, lineHeight: 1.45 }}>
          Pedal uses your location to show nearby stations
          and guide you on rides.
        </div>

        {/* map illustration */}
        <div style={{
          marginTop: 28, height: 240, borderRadius: 22,
          background: BLUE_TINT, position: 'relative', overflow: 'hidden',
          border: `1px solid ${LINE}`,
        }}>
          {/* roads */}
          <svg width="100%" height="100%" viewBox="0 0 346 240" style={{ position: 'absolute', inset: 0 }}>
            <path d="M-20 80 Q 80 60 180 110 T 360 100" stroke="#D9E3F5" strokeWidth="14" fill="none" strokeLinecap="round"/>
            <path d="M40 -10 Q 80 80 60 160 T 120 260" stroke="#D9E3F5" strokeWidth="10" fill="none" strokeLinecap="round"/>
            <path d="M260 -10 Q 240 100 280 180 T 240 260" stroke="#D9E3F5" strokeWidth="10" fill="none" strokeLinecap="round"/>
            <path d="M-20 200 Q 100 180 200 210 T 360 190" stroke="#D9E3F5" strokeWidth="8" fill="none" strokeLinecap="round"/>
            {/* station dots */}
            {[[60,90],[140,70],[210,140],[290,90],[110,180],[250,200],[180,40]].map(([x,y],i)=>(
              <g key={i}>
                <circle cx={x} cy={y} r="6" fill="#fff" stroke={BLUE} strokeWidth="2"/>
              </g>
            ))}
          </svg>
          {/* you */}
          <div style={{
            position: 'absolute', top: 110, left: 152,
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(10,102,255,0.15)',
              position: 'absolute', top: -28, left: -28,
            }}/>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: BLUE, border: '3px solid #fff',
              boxShadow: '0 4px 10px rgba(10,102,255,0.4)',
            }}/>
          </div>
        </div>

        <div style={{
          marginTop: 22, padding: '14px 16px', borderRadius: 14,
          background: '#F7F9FC', display: 'flex', gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10, background: BLUE_SOFT,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5C5 1.5 2.5 4 2.5 7c0 4 5.5 7.5 5.5 7.5s5.5-3.5 5.5-7.5c0-3-2.5-5.5-5.5-5.5z" stroke={BLUE} strokeWidth="1.5"/>
              <circle cx="8" cy="7" r="2" fill={BLUE}/>
            </svg>
          </div>
          <div style={{ fontSize: 13, color: INK_2, lineHeight: 1.45 }}>
            Used only while you ride. We never sell your location data.
          </div>
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PrimaryBtn label="Allow location access"/>
          <div style={{ textAlign: 'center', fontSize: 15, color: INK_2, paddingTop: 6 }}>
            <span style={{ fontWeight: 500 }}>Skip for now</span>
          </div>
        </div>
      </div>
    </ScreenBg>
  );
}

// ─── 7. Success ────────────────────────────────────────────
function S7_Done() {
  return (
    <ScreenBg>
      <div style={{ padding: '160px 36px 0', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 140, height: 140 }}>
          {[140, 110, 80].map((s, i) => (
            <div key={i} style={{
              position: 'absolute', width: s, height: s, borderRadius: '50%',
              border: `1.5px solid ${BLUE}`, opacity: 0.15 + i * 0.1,
              top: (140-s)/2, left: (140-s)/2,
            }}/>
          ))}
          <div style={{
            position: 'absolute', top: 28, left: 28, width: 84, height: 84, borderRadius: '50%',
            background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 14px 30px rgba(10,102,255,0.35)',
          }}>
            <svg width="40" height="32" viewBox="0 0 40 32" fill="none">
              <path d="M3 17l11 11L37 4" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.6, marginTop: 36 }}>
          You're all set
        </div>
        <div style={{ fontSize: 16, color: INK_2, marginTop: 12, lineHeight: 1.45, maxWidth: 280 }}>
          Welcome to Pedal, Maya. Scan the QR on any bike to start your first ride.
        </div>

        <div style={{
          marginTop: 36, padding: '14px 18px', borderRadius: 14,
          background: BLUE_SOFT, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="6" height="6" stroke={BLUE} strokeWidth="1.6"/>
            <rect x="10" y="2" width="6" height="6" stroke={BLUE} strokeWidth="1.6"/>
            <rect x="2" y="10" width="6" height="6" stroke={BLUE} strokeWidth="1.6"/>
            <rect x="11" y="11" width="2" height="2" fill={BLUE}/>
            <rect x="14" y="14" width="2" height="2" fill={BLUE}/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: BLUE }}>First ride free — code RIDE1</span>
        </div>
      </div>

      <div style={{ padding: '0 28px 24px' }}>
        <PrimaryBtn label="Find a bike"/>
      </div>
    </ScreenBg>
  );
}

Object.assign(window, {
  S1_Welcome, S2_Phone, S3_Verify, S4_Profile, S5_Plan, S6_Location, S7_Done,
});
