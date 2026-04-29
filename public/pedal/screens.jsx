// Pedal — bikeshare signup flow screens (interactive)
// Each screen is a real form connected to shared state via props.

const BLUE = '#0A66FF';
const BLUE_DARK = '#0850CC';
const BLUE_SOFT = '#EAF1FF';
const BLUE_TINT = '#F5F8FF';
const INK = '#0B1220';
const INK_2 = '#445069';
const INK_3 = '#8892A6';
const LINE = '#E6EBF2';
const FONT = '-apple-system, "SF Pro", system-ui, sans-serif';

function ScreenBg({ children, bg = '#fff' }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: bg,
      fontFamily: FONT, color: INK, position: 'relative',
      display: 'flex', flexDirection: 'column',
    }}>{children}</div>
  );
}

function PrimaryBtn({ label, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 54, borderRadius: 16,
        background: disabled ? '#C9D5EC' : BLUE,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 17, fontWeight: 600, letterSpacing: -0.2,
        boxShadow: disabled ? 'none' : '0 8px 20px rgba(10,102,255,0.28)',
        border: 'none', width: '100%', cursor: disabled ? 'default' : 'pointer',
        fontFamily: FONT, padding: 0,
        transition: 'transform .08s, box-shadow .15s',
      }}
      onPointerDown={(e) => !disabled && (e.currentTarget.style.transform = 'scale(0.98)')}
      onPointerUp={(e) => (e.currentTarget.style.transform = '')}
      onPointerLeave={(e) => (e.currentTarget.style.transform = '')}
    >{label}</button>
  );
}

function TextLink({ children, onClick, color = BLUE }) {
  return (
    <span onClick={onClick} style={{ color, fontWeight: 600, cursor: 'pointer' }}>{children}</span>
  );
}

