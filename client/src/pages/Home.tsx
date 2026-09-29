import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, ArrowUp, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, FileText, Globe2, Info, Languages, LockKeyhole, Menu, Scale, ShieldAlert, ShieldCheck, Sparkles, X } from "lucide-react";
import { AGENCY_DIRECTORY } from "@shared/agencyDirectory";
import { trpc } from "@/lib/trpc";
import { translatePage } from "@/i18n";

type TextFieldKey = "rname" | "mob" | "rmail" | "radd" | "idt" | "idn" | "who" | "acc" | "desig" | "dept" | "loc" | "st" | "svc" | "amt" | "pay" | "via" | "wit" | "date" | "time" | "place" | "desc" | "evd" | "ref";
type FormValues = { anonymous: boolean } & Record<TextFieldKey, string>;
type Recommendation = { directoryIndex: number; reason: string; urgent: boolean; steps: string[]; tips: string[] };

const INITIAL: FormValues = {
  anonymous: false,
  rname: "", mob: "", rmail: "", radd: "", idt: "Voter ID", idn: "",
  who: "", acc: "", desig: "", dept: "", loc: "", st: "", svc: "",
  amt: "", pay: "", via: "", wit: "", date: "", time: "", place: "", desc: "", evd: "", ref: "",
};

const navItems = [
  ["home", "Home"], ["report", "Report bribery"], ["officer", "Officer above"], ["agencies", "Agencies"], ["education", "Education"],
] as const;
const indianLanguages = [
  ["en", "English"], ["as", "অসমীয়া · Assamese"], ["bn", "বাংলা · Bengali"], ["brx", "बड़ो · Bodo"], ["doi", "डोगरी · Dogri"], ["gu", "ગુજરાતી · Gujarati"], ["hi", "हिन्दी · Hindi"], ["kn", "ಕನ್ನಡ · Kannada"], ["ks", "कॉशुर · Kashmiri"], ["kok", "कोंकणी · Konkani"], ["mai", "मैथिली · Maithili"], ["ml", "മലയാളം · Malayalam"], ["mni", "মৈতৈলোন্ · Manipuri"], ["mr", "मराठी · Marathi"], ["ne", "नेपाली · Nepali"], ["or", "ଓଡ଼ିଆ · Odia"], ["pa", "ਪੰਜਾਬੀ · Punjabi"], ["sa", "संस्कृतम् · Sanskrit"], ["sat", "ᱥᱟᱱᱛᱟᱲᱤ · Santali"], ["sd", "سنڌي · Sindhi"], ["ta", "தமிழ் · Tamil"], ["te", "తెలుగు · Telugu"], ["ur", "اُردُو · Urdu"],
] as const;
const rankAbove: Record<string, string> = {
  clerk: "Section Officer / Office Superintendent", assistant: "Section Officer", "junior assistant": "Senior Assistant / Head Clerk", inspector: "Deputy Superintendent of Police", "sub-inspector": "Inspector", constable: "Head Constable", "head constable": "Assistant Sub-Inspector", tehsildar: "Sub-Divisional Magistrate", patwari: "Naib Tehsildar", "village officer": "Tahsildar", engineer: "Executive Engineer", "junior engineer": "Assistant Engineer", "assistant engineer": "Executive Engineer", "revenue officer": "District Revenue Officer", officer: "Department Head / Controlling Officer", agent: "Supervising Officer of the concerned department",
};
const states = Array.from(new Set(AGENCY_DIRECTORY.filter(item => item.level !== "National").map(item => item.stateOrUt))).sort();
const NATIONAL_AGENCIES = AGENCY_DIRECTORY.filter(item => item.level === "National");

