import { useEffect, useRef, useState } from "react";
import "../styles/public-portal.css";

const Link = ({ href, children, className = "" }) => <a href={href} className={className}>{children}</a>;
const SectionTitle = ({ eyebrow, title, children }) => <div className="kp-section-heading"><span>{eyebrow}</span><h2>{title}</h2>{children && <p>{children}</p>}</div>;
const contestMemories = [
  { title: "Final showcase", detail: "Teams share their improvement stories", image: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1400&q=85" },
  { title: "Ideas in discussion", detail: "Peer learning beyond the presentation", image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=85" },
  { title: "Teams at work", detail: "Turning observations into action", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=85" },
  { title: "Building the story", detail: "Practical problem solving in motion", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=85" },
  { title: "Presenting impact", detail: "Clear ideas, meaningful results", image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1400&q=85" },
  { title: "Celebrating winners", detail: "Recognizing collective achievement", image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1400&q=85" },
];
const certificates = [
  { type: "PARTICIPATION", title: "Certificate of Participation", recipient: "Aar••• Me•••", team: "Team Blue Horizon · Customer Service", detail: "For completing and presenting a Kaizen improvement initiative", seal: "K", signatory: "Ananya Kapoor · Contest Chair", serial: "KC25-P-184", issued: "15 November 2025" },
  { type: "FINALIST", title: "Certificate of Excellence", recipient: "Ni••• Sh•••", team: "Team Momentum · Operations", detail: "For reaching the Kaizen Contest 2025 final showcase", seal: "★", signatory: "Vikram Kulkarni · Evaluation Lead", serial: "KC25-F-017", issued: "15 November 2025" },
  { type: "CATEGORY WINNER", title: "Certificate of Achievement", recipient: "Sa••• Ra••", team: "Team SafeStep · Manufacturing", detail: "Winner · Safety & Wellbeing Category", seal: "◆", signatory: "Ananya Kapoor · Contest Chair", serial: "KC25-W-004", issued: "15 November 2025" },
  { type: "EXCELLENCE AWARD", title: "Kaizen Excellence Award", recipient: "Ra••• Ku••", team: "Team Momentum · Operations", detail: "Recognizing outstanding sustained improvement impact", seal: "✦", signatory: "Rajiv Malhotra · Managing Director", serial: "KC25-X-001", issued: "15 November 2025" },
  { type: "PEOPLE’S CHOICE", title: "Community Recognition", recipient: "Po••• Me••", team: "Team First Time Right · Quality", detail: "Selected by peers for the most inspiring improvement story", seal: "♥", signatory: "Shruti Patel · Participant Support", serial: "KC25-C-001", issued: "15 November 2025" },
  { type: "JURY APPRECIATION", title: "Certificate of Appreciation", recipient: "Dr••• Ar•• I•••", team: "Kaizen Contest Jury Panel", detail: "With gratitude for rigorous and constructive evaluation", seal: "✚", signatory: "Rohan Mehta · Program Lead", serial: "KC25-J-012", issued: "15 November 2025" },
];
const contestEditions = {
  "2025": { label: "2025 contest results", title: "A year of practical impact.", summary: "The 2025 contest brought together 218 participants across 64 team initiatives. The showcase focused on improvements that made work safer, faster, more reliable and more meaningful for customers.", metrics: [["64", "team initiatives"], ["42%", "best response-time reduction"], ["7", "recognition categories"]], spotlight: "Team Momentum received the Kaizen Excellence Award for redesigning its daily workflow and reducing customer response time by 42%. Team SafeStep won Safety & Wellbeing after removing repeat near-miss risks through a frontline visual system.", recognition: "Winners: Team Momentum, Team SafeStep, Team First Time Right and five category champions.", action: "Explore the 2025 winners" },
  "2024": { label: "2024 contest highlights", title: "Customer value took center stage.", summary: "In 2024, 176 colleagues across 51 teams turned recurring customer pain points into focused improvement projects. Teams used customer feedback, process observation and simple experiments to make service easier and more dependable.", metrics: [["51", "team initiatives"], ["31%", "average cycle-time improvement"], ["86%", "ideas scaled beyond one team"]], spotlight: "The standout initiatives simplified customer handoffs, removed duplicate checking and created clear ownership at every service touchpoint. The strongest project reduced a five-step handover to two clear actions.", recognition: "Highlights: Customer Value award, Digital Improvement award and 14 solutions adopted by more than one department." },
  "2023": { label: "2023 contest highlights", title: "Where our shared journey began.", summary: "The inaugural 2023 contest introduced 128 participants to a common language for continuous improvement. Its 37 teams proved that meaningful change can begin with a question, a sketch and the willingness to test a better way.", metrics: [["37", "team initiatives"], ["128", "participants"], ["19", "ideas standardized"]], spotlight: "Early projects made workstations safer, clarified shift handovers and reduced time spent finding information. The inaugural People’s Choice award celebrated a small idea that saved every operator ten minutes per shift.", recognition: "Highlights: First Kaizen Excellence Award, 19 standardised ideas and the launch of our internal Kaizen mentor network." },
};

function ContestLanding() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [galleryStart, setGalleryStart] = useState(0);
  const [isGallerySliding, setIsGallerySliding] = useState(false);
  const [certificateStart, setCertificateStart] = useState(0);
  const [isCertificateSliding, setIsCertificateSliding] = useState(false);
  const [selectedEdition, setSelectedEdition] = useState("2025");
  const pendingNavigation = useRef(false);

  const moveGallery = (direction) => setGalleryStart(
    (current) => (current + direction + contestMemories.length) % contestMemories.length,
  );
  const moveCertificates = (direction) => setCertificateStart(
    (current) => (current + direction + certificates.length) % certificates.length,
  );

  const handleNavigation = (section) => {
    pendingNavigation.current = true;
    setActiveSection(section);
  };

  useEffect(() => {
    const updateHeader = () => setIsScrolled(window.scrollY > 24);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  useEffect(() => {
    setIsGallerySliding(true);
    const timer = window.setTimeout(() => setIsGallerySliding(false), 520);
    return () => window.clearTimeout(timer);
  }, [galleryStart]);

  useEffect(() => {
    setIsCertificateSliding(true);
    const timer = window.setTimeout(() => setIsCertificateSliding(false), 520);
    return () => window.clearTimeout(timer);
  }, [certificateStart]);

  useEffect(() => {
    const interval = window.setInterval(
      () => setCertificateStart((current) => (current + 1) % certificates.length),
      7000,
    );
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(
      () => setGalleryStart((current) => (current + 1) % contestMemories.length),
      6000,
    );
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const sections = ["about", "rules", "previous"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    const updateActiveSection = () => {
      const marker = window.innerHeight * 0.35;
      const current = sections.reduce(
        (active, section) =>
          section.getBoundingClientRect().top <= marker ? section.id : active,
        "",
      );
      setActiveSection(current);
    };
    let scrollEndTimer;
    const handleScroll = () => {
      if (!pendingNavigation.current) {
        updateActiveSection();
        return;
      }
      window.clearTimeout(scrollEndTimer);
      scrollEndTimer = window.setTimeout(() => {
        pendingNavigation.current = false;
        updateActiveSection();
      }, 140);
    };
    updateActiveSection();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.clearTimeout(scrollEndTimer);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  return <div className="kaizen-portal kp-contest-page">
    <header className={`kp-header${isScrolled ? " is-scrolled" : ""}`}><Link href="/" className="kp-brand"><b>KAIZEN</b><i>Continuous improvement, every day.</i></Link><nav className="kp-nav"><a onClick={() => handleNavigation("about")} className={activeSection === "about" ? "is-active" : ""} href="#about">About</a><a onClick={() => handleNavigation("rules")} className={activeSection === "rules" ? "is-active" : ""} href="#rules">Rules & guidelines</a><a onClick={() => handleNavigation("previous")} className={activeSection === "previous" ? "is-active" : ""} href="#previous">Previous contests</a><Link href="/contact">Contact</Link></nav><Link href="/contest/login" className="kp-login">Contest login <span>→</span></Link></header>
    <main>
      <section className="kp-contest-hero"><p className="kp-kicker">KAIZEN CONTEST 2026 · NOW OPEN</p><h1>Make your<br /><em>better idea matter.</em></h1><p>Celebrate practical improvements that make a real difference—for customers, colleagues and the future of work.</p><div className="kp-actions"><a href="#guidelines" className="kp-button kp-button-primary">Start your entry <span>→</span></a><a href="#rules" className="kp-button kp-button-quiet">How it works <span>↓</span></a></div><div className="kp-deadline"><span>ENTRY DEADLINE</span><b>30 September 2026</b><i>Final showcase · 15 November 2026</i></div></section>

      <section className="kp-contest-overview" id="about"><SectionTitle eyebrow="WHY TAKE PART" title="Turn everyday insight into lasting impact.">The Kaizen Contest recognizes teams who observe closely, improve thoughtfully and share generously.</SectionTitle><div className="kp-overview-grid"><article><b>01</b><h3>Recognition</h3><p>Give the people behind meaningful change a stage and a story.</p></article><article><b>02</b><h3>Learning</h3><p>Learn structured problem solving from the work of peers.</p></article><article><b>03</b><h3>Momentum</h3><p>Bring proven improvements to more teams and more places.</p></article></div></section>

      <section className="kp-guidance" id="rules"><div><p className="kp-kicker">CONTEST INFORMATION</p><h2>Clear guidance. Fair evaluation.</h2><p>Entries should demonstrate a defined challenge, a practical improvement process and evidence of impact. All employees and cross-functional teams are welcome to participate.</p><Link href="#guidelines" className="kp-text-link">Read participant guidelines →</Link></div><div className="kp-guidance-list"><article><span>01</span><div><h3>Eligibility & rules</h3><p>Teams of 2–8 participants may submit one completed improvement initiative.</p></div></article><article id="guidelines"><span>02</span><div><h3>Submission guidelines</h3><p>Prepare your story with the problem, analysis, countermeasure, results and next steps.</p></div></article><article id="evaluation"><span>03</span><div><h3>Evaluation methodology</h3><p>Judges assess impact, clarity of thinking, teamwork, sustainability and replicability.</p></div></article></div></section>

      <section className="kp-categories"><SectionTitle eyebrow="2026 CATEGORIES" title="Celebrate improvement in all its forms." /><div className="kp-category-grid"><span>Quality & Customer Value</span><span>Cost & Productivity</span><span>Safety & Wellbeing</span><span>Delivery & Service</span><span>Environment & Sustainability</span><span>Digital Improvement</span><span>People & Culture</span><span>Innovation Excellence</span></div></section>

      <section className="kp-awards"><div><p className="kp-kicker">AWARDS & RECOGNITION</p><h2>Great work deserves to be seen.</h2><p>Finalists receive a certificate of achievement, with category winners and the Kaizen Excellence Award recognized at our annual showcase.</p></div><div className="kp-award-list"><p><b>Kaizen Excellence Award</b><span>Overall outstanding improvement</span></p><p><b>Category Winner</b><span>Best initiative in each category</span></p><p><b>People’s Choice</b><span>Community-voted favourite</span></p></div></section>

      <section className="kp-history" id="previous"><SectionTitle eyebrow="PREVIOUS CONTESTS" title="A growing legacy of better." /><div className="kp-history-grid"><article><span>2025</span><h3>218 participants</h3><p>64 team improvements shared across 7 categories.</p><a href="#contest-edition-details" onClick={() => setSelectedEdition("2025")}>View winners →</a></article><article><span>2024</span><h3>176 participants</h3><p>51 teams connected improvement to customer value.</p><a href="#contest-edition-details" onClick={() => setSelectedEdition("2024")}>View highlights →</a></article><article><span>2023</span><h3>128 participants</h3><p>The inaugural contest began our shared journey.</p><a href="#contest-edition-details" onClick={() => setSelectedEdition("2023")}>View highlights →</a></article></div><section className="kp-edition-details" id="contest-edition-details"><div className="kp-edition-tabs" role="tablist" aria-label="Previous contest editions">{Object.keys(contestEditions).map((year) => <button key={year} type="button" role="tab" aria-selected={selectedEdition === year} className={selectedEdition === year ? "is-active" : ""} onClick={() => setSelectedEdition(year)}>{year}</button>)}</div>{(() => { const edition = contestEditions[selectedEdition]; return <div className="kp-edition-content"><div><p className="kp-kicker">{edition.label}</p><h3>{edition.title}</h3><p>{edition.summary}</p><p className="kp-edition-spotlight"><b>Spotlight:</b> {edition.spotlight}</p><p className="kp-edition-recognition">{edition.recognition}</p>{edition.action && <a href="#winners" className="kp-text-link">{edition.action} →</a>}</div><div className="kp-edition-metrics">{edition.metrics.map(([value, label]) => <div key={label}><b>{value}</b><span>{label}</span></div>)}</div></div>; })()}</section></section>

      <section className="kp-winners" id="winners"><SectionTitle eyebrow="2025 WINNERS" title="Meet the teams behind the change." /><div className="kp-winner-grid"><article><small>KAIZEN EXCELLENCE AWARD</small><h3>Team Momentum</h3><p>Reduced customer response time by 42% through a redesigned daily workflow.</p></article><article><small>SAFETY & WELLBEING</small><h3>Team SafeStep</h3><p>A frontline-led visual system that eliminated repeat near misses.</p></article><article><small>QUALITY & VALUE</small><h3>Team First Time Right</h3><p>Improved process accuracy while creating a better customer experience.</p></article></div></section>

      <section className="kp-gallery"><SectionTitle eyebrow="CONTEST MEMORIES" title="Moments of discovery, pride and possibility." /><div className="kp-gallery-carousel" aria-label="Contest memories gallery"><div className={`kp-gallery-grid${isGallerySliding ? " is-sliding" : ""}`} aria-live="polite">{[0, 1, 2].map((offset) => { const memory = contestMemories[(galleryStart + offset) % contestMemories.length]; return <figure className="kp-photo" key={memory.title}><img src={memory.image} alt={`${memory.title}: ${memory.detail}`} /><figcaption><b>{memory.title}</b><span>{memory.detail}</span></figcaption></figure>; })}</div><div className="kp-carousel-controls"><button type="button" onClick={() => moveGallery(-1)} aria-label="Show previous contest photographs">←</button><div className="kp-carousel-dots" aria-label="Choose contest photograph">{contestMemories.map((memory, index) => <button key={memory.title} type="button" onClick={() => setGalleryStart(index)} className={index === galleryStart ? "is-active" : ""} aria-label={`Show ${memory.title}`} aria-current={index === galleryStart ? "true" : undefined}></button>)}</div><button type="button" onClick={() => moveGallery(1)} aria-label="Show next contest photographs">→</button></div></div><p className="kp-gallery-note">Illustrative contest photography for the demo site. The 2025 gallery includes 184 moments from team presentations, peer learning and the awards ceremony.</p></section>

      <section className="kp-certificates"><div><p className="kp-kicker">CERTIFICATES</p><h2>Recognition you can carry forward.</h2><p>Every contributor receives a digital certificate after the annual showcase. The 2025 recognition set covers participation, finalist achievement, each contest award and the people who make fair evaluation possible.</p><p className="kp-certificate-note">Demo recipient names are intentionally blurred. Each certificate is digitally signed by a member of the organizing committee.</p></div><div className="kp-certificate-carousel" aria-label="Kaizen certificate gallery"><div className={`kp-certificate-grid${isCertificateSliding ? " is-sliding" : ""}`} aria-live="polite">{[0, 1].map((offset) => { const certificate = certificates[(certificateStart + offset) % certificates.length]; return <article key={certificate.type}><div className="kp-certificate-header"><b>KAIZEN</b><small>CONTEST 2025 · {certificate.type}</small></div><div className="kp-certificate-watermark">K</div><div className="kp-certificate-seal">{certificate.seal}</div><h3>{certificate.title}</h3><p className="kp-certificate-presented">This is proudly presented to</p><strong className="kp-certificate-recipient">{certificate.recipient}</strong><p className="kp-certificate-team">{certificate.team}</p><p className="kp-certificate-achievement">{certificate.detail}</p><div className="kp-certificate-meta"><span>Certificate no. {certificate.serial}</span><span>Issued {certificate.issued}</span></div><div className="kp-certificate-signature"><span>{certificate.signatory}</span><small>For the Kaizen Contest Organizing Committee</small></div></article>; })}</div><div className="kp-carousel-controls"><button type="button" onClick={() => moveCertificates(-1)} aria-label="Show previous certificates">←</button><div className="kp-carousel-dots" aria-label="Choose certificate">{certificates.map((certificate, index) => <button key={certificate.type} type="button" onClick={() => setCertificateStart(index)} className={index === certificateStart ? "is-active" : ""} aria-label={`Show ${certificate.title}`} aria-current={index === certificateStart ? "true" : undefined}></button>)}</div><button type="button" onClick={() => moveCertificates(1)} aria-label="Show next certificates">→</button></div></div></section>

      <section className="kp-cta"><p className="kp-kicker">READY TO IMPROVE?</p><h2>Your next better idea<br />could start today.</h2><a href="#guidelines" className="kp-button kp-button-primary">Read the entry guide <span>→</span></a></section>
    </main>
    <footer className="kp-footer"><div className="kp-footer-top"><div><b className="kp-footer-brand">KAIZEN</b><p>Making continuous improvement a way of working.</p></div><div><h4>Need support?</h4><Link href="/contact">Contact the support team</Link><a href="mailto:kaizen@example.com">kaizen@example.com</a><a href="tel:+910000000000">+91 00000 00000</a></div><div><h4>Organizing committee</h4><p>Kaizen Office & Support Team</p><Link href="/contest/login">Organizer login</Link></div></div><div className="kp-footer-bottom">© 2026 Kaizen Contest. All rights reserved. <Link href="/">About Kaizen</Link></div></footer>
  </div>;
}

export default ContestLanding;