function TopBar({ step, total, onlyBack = false, onBack }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '70px 20px 12px',
    }}>
      <button onClick={onBack} aria-label="Back" style={{
        width: 40, height: 40, borderRadius: 12,
        border: `1px solid ${LINE}`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        background: '#fff', cursor: 'pointer', padding: 0,
      }}>
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
          <path d="M8 2L2 8l6 6" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {!onlyBack && (
        <div style={{ flex: 1, height: 6, borderRadius: 999, background: BLUE_SOFT, overflow: 'hidden' }}>
          <div style={{ width: `${(step / total) * 100}%`, height: '100%', background: BLUE, borderRadius: 999, transition: 'width .25s' }} />
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
function S1_Welcome({ onNext, onSignIn }) {
  return (
    <ScreenBg>
      <div style={{
        height: 470, background: `linear-gradient(180deg, ${BLUE} 0%, ${BLUE_DARK} 100%)`,
        position: 'relative', overflow: 'hidden',
      }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.15 }} viewBox="0 0 402 470" preserveAspectRatio="none">
          <defs>
            <pattern id="g1" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0v40" fill="none" stroke="#fff" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g1)"/>
        </svg>
        <div style={{ position: 'absolute', top: 200, left: '50%', transform: 'translateX(-50%)' }}>
          {[260, 200, 140, 80].map((s, i) => (
            <div key={i} style={{
              position: 'absolute', width: s, height: s, borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.18)',
              top: -s/2, left: -s/2,
              animation: `pedal-pulse 4s ${i * 0.4}s ease-in-out infinite`,
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
          <PrimaryBtn label="Create account" onClick={onNext}/>
          <div style={{ textAlign: 'center', fontSize: 15, color: INK_2, paddingTop: 4 }}>
            Already riding? <TextLink onClick={onSignIn}>Sign in</TextLink>
          </div>
        </div>
      </div>
    </ScreenBg>
  );
}

// ─── 2. Phone number ───────────────────────────────────────
function formatPhone(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function S2_Phone({ phone, setPhone, onBack, onNext }) {
  const digits = phone.replace(/\D/g, '');
  const valid = digits.length === 10;
  return (
    <ScreenBg>
      <TopBar step={1} total={5} onBack={onBack}/>
      <div style={{ padding: '24px 28px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1 }}>
          What's your<br/>phone number?
        </div>
        <div style={{ fontSize: 15, color: INK_2, marginTop: 10, lineHeight: 1.45 }}>
          We'll text you a code to verify it's really you.
        </div>

        <div style={{ marginTop: 36, display: 'flex', alignItems: 'stretch', gap: 10 }}>
          <div style={{
            height: 60, padding: '0 14px', borderRadius: 14,
            border: `1.5px solid ${LINE}`, display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 18, fontWeight: 500, background: '#fff',
          }}>
            🇺🇸 <span>+1</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ marginLeft: 2 }}>
              <path d="M1 1l4 4 4-4" stroke={INK_3} strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <input
            type="tel"
            inputMode="numeric"
            autoFocus
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter' && valid) onNext(); }}
            placeholder="(415) 555-0142"
            style={{
              flex: 1, height: 60, padding: '0 16px', borderRadius: 14,
              border: `1.5px solid ${valid ? BLUE : LINE}`,
              fontSize: 22, fontWeight: 500, letterSpacing: 0.5,
              background: valid ? BLUE_TINT : '#fff', color: INK,
              outline: 'none', fontFamily: FONT, minWidth: 0,
            }}
          />
        </div>

        <div style={{ fontSize: 13, color: INK_3, marginTop: 14, lineHeight: 1.5 }}>
          By continuing you agree to our <span style={{ color: INK, textDecoration: 'underline' }}>Terms</span> and <span style={{ color: INK, textDecoration: 'underline' }}>Privacy Policy</span>. Standard message rates apply.
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: 24 }}>
          <PrimaryBtn label="Send code" disabled={!valid} onClick={onNext}/>
        </div>
      </div>
    </ScreenBg>
  );
}

// ─── 3. Verify ─────────────────────────────────────────────
function S3_Verify({ code, setCode, phone, onBack, onChangeNumber, onNext }) {
  const inputs = React.useRef([]);
  const [seconds, setSeconds] = React.useState(24);
  React.useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const setDigit = (i, v) => {
    const c = code.slice();
    c[i] = v.slice(-1).replace(/\D/g, '');
    setCode(c);
    if (c[i] && i < 5) inputs.current[i + 1]?.focus();
    if (c.every((d) => d)) setTimeout(() => onNext(), 250);
  };
  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };
  const onPaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const c = ['', '', '', '', '', ''];
    for (let i = 0; i < text.length; i++) c[i] = text[i];
    setCode(c);
    inputs.current[Math.min(text.length, 5)]?.focus();
    if (text.length === 6) setTimeout(() => onNext(), 250);
  };

  return (
    <ScreenBg>
      <TopBar step={2} total={5} onBack={onBack}/>
      <div style={{ padding: '24px 28px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1 }}>
          Enter the<br/>6-digit code
        </div>
        <div style={{ fontSize: 15, color: INK_2, marginTop: 10, lineHeight: 1.45 }}>
          Sent to <span style={{ color: INK, fontWeight: 600 }}>+1 {phone || '(415) 555-0142'}</span>.
          {' '}<TextLink onClick={onChangeNumber}>Change</TextLink>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 36 }} onPaste={onPaste}>
          {code.map((d, i) => {
            const filled = !!d;
            const active = !filled && code.findIndex((x) => !x) === i;
            return (
              <input
                key={i}
                ref={(el) => (inputs.current[i] = el)}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKey(i, e)}
                autoFocus={i === 0}
                style={{
                  flex: 1, aspectRatio: '1 / 1.15',
                  borderRadius: 14,
                  border: `1.5px solid ${active ? BLUE : (filled ? '#CFD8E6' : LINE)}`,
                  background: active ? BLUE_TINT : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 600, color: INK,
                  textAlign: 'center', outline: 'none', fontFamily: FONT,
                  caretColor: BLUE, padding: 0, minWidth: 0,
                }}
              />
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
          {seconds > 0 ? (
            <>Resend in <span style={{ color: INK_2, fontWeight: 600 }}>0:{String(seconds).padStart(2, '0')}</span></>
          ) : (
            <TextLink onClick={() => setSeconds(24)}>Resend code</TextLink>
          )}
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: 24 }}>
          <PrimaryBtn label="Verify" disabled={!code.every((d) => d)} onClick={onNext}/>
        </div>
      </div>
    </ScreenBg>
  );
}

// ─── 4. Profile ─────────────────────────────
function S4_Profile({ data, setData, onBack, onNext }) {
  const set = (k) => (v) => setData((d) => ({ ...d, [k]: v }));
  const ready = data.firstName && data.lastName && /\S+@\S+\.\S+/.test(data.email);
  return (
    <ScreenBg>
      <TopBar step={3} total={5} onBack={onBack}/>
      <div style={{ padding: '24px 28px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1 }}>
          Tell us about<br/>yourself
        </div>
        <div style={{ fontSize: 15, color: INK_2, marginTop: 10 }}>
          We use this for receipts and ride history.
        </div>

        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="First name" value={data.firstName} onChange={set('firstName')} placeholder="Maya" autoFocus/>
          <Field label="Last name" value={data.lastName} onChange={set('lastName')} placeholder="Okafor"/>
          <Field label="Email" value={data.email} onChange={set('email')} placeholder="you@example.com" type="email"/>
          <Field label="Date of birth" value={data.dob} onChange={set('dob')} placeholder="MM / DD / YYYY"/>
        </div>

        <label style={{
          marginTop: 22, display: 'flex', alignItems: 'flex-start', gap: 12,
          fontSize: 14, color: INK_2, lineHeight: 1.5, cursor: 'pointer',
        }}>
          <input
            type="checkbox"
            checked={!!data.optIn}
            onChange={(e) => set('optIn')(e.target.checked)}
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
          />
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: data.optIn ? BLUE : '#fff',
            border: data.optIn ? 'none' : `1.5px solid ${LINE}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: 1,
          }}>
            {data.optIn && (
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5l3.5 3.5L11 1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span>Email me weekly ride stats and station updates.</span>
        </label>

        <div style={{ marginTop: 'auto', paddingBottom: 24 }}>
          <PrimaryBtn label="Continue" disabled={!ready} onClick={onNext}/>
        </div>
      </div>
    </ScreenBg>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', autoFocus }) {
  const [focused, setFocused] = React.useState(false);
  const filled = !!value;
  const active = focused;
  return (
    <label style={{
      borderRadius: 14,
      border: `1.5px solid ${active ? BLUE : LINE}`,
      background: active ? BLUE_TINT : '#fff',
      padding: '10px 16px 12px',
      display: 'block',
      transition: 'background .15s, border-color .15s',
    }}>
      <div style={{
        fontSize: 12, fontWeight: 600,
        color: active ? BLUE : INK_3,
        letterSpacing: 0.3, textTransform: 'uppercase',
      }}>{label}</div>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoCapitalize={type === 'email' ? 'none' : 'words'}
        autoCorrect={type === 'email' ? 'off' : 'on'}
        style={{
          fontSize: 17, fontWeight: filled ? 500 : 400,
          color: filled ? INK : INK_3,
          marginTop: 2, width: '100%', border: 'none', outline: 'none',
          background: 'transparent', fontFamily: FONT, padding: 0,
        }}
      />
    </label>
  );
}

// ─── 5. Plan ────────────────────────────────────────
const PLANS = [
  { id: 'payg',    name: 'Pay as you ride', price: '$1',   unit: 'unlock + $0.18/min', features: ['No commitment', 'Best for occasional riders'] },
  { id: 'monthly', name: 'Monthly',         price: '$19',  unit: '/ month',           features: ['Unlimited 45-min rides', 'Priority unlocks', 'Cancel anytime'], badge: 'POPULAR' },
  { id: 'annual',  name: 'Annual',          price: '$169', unit: '/ year',            features: ['Unlimited 60-min rides', '2 months free', 'Free helmet credit'] },
];

function S5_Plan({ plan, setPlan, onBack, onNext }) {
  const selected = PLANS.find((p) => p.id === plan) || PLANS[1];
  return (
    <ScreenBg bg="#fff">
      <TopBar step={4} total={5} onBack={onBack}/>
      <div style={{ padding: '24px 28px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1 }}>
          Pick a plan
        </div>
        <div style={{ fontSize: 15, color: INK_2, marginTop: 10 }}>
          Cancel or switch any time.
        </div>

        <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PLANS.map((p) => (
            <PlanCard key={p.id} {...p} selected={plan === p.id} onSelect={() => setPlan(p.id)}/>
          ))}
        </div>

        <div style={{ marginTop: 'auto', paddingBottom: 24 }}>
          <PrimaryBtn label={`Continue with ${selected.name}`} onClick={onNext}/>
        </div>
      </div>
    </ScreenBg>
  );
}

function PlanCard({ name, price, unit, features, badge, selected, onSelect }) {
  return (
    <button
      onClick={onSelect}
      style={{
        borderRadius: 18, padding: '18px 18px 16px',
        border: `1.5px solid ${selected ? BLUE : LINE}`,
        background: selected ? BLUE_TINT : '#fff',
        position: 'relative', textAlign: 'left',
        cursor: 'pointer', fontFamily: FONT, color: INK,
        transition: 'border-color .15s, background .15s',
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
          transition: 'background .15s, border-color .15s',
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
    </button>
  );
}

// ─── 6. Location permission ────────────────────────────────
function S6_Location({ onBack, onNext }) {
  const [requesting, setRequesting] = React.useState(false);
  const ask = () => {
    if (!('geolocation' in navigator)) { onNext(); return; }
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      () => { setRequesting(false); onNext(); },
      () => { setRequesting(false); onNext(); },
      { timeout: 8000 }
    );
  };
  return (
    <ScreenBg>
      <TopBar step={5} total={5} onBack={onBack}/>
      <div style={{ padding: '24px 28px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.6, lineHeight: 1.1 }}>
          Find bikes<br/>near you
        </div>
        <div style={{ fontSize: 15, color: INK_2, marginTop: 10, lineHeight: 1.45 }}>
          Pedal uses your location to show nearby stations
          and guide you on rides.
        </div>

        <div style={{
          marginTop: 28, height: 240, borderRadius: 22,
          background: BLUE_TINT, position: 'relative', overflow: 'hidden',
          border: `1px solid ${LINE}`,
        }}>
          <svg width="100%" height="100%" viewBox="0 0 346 240" style={{ position: 'absolute', inset: 0 }}>
            <path d="M-20 80 Q 80 60 180 110 T 360 100" stroke="#D9E3F5" strokeWidth="14" fill="none" strokeLinecap="round"/>
            <path d="M40 -10 Q 80 80 60 160 T 120 260" stroke="#D9E3F5" strokeWidth="10" fill="none" strokeLinecap="round"/>
            <path d="M260 -10 Q 240 100 280 180 T 240 260" stroke="#D9E3F5" strokeWidth="10" fill="none" strokeLinecap="round"/>
            <path d="M-20 200 Q 100 180 200 210 T 360 190" stroke="#D9E3F5" strokeWidth="8" fill="none" strokeLinecap="round"/>
            {[[60,90],[140,70],[210,140],[290,90],[110,180],[250,200],[180,40]].map(([x,y],i)=>(
              <g key={i}>
                <circle cx={x} cy={y} r="6" fill="#fff" stroke={BLUE} strokeWidth="2"/>
              </g>
            ))}
          </svg>
          <div style={{ position: 'absolute', top: 110, left: 152 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(10,102,255,0.15)',
              position: 'absolute', top: -28, left: -28,
              animation: 'pedal-ping 2.4s ease-out infinite',
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
          <PrimaryBtn label={requesting ? 'Requesting…' : 'Allow location access'} disabled={requesting} onClick={ask}/>
          <div style={{ textAlign: 'center', fontSize: 15, color: INK_2, paddingTop: 6 }}>
            <TextLink onClick={onNext} color={INK_2}><span style={{ fontWeight: 500 }}>Skip for now</span></TextLink>
          </div>
        </div>
      </div>
    </ScreenBg>
  );
}

// ─── 7. Success ────────────────────────────────────────────
function S7_Done({ firstName, onFindBike }) {
  return (
    <ScreenBg>
      <div style={{ padding: '160px 36px 0', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 140, height: 140 }}>
          {[140, 110, 80].map((s, i) => (
            <div key={i} style={{
              position: 'absolute', width: s, height: s, borderRadius: '50%',
              border: `1.5px solid ${BLUE}`, opacity: 0.15 + i * 0.1,
              top: (140-s)/2, left: (140-s)/2,
              animation: `pedal-pulse 3s ${i * 0.3}s ease-in-out infinite`,
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
          Welcome to Pedal{firstName ? `, ${firstName}` : ''}. Scan the QR on any bike to start your first ride.
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
        <PrimaryBtn label="Find a bike" onClick={onFindBike}/>
      </div>
    </ScreenBg>
  );
}

Object.assign(window, {
  S1_Welcome, S2_Phone, S3_Verify, S4_Profile, S5_Plan, S6_Location, S7_Done,
  PEDAL_FONT: FONT,
});