function primaryUrl(raw: string) {
  return raw.match(/https?:\/\/[^\s&]+/)?.[0] ?? "https://pgportal.gov.in/";
}
function hasVerifiedUrl(raw: string) { return /^https?:\/\//.test(raw); }
function clean(value: string) { return value.trim(); }
function displayDate(value: string) { return value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN") : ""; }

export default function Home() {
  const [fields, setFields] = useState<FormValues>(INITIAL);
  const [step, setStep] = useState(0);
  const [contrast, setContrast] = useState(false);
  const [language, setLanguage] = useState(() => window.localStorage.getItem("rmb-language") ?? "en");
  const [reportedDesignation, setReportedDesignation] = useState("");
  const [officerAbove, setOfficerAbove] = useState<{ designation: string; above: string } | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [otpChallengeId, setOtpChallengeId] = useState("");
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpMessage, setOtpMessage] = useState("Enter your mobile number and request an OTP.");
  const [otpSeconds, setOtpSeconds] = useState(0);
  const [formError, setFormError] = useState("");
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [submitted, setSubmitted] = useState<{ trackingId: string; agencyName: string } | null>(null);

  const sendOtp = trpc.phone.sendOtp.useMutation();
  const verifyOtp = trpc.phone.verifyOtp.useMutation();
  const recommend = trpc.assistant.recommend.useMutation();
  const officerLookup = trpc.assistant.officerAbove.useMutation();
  const submitComplaint = trpc.complaints.submit.useMutation();

  useEffect(() => {
    document.documentElement.dataset.theme = contrast ? "dark" : "light";
  }, [contrast]);

  useEffect(() => {
    const refresh = () => translatePage(language);
    refresh();
    const observer = new MutationObserver(refresh);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "aria-label", "title"] });
    return () => observer.disconnect();
  }, [language]);

  useEffect(() => {
    if (!otpSeconds) return;
    const timer = window.setInterval(() => setOtpSeconds(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [otpSeconds]);

  const update = (key: "anonymous" | TextFieldKey, value: string | boolean) => {
    if (key === "anonymous") setFields(current => ({ ...current, anonymous: Boolean(value) }));
    else setFields(current => ({ ...current, [key]: String(value) }));
    if (key === "mob") { setOtpVerified(false); setOtpChallengeId(""); }
  };
  const mobile = fields.mob.replace(/\D/g, "").slice(-10);
  const problemContext = useMemo(() => [
    `Who made the demand: ${fields.who}`,
    `Official: ${[fields.acc, fields.desig].filter(Boolean).join(", ")}`,
    `Department / office: ${fields.dept}`,
    `Office location: ${[fields.loc, fields.st].filter(Boolean).join(", ")}`,
    `Service or work: ${fields.svc}`,
    `Amount / payment: ${[fields.amt && `₹${fields.amt}`, fields.pay].filter(Boolean).join(" · ")}`,
    `Demand made by: ${fields.via}`,
    `Date and place: ${[displayDate(fields.date), fields.time, fields.place].filter(Boolean).join(" · ")}`,
    `What happened: ${fields.desc}`,
    `Evidence: ${fields.evd}`,
    `Reference: ${fields.ref}`,
    `Witnesses / intermediary: ${fields.wit}`,
  ].filter(item => !item.endsWith(": ")).join("\n"), [fields]);

  const agency = recommendation ? AGENCY_DIRECTORY[recommendation.directoryIndex] : null;
  const formatCountdown = `${String(Math.floor(otpSeconds / 60)).padStart(2, "0")}:${String(otpSeconds % 60).padStart(2, "0")}`;
  const lookupOfficerAbove = () => {
    const designation = (reportedDesignation || fields.desig || "Official").trim();
    const key = designation.toLowerCase();
    const above = Object.entries(rankAbove).find(([match]) => key.includes(match))?.[1] ?? "The immediate supervisory officer / controlling authority";
    setOfficerAbove({ designation, above });
  };
  const identifyOfficerFromComplaint = () => {
    const designation = (fields.desig || "Official").trim();
    setReportedDesignation(designation);
    officerLookup.mutate({ designation, department: fields.dept, stateOrUt: fields.st, facts: problemContext }, {
      onSuccess: result => { setOfficerAbove({ designation: result.designation, above: result.above }); document.getElementById("officer")?.scrollIntoView({ behavior: "smooth", block: "start" }); },
      onError: () => { lookupOfficerAbove(); document.getElementById("officer")?.scrollIntoView({ behavior: "smooth", block: "start" }); },
    });
  };

  const jump = (id: string) => {
    setMobileNav(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSendOtp = () => {
    if (!/^\d{10}$/.test(mobile)) { setFormError("Enter a valid 10-digit mobile number before requesting an OTP."); return; }
    setFormError(""); setOtpVerified(false);
    sendOtp.mutate({ phone: mobile }, {
      onSuccess: response => {
        setOtpChallengeId(response.challengeId);
        setOtpSeconds(response.expiresInSeconds);
        setOtpMessage(response.delivery === "demo" ? `Demo OTP: ${response.demoCode}. This is simulated until an SMS provider is configured.` : "OTP sent by SMS. It expires in two minutes.");
      },
      onError: error => setOtpMessage(error.message),
    });
  };
  const handleVerifyOtp = () => {
    if (!otpChallengeId) { setOtpMessage("Request an OTP first."); return; }
    verifyOtp.mutate({ challengeId: otpChallengeId, phone: mobile, code: otp }, {
      onSuccess: () => { setOtpVerified(true); setOtpMessage("Phone number verified for this complaint."); setOtpSeconds(0); },
      onError: error => setOtpMessage(error.message),
    });
  };

  const validateStep = () => {
    if (step === 0 && !fields.anonymous) {
      if (clean(fields.rname).length < 2) return "Enter your full name.";
      if (!/^\d{10}$/.test(mobile)) return "Enter a valid 10-digit mobile number.";
      if (clean(fields.idn).length < 4) return "Enter a valid ID number, or choose anonymous reporting.";
      if (!otpVerified) return "Verify your mobile number with the OTP before continuing.";
    }
    if (step === 1) {
      if (!fields.who) return "Select who asked for the bribe.";
      if (!clean(fields.dept)) return "Enter the department or office.";
      if (!fields.st) return "Select the state or UT where the office is located.";
    }
    if (step === 2 && clean(fields.desc).length < 20) return "Describe what the official said or did in at least 20 characters.";
    return "";
  };

  const next = () => {
    const error = validateStep();
    setFormError(error);
    if (!error) { setStep(value => Math.min(3, value + 1)); setTimeout(() => document.getElementById("report-card")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0); }
  };
  const previous = () => { setFormError(""); setStep(value => Math.max(0, value - 1)); };

  const handleRecommend = () => {
    if (clean(fields.desc).length < 20) { setFormError("Describe the incident before asking the AI assistant to route it."); return; }
    setFormError(""); setRecommendation(null);
    recommend.mutate({ problem: problemContext, stateOrUt: fields.st || undefined }, {
      onSuccess: result => setRecommendation(result),
      onError: error => setFormError(error.message),
    });
  };

  const handleSubmit = () => {
    if (!recommendation) { setFormError("Use the AI assistant to identify the exact official website before submitting."); return; }
    if (fields.anonymous === false && !otpVerified) { setFormError("Verify your mobile number before submitting."); return; }
    if (!fields.anonymous && !otpChallengeId) { setFormError("Request and verify an OTP before submitting."); return; }
    if (!fields.anonymous && !fields.rname) { setFormError("Enter your name before submitting."); return; }
    const securityAnswer = window.prompt("Security check: enter 7 + 4");
    if (securityAnswer !== "11") { setFormError("Security check failed. Please try again."); return; }
    const details = Object.fromEntries(Object.entries(fields).filter(([key, value]) => key !== "anonymous" && typeof value === "string" && value)) as Record<string, string>;
    submitComplaint.mutate({ anonymous: fields.anonymous, phone: fields.anonymous ? undefined : mobile, otpChallengeId: fields.anonymous ? undefined : otpChallengeId, agencyIndex: recommendation.directoryIndex, stateOrUt: fields.st || undefined, details }, {
      onSuccess: result => { setSubmitted(result); setFormError(""); setStep(4); jump("report-card"); window.setTimeout(() => { if (agency) window.location.assign(primaryUrl(agency.officialWebsite)); }, 900); },
      onError: error => setFormError(error.message),
    });
  };

  const submitEnabled = Boolean(recommendation) && !submitComplaint.isPending;

  return (
    <div className="portal-shell">
      <div className="tri-rule" />
      <div className="utility-bar">
        <div className="portal-wrap utility-inner">
          <span>Prototype portal for demonstration — not an official Government of India website</span>
          <div className="utility-actions">
            <label className="language-picker"><Languages size={14} /><span>Language</span><select value={language} onChange={event => { const value = event.target.value; window.localStorage.setItem("rmb-language", value); setLanguage(value); }} aria-label="Choose language">{indianLanguages.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
            <button type="button" onClick={() => setContrast(value => !value)} aria-pressed={contrast}>◐ Contrast</button>
          </div>
        </div>
      </div>
      <header className="brand-header">
        <div className="portal-wrap brand-inner">
          <a className="brand-lockup" href="#home" onClick={event => { event.preventDefault(); jump("home"); }}>
            <img src="/logo.png" alt="" className="brand-mark" />
            <span><strong>Rishwat Mukt Bharat</strong><small className="tagline">Know your Rights, Know where to report</small><small>Central bribery complaint &amp; monitoring portal · prototype</small></span>
          </a>
          <div className="helpline"><span>Toll-free helpline</span><b>1800-000-1964</b><small>Mon–Sat · 9:00 am–6:00 pm</small></div>
          <button className="mobile-menu" type="button" aria-label="Open navigation" aria-expanded={mobileNav} onClick={() => setMobileNav(value => !value)}>{mobileNav ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>
      <nav className={`main-nav ${mobileNav ? "is-open" : ""}`} aria-label="Main navigation">
        <div className="portal-wrap nav-inner">{navItems.map(([id, label]) => id === "education" ? <a key={id} href="/education">{label}</a> : <a key={id} href={`#${id}`} onClick={event => { event.preventDefault(); jump(id); }}>{label}</a>)}</div>
      </nav>

      <main>
        <section id="home" className="hero-section">
          <div className="portal-wrap hero-grid">
            <div className="hero-copy"><span className="eyebrow"><ShieldCheck size={16} /> A guided path to the right authority</span><h1>Report a bribe. Know where it goes.</h1><p>Describe what happened in your own words. The assistant reads the facts, checks the supplied directory of Indian anti-corruption bodies, and guides you to the exact official website to use next.</p><div className="hero-actions"><button className="btn btn-primary" type="button" onClick={() => jump("report")}>Start a complaint <ArrowRight size={17} /></button><button className="btn btn-outline-light" type="button" onClick={() => jump("officer")}>Find officer above</button></div><p className="hero-disclaimer"><LockKeyhole size={15} /> Never share OTPs or passwords in the description. Verify every destination before submitting.</p></div>
            <div className="hero-panel"><div className="hero-panel-top"><Sparkles size={19} /><span>Directory-backed AI routing</span></div><div className="hero-stat"><b>{AGENCY_DIRECTORY.length}</b><span>anti-corruption bodies in the supplied workbook</span></div><div className="hero-stat-row"><div><b>3</b><span>levels covered</span></div><div><b>1</b><span>exact destination</span></div></div><div className="hero-panel-note">No guesswork. The recommended website always comes from the workbook record.</div></div>
          </div>
        </section>

        <section className="section section-paper" id="report">
          <div className="portal-wrap">
            <div className="section-heading"><div><span className="eyebrow eyebrow-dark">File safely</span><h2>Tell us what happened</h2></div><span className="section-kicker">You can report anonymously</span></div>
            <div className="stepper" aria-label="Complaint steps">{["Your details", "Official & office", "Incident & evidence", "Review & submit"].map((label, index) => <button type="button" key={label} className={index === step ? "active" : index < step ? "complete" : ""} onClick={() => index <= step && setStep(index)}><span>{index < step ? <CheckCircle2 size={15} /> : index + 1}</span>{label}</button>)}</div>
            <div className="report-layout" id="report-card">
              <div className="form-card">
                {step === 0 && <div className="pane"><h3>Your name and contact details</h3><p className="muted">Use identified reporting for faster follow-up, or choose anonymous reporting if you prefer not to share your identity.</p><label className="check-row"><input type="checkbox" checked={fields.anonymous} onChange={event => update("anonymous", event.target.checked)} /><span>Report anonymously <small>No name, phone, or ID required. You will receive a tracking ID.</small></span></label>{!fields.anonymous && <><div className="field-grid"><Field label="Full name" value={fields.rname} onChange={value => update("rname", value)} placeholder="Your full name" autoComplete="name" /><Field label="Mobile number" value={fields.mob} onChange={value => update("mob", value)} placeholder="10-digit mobile" inputMode="numeric" autoComplete="tel" /><Field label="Email (optional)" value={fields.rmail} onChange={value => update("rmail", value)} placeholder="you@example.com" type="email" /><Field label="Address / city (optional)" value={fields.radd} onChange={value => update("radd", value)} placeholder="Where agencies can reach you" /></div><div className="field-grid otp-grid"><div className="field"><label htmlFor="idt">ID type</label><select id="idt" value={fields.idt} onChange={event => update("idt", event.target.value)}><option>Voter ID</option><option>PAN</option><option>Driving licence</option></select></div><Field label="ID number" value={fields.idn} onChange={value => update("idn", value)} placeholder="Enter ID number" /><div className="field otp-field"><label htmlFor="otp">One-time password</label><div className="inline-field"><input id="otp" value={otp} onChange={event => setOtp(event.target.value)} placeholder="6-digit OTP" inputMode="numeric" maxLength={6} autoComplete="one-time-code" /><button type="button" className="btn btn-secondary btn-small" onClick={handleSendOtp} disabled={sendOtp.isPending}>{sendOtp.isPending ? "Sending…" : "Send OTP"}</button></div><span className={`field-status ${otpVerified ? "ok" : ""}`}>{otpVerified ? <><CheckCircle2 size={14} /> Phone verified</> : otpMessage}{otpSeconds > 0 && !otpVerified ? ` · ${formatCountdown}` : ""}</span>{!otpVerified && otpChallengeId && <button type="button" className="text-button" onClick={handleVerifyOtp} disabled={verifyOtp.isPending}>{verifyOtp.isPending ? "Checking…" : "Verify OTP"}</button>}</div></div><div className="notice"><LockKeyhole size={16} /><span>Your ID and phone number are used only for verification and follow-up. OTPs are sent through Textbelt's public free SMS gateway for this prototype; it may be rate-limited, and no demo code is shown if delivery fails.</span></div></>}</div>}
                {step === 1 && <div className="pane"><h3>The official and office</h3><p className="muted">Choose the closest description. The assistant will use the state, department, and service to route the report.</p><div className="field-grid"><div className="field"><label htmlFor="who">Who asked for or took the bribe?</label><select id="who" value={fields.who} onChange={event => update("who", event.target.value)}><option value="">Select</option><option value="central">Central government employee / PSU / bank</option><option value="state">State government or local body employee</option><option value="police">Police or vigilance personnel</option><option value="online">Online / phone / UPI demand</option><option value="other">Not sure</option></select></div><Field label="Official's name (if known)" value={fields.acc} onChange={value => update("acc", value)} placeholder="e.g. Ramesh Verma" /><Field label="Designation" value={fields.desig} onChange={value => update("desig", value)} placeholder="e.g. Clerk, Inspector" /><Field label="Department / office" value={fields.dept} onChange={value => update("dept", value)} placeholder="e.g. Regional Passport Office" /><Field label="Office address / area" value={fields.loc} onChange={value => update("loc", value)} placeholder="Building, street, city or district" /><div className="field"><label htmlFor="st">State / UT</label><select id="st" value={fields.st} onChange={event => update("st", event.target.value)}><option value="">Select</option>{states.map(state => <option key={state}>{state}</option>)}</select></div></div><Field label="What service or work was involved?" value={fields.svc} onChange={value => update("svc", value)} placeholder="e.g. Building permit, licence renewal, pension file" /></div>}
                {step === 2 && <div className="pane"><h3>What was demanded</h3><p className="muted">Stick to facts: what was said or done, when, where, and what evidence exists.</p><div className="field-grid"><Field label="Amount demanded / paid (₹)" value={fields.amt} onChange={value => update("amt", value)} placeholder="e.g. 2000" inputMode="numeric" /><div className="field"><label htmlFor="pay">Form of payment</label><select id="pay" value={fields.pay} onChange={event => update("pay", event.target.value)}><option value="">Select</option><option>Cash</option><option>UPI / online transfer</option><option>Bank transfer</option><option>Gift or goods</option><option>Favour or other benefit</option><option>Other</option></select></div><div className="field"><label htmlFor="via">Who made the demand?</label><select id="via" value={fields.via} onChange={event => update("via", event.target.value)}><option value="">Select</option><option>The official personally</option><option>An intermediary / agent / middleman</option><option>Both</option><option>Not sure</option></select></div><Field label="Witnesses / intermediary details" value={fields.wit} onChange={value => update("wit", value)} placeholder="Names and contact, if any" /><Field label="Date of demand" value={fields.date} onChange={value => update("date", value)} type="date" /><Field label="Time (approx.)" value={fields.time} onChange={value => update("time", value)} type="time" /></div><Field label="Place where the demand was made" value={fields.place} onChange={value => update("place", value)} placeholder="e.g. Counter 4, office gate, over phone" /><TextField label="What the official said or did (facts only)" value={fields.desc} onChange={value => update("desc", value)} placeholder="Describe exactly what was said or done, in order." /><TextField label="Evidence and reference details" value={fields.evd} onChange={value => update("evd", value)} placeholder="Messages, phone numbers, emails, notices, receipts, screenshots or transaction details" /><Field label="Application / file / licence reference number" value={fields.ref} onChange={value => update("ref", value)} placeholder="e.g. Application No. 12345/2026" /></div>}
                {step === 3 && <div className="pane"><div className="review-top"><div><span className="eyebrow eyebrow-dark">Final review</span><h3>Choose the correct official destination</h3></div><button className="btn btn-ai" type="button" onClick={handleRecommend} disabled={recommend.isPending}><Sparkles size={16} />{recommend.isPending ? "Analysing…" : "Find exact website"}</button></div><p className="muted">The AI sees the official, office, service, incident, and evidence details you entered — not your OTP or identity number.</p>{agency ? <RecommendationCard recommendation={recommendation!} /> : <div className="empty-ai"><Sparkles size={22} /><b>Run the AI assistant before submitting</b><span>It will match your problem to one body in the supplied Excel directory, show the exact website, and explain what to do there.</span></div>}<button type="button" className="btn btn-secondary officer-ai-button" onClick={identifyOfficerFromComplaint} disabled={officerLookup.isPending}><ArrowUp size={16} />{officerLookup.isPending ? "Identifying officer above…" : "Identify exact officer above"}</button><div className="security-row"><label htmlFor="tc" className="check-row"><input id="tc" type="checkbox" /><span>I confirm the information is true to the best of my knowledge and accept the <a href="#help">terms and conditions</a>.</span></label></div></div>}
                {step === 4 && submitted && <div className="success-pane"><div className="success-icon"><CheckCircle2 size={30} /></div><span className="eyebrow eyebrow-dark">Complaint received</span><h3>Save your tracking ID</h3><p>Your report has been recorded and routed toward <b>{submitted.agencyName}</b>.</p><p className="redirect-note">Your complaint was recorded. Opening the exact official destination…</p><div className="tracking-code">{submitted.trackingId}</div><button type="button" className="btn btn-primary" onClick={() => { setReportedDesignation(fields.desig); jump("officer"); }}>See officer above <ArrowRight size={16} /></button></div>}
                {formError && <div className="form-error" role="alert"><AlertCircle size={16} />{formError}</div>}
                {step < 4 && <div className="form-actions">{step > 0 && <button type="button" className="btn btn-quiet" onClick={previous}><ChevronLeft size={16} />Back</button>}{step < 3 ? <button type="button" className="btn btn-primary" onClick={next}>Continue <ChevronRight size={16} /></button> : <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={!submitEnabled}>Submit complaint <ArrowRight size={16} /></button>}</div>}
              </div>
              <aside className="aside-stack"><div className="aside-card aside-accent"><div className="aside-icon"><Sparkles size={18} /></div><h3>What the assistant does</h3><ol><li>Reads the facts you provide.</li><li>Checks the 41-body Excel directory.</li><li>Shows one exact official destination.</li><li>Explains the next steps clearly.</li></ol></div><div className="aside-card"><div className="aside-title"><LockKeyhole size={17} /> Privacy first</div><p>Never enter passwords, OTPs, bank PINs, or unnecessary identity details in the incident description.</p><a href="#help" onClick={event => { event.preventDefault(); jump("help"); }}>Read safety guidance <ArrowRight size={15} /></a></div></aside>
            </div>
          </div>
        </section>

        <section className="section officer-section" id="officer"><div className="portal-wrap"><div className="section-heading"><div><span className="eyebrow eyebrow-dark">Escalation guide</span><h2>Who is directly above this official?</h2></div><span className="section-kicker">Find the next supervisory rank</span></div><div className="officer-grid"><div className="officer-card"><div className="officer-icon"><ArrowUp size={22} /></div><h3>Identify the supervising rank</h3><p className="muted">Enter the designation of the person named in your complaint. This guide gives the usual immediate supervisory rank so you know whom to address or copy when escalating.</p><div className="field"><label htmlFor="reported-designation">Official's designation</label><input id="reported-designation" value={reportedDesignation} onChange={event => setReportedDesignation(event.target.value)} placeholder="e.g. Clerk, Inspector, Tehsildar" /></div><button className="btn btn-primary" type="button" onClick={lookupOfficerAbove}><ArrowUp size={16} />Show rank above</button></div><div className="officer-result" aria-live="polite">{officerAbove ? <><span className="tag tag-green">Suggested escalation level</span><p className="officer-chain"><b>{officerAbove.designation}</b><ArrowUp size={20} /><strong>{officerAbove.above}</strong></p><p className="muted">Address the complaint to the named officer's controlling or supervisory authority. Exact hierarchy can vary by department and state, so verify the designation on the department's official website.</p></> : <><ShieldAlert size={28} /><h3>After you register a complaint</h3><p className="muted">Use the designation from your complaint to see the usual rank directly above that person. This is guidance, not a substitute for the department's published hierarchy.</p></>}</div></div></div></section>

        <section className="section section-paper" id="agencies"><div className="portal-wrap"><div className="section-heading"><div><span className="eyebrow eyebrow-dark">Directory source</span><h2>National agencies and official contacts</h2></div><span className="section-kicker">{NATIONAL_AGENCIES.length} national records</span></div><div className="agency-grid">{NATIONAL_AGENCIES.map((item, index) => <article className="agency-card" key={`${item.bodyName}-${index}`}><div className="agency-top"><span className="tag tag-blue">{item.level}</span><span className="agency-state">{item.stateOrUt}</span></div><h3>{item.bodyName}</h3><p>{item.jurisdiction}</p><a href={primaryUrl(item.officialWebsite)} target="_blank" rel="noreferrer">Open official website <ExternalLink size={14} /></a></article>)}</div><p className="source-line"><FileText size={15} /> This tab lists national bodies only. State and UT bodies remain available to the routing assistant when a complaint needs a local forum.</p></div></section>

        <section className="section info-section" id="info"><div className="portal-wrap"><div className="section-heading"><div><span className="eyebrow eyebrow-dark">Learn before you act</span><h2>Anti-bribery information &amp; law</h2></div><span className="section-kicker">Plain-language civic education</span></div><div className="info-grid"><article className="info-card"><div className="info-icon"><Scale size={20} /></div><h3>Prevention of Corruption Act, 1988</h3><p>The law criminalises demanding, accepting, or attempting to obtain an undue advantage by a public servant. Giving a bribe can also be an offence, except where a person was compelled and reports it to law enforcement within the law's time limit.</p><p className="source-line"><Info size={14} /> Learn from the official text and current government guidance before relying on any legal interpretation.</p></article><article className="info-card"><div className="info-icon"><ShieldCheck size={20} /></div><h3>Lokpal and Lokayuktas Act, 2013</h3><p>This framework created the Lokpal at the Union level and supports Lokayuktas at the state level to inquire into corruption allegations against covered public functionaries, subject to jurisdiction and procedure.</p><p className="source-line">The correct forum depends on the official, department, state, and facts of the complaint.</p></article><article className="info-card"><div className="info-icon"><FileText size={20} /></div><h3>What makes a useful complaint?</h3><ul className="info-list"><li>Who asked, what was asked for, and which office was involved</li><li>Date, place, application or file number, and witnesses</li><li>Messages, receipts, call details, screenshots, or transaction references</li><li>Facts in order — avoid threats, guesses, or edited evidence</li></ul></article><article className="info-card"><div className="info-icon"><LockKeyhole size={20} /></div><h3>Safety and legal limits</h3><p>Do not share passwords, OTPs, PINs, or unnecessary identity details. If a demand is happening now or there is danger, call <b>112</b>; for a recent online financial fraud, call <b>1930</b>.</p><p className="source-line">This prototype is educational and is not the official government portal or legal advice.</p></article></div></div></section>

        <section className="section help-section" id="help"><div className="portal-wrap"><div className="section-heading"><div><span className="eyebrow eyebrow-dark">Help &amp; terms</span><h2>Important guidance</h2></div></div><div className="help-grid"><div className="help-card"><h3>Verify before you submit</h3><p>This is a prototype, not an official Government of India website. Check the domain, contact details, and instructions on the destination site before sending personal information.</p></div><div className="help-card"><h3>Terms and conditions</h3><p>Provide truthful information. Knowingly false complaints may lead to legal action. This prototype does not submit complaints to government agencies; it only demonstrates guidance and stores sample records for this project.</p><p className="source-line">The AI can be wrong. Treat the workbook-backed recommendation as guidance, not legal advice.</p></div></div></div></section>
      </main>
      <footer className="footer"><div className="portal-wrap footer-grid"><div><b>Rishwat Mukt Bharat</b><p>Prototype bribery reporting portal.<br />Helpline: 1800-000-1964</p></div><div><b>Quick links</b><a href="#report">Report bribery</a><a href="#officer">Officer above</a><a href="#info">Anti-bribery law</a><a href="#help">Terms and safety</a></div><div><b>Accessibility</b><p>Language selection, contrast controls, keyboard-friendly controls, and status announcements are included.</p></div></div><div className="portal-wrap footer-bottom">Illustrative project for demonstration. Not affiliated with the Government of India.</div></footer>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", inputMode, autoComplete }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; inputMode?: "text" | "numeric"; autoComplete?: string }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return <div className="field"><label htmlFor={id}>{label}</label><input id={id} type={type} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} autoComplete={autoComplete} /></div>;
}
function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return <div className="field field-wide"><label htmlFor={id}>{label}</label><textarea id={id} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></div>;
}
function RecommendationCard({ recommendation }: { recommendation: Recommendation }) {
  const agency = AGENCY_DIRECTORY[recommendation.directoryIndex];
  const url = primaryUrl(agency.officialWebsite);
  const steps = recommendation.steps.length ? recommendation.steps : [`Open the official website for ${agency.bodyName}.`, "Choose the complaint or vigilance filing option that matches the incident.", "Prepare the facts, evidence, and contact details requested by the agency.", "Submit and save the acknowledgement number."];
  return <div className="recommendation" aria-live="polite"><div className="recommendation-head"><div><span className="ai-badge"><Sparkles size={14} /> AI + workbook match</span><h4>{agency.bodyName}</h4></div><span className="tag tag-green">{agency.level} · {agency.stateOrUt}</span></div><p className="recommendation-reason">{recommendation.reason}</p>{recommendation.urgent && <div className="urgent"><AlertCircle size={17} /><span>If this is happening now or money was just sent online, call 112 or 1930 immediately. Do not wait for the website.</span></div>}<div className="recommendation-meta"><div><b>Jurisdiction</b><span>{agency.jurisdiction}</span></div><div><b>Function</b><span>{agency.functions}</span></div><div><b>Helpline</b><span>{agency.helpline}</span></div><div><b>Contact</b><span>{agency.email}<br />{agency.address}</span></div></div><h5>Step by step — use this website next</h5><ol className="next-steps">{steps.map((step, index) => <li key={`${step}-${index}`}><span>{index + 1}</span>{step.replace(/^\d+[.)]\s*/, "")}</li>)}</ol>{recommendation.tips.length > 0 && <><h5>Keep ready</h5><ul className="tip-list">{recommendation.tips.map(tip => <li key={tip}>{tip}</li>)}</ul></>}<a className="btn btn-primary recommendation-link" href={url} target="_blank" rel="noreferrer">Open exact official website <ExternalLink size={16} /></a><p className="source-line">{hasVerifiedUrl(agency.officialWebsite) ? "Website and contact details are from the supplied workbook." : "The workbook does not confirm a direct portal for this body, so CPGRAMS is shown as the confirmed fallback destination."}</p></div>;
}
