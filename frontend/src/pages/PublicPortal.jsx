import { useEffect, useRef, useState } from "react";
import "../styles/public-portal.css";

const Link = ({ href, children, className = "" }) => (
  <a className={className} href={href}>{children}</a>
);

const icons = ["Observe", "Improve", "Standardize"];
const testimonials = [
  { quote: "We stopped accepting a process just because it was familiar. The team now asks, ‘What can we make better today?’", name: "Meera Nair", role: "Team Lead, Operations · 2025 Finalist" },
  { quote: "The strongest ideas were not expensive or complex. They were thoughtful, tested by the people doing the work.", name: "Arun Iyer", role: "Jury Member · Quality Excellence" },
  { quote: "Kaizen has made continuous improvement visible, practical and deeply human for our organization.", name: "Sonal Deshmukh", role: "People & Culture Partner" },
  { quote: "Our improvement reduced rework by a third. More importantly, it gave the team time to focus on the customer again.", name: "Vivek Shah", role: "Process Engineer · 2024 Category Winner" },
  { quote: "The contest turned a local idea into a shared standard. Four teams now use the solution every day.", name: "Pooja Menon", role: "Service Excellence Lead" },
  { quote: "Presenting our story helped us see how far we had come—and where the next improvement could begin.", name: "Karthik Rao", role: "Team Momentum · 2025 Excellence Award" },
  { quote: "A small safety suggestion from a new colleague became one of our most important daily practices.", name: "Farah Khan", role: "Safety Champion · Manufacturing" },
  { quote: "Kaizen gives everyone permission to be curious, and then the discipline to turn curiosity into progress.", name: "Nitin Verma", role: "Plant Head · Continuous Improvement Sponsor" },
];

function SectionTitle({ eyebrow, title, children }) {
  return <div className="kp-section-heading">
    <span>{eyebrow}</span>
    <h2>{title}</h2>
    {children && <p>{children}</p>}
  </div>;
}

function PublicPortal() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [testimonialStart, setTestimonialStart] = useState(0);
  const pendingNavigation = useRef(false);

  const moveTestimonials = (direction) => {
    setTestimonialStart((current) =>
      (current + direction + testimonials.length) % testimonials.length,
    );
  };

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
    const interval = window.setInterval(
      () => setTestimonialStart((current) => (current + 1) % testimonials.length),
      6500,
    );
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const sections = ["methodology", "contest", "community"]
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

  return <div className="kaizen-portal">
    <header className={`kp-header${isScrolled ? " is-scrolled" : ""}`}>
      <Link href="/" className="kp-brand"><b>KAIZEN</b><i>Continuous improvement, every day.</i></Link>
      <nav className="kp-nav" aria-label="Main navigation">
        <a onClick={() => handleNavigation("methodology")} className={activeSection === "methodology" ? "is-active" : ""} href="#methodology">Methodology</a><a onClick={() => handleNavigation("contest")} className={activeSection === "contest" ? "is-active" : ""} href="#contest">Contest</a><a onClick={() => handleNavigation("community")} className={activeSection === "community" ? "is-active" : ""} href="#community">Community</a><Link href="/contact">Contact</Link>
      </nav>
      <Link href="/contest/login" className="kp-login">Contest login <span>→</span></Link>
    </header>

    <main>
      <section className="kp-hero">
        <div className="kp-hero-copy">
          <p className="kp-kicker">A culture of better</p>
          <h1>Small improvements.<br /><em>Meaningful change.</em></h1>
          <p className="kp-lead">Kaizen makes progress a shared practice. We bring together people, ideas and action to build better work—one thoughtful improvement at a time.</p>
          <div className="kp-actions"><Link href="/contest" className="kp-button kp-button-primary">Explore the contest <span>→</span></Link><a href="#methodology" className="kp-button kp-button-quiet">Discover Kaizen <span>↓</span></a></div>
        </div>
        <div className="kp-hero-art" aria-label="Illustration of continuous improvement">
          <div className="kp-sun"></div><div className="kp-orbit kp-orbit-one"></div><div className="kp-orbit kp-orbit-two"></div>
          <div className="kp-step kp-step-one">01 <small>Notice</small></div><div className="kp-step kp-step-two">02 <small>Improve</small></div><div className="kp-step kp-step-three">03 <small>Share</small></div>
          <div className="kp-growth"><span></span><span></span><span></span><span></span></div>
        </div>
      </section>

      <section className="kp-intro" id="methodology">
        <SectionTitle eyebrow="THE KAIZEN WAY" title="Progress is not a one-time event.">Kaizen is the Japanese practice of continuous improvement. It puts the people closest to a challenge at the heart of solving it.</SectionTitle>
        <div className="kp-principles">
          {icons.map((item, index) => <article key={item} className="kp-principle"><strong>0{index + 1}</strong><h3>{item}</h3><p>{index === 0 ? "See work clearly. Ask why. Find the opportunity in the everyday." : index === 1 ? "Test practical ideas together and measure the difference they make." : "Make successful improvements part of how work is done—and inspire the next one."}</p></article>)}
        </div>
      </section>

      <section className="kp-featured" id="contest">
        <div className="kp-contest-copy"><p className="kp-kicker">KAIZEN CONTEST 2026</p><h2>Ideas in motion.</h2><p>Our annual contest celebrates teams who turn insight into impact. Share your improvement story, learn from peers and help set a new standard for what is possible.</p><div className="kp-date"><span>NOW OPEN</span><b>Entries close 30 September 2026</b></div><Link href="/contest" className="kp-text-link">View contest details →</Link></div>
        <div className="kp-contest-stats"><div><b>120+</b><span>teams expected</span></div><div><b>8</b><span>improvement categories</span></div><div><b>₹ 5L</b><span>awards & recognition</span></div></div>
      </section>

      <section className="kp-process">
        <SectionTitle eyebrow="FROM IDEA TO IMPACT" title="A contest designed for learning.">Every entry is an opportunity to make your work better and share what you discovered.</SectionTitle>
        <ol><li><span>01</span><div><h3>Find an opportunity</h3><p>Identify a problem or possibility that matters to your team, customer or community.</p></div></li><li><span>02</span><div><h3>Build your Kaizen</h3><p>Use structured problem solving to test, improve and document your result.</p></div></li><li><span>03</span><div><h3>Tell your story</h3><p>Present your improvement to our panel and a community of fellow practitioners.</p></div></li><li><span>04</span><div><h3>Celebrate & scale</h3><p>Recognize achievement and take the best ideas further across the organization.</p></div></li></ol>
      </section>

      <section className="kp-categories">
        <SectionTitle eyebrow="CONTEST CATEGORIES" title="Every improvement has a place.">Enter the category that best reflects the change your team has made.</SectionTitle>
        <div className="kp-category-grid"><span>Quality & Customer Value</span><span>Cost & Productivity</span><span>Safety & Wellbeing</span><span>Delivery & Service</span><span>Environment & Sustainability</span><span>Digital Improvement</span><span>People & Culture</span><span>Innovation Excellence</span></div>
      </section>

      <section className="kp-community" id="community">
        <div><p className="kp-kicker">OUR COMMUNITY</p><h2>Better is a team sport.</h2><p>From first-time participants to seasoned improvement leaders, our community proves that good ideas grow when they are shared.</p><Link href="/contest#previous" className="kp-text-link">Meet past winners →</Link></div>
        <blockquote>“The contest gave our team the confidence to make a small change that transformed a daily process. That is the real award.”<cite>— 2025 participant</cite></blockquote>
      </section>

      <section className="kp-testimonials">
        <SectionTitle eyebrow="VOICES OF KAIZEN" title="What improvement feels like in practice.">Stories from participants, mentors and leaders across our Kaizen community.</SectionTitle>
        <div className="kp-testimonial-carousel" aria-label="Kaizen testimonials">
          <div className="kp-testimonial-grid" aria-live="polite">{[0, 1, 2].map((offset) => { const testimonial = testimonials[(testimonialStart + offset) % testimonials.length]; return <article key={testimonial.name}><p>“{testimonial.quote}”</p><div><b>{testimonial.name}</b><span>{testimonial.role}</span></div></article>; })}</div>
          <div className="kp-carousel-controls"><button type="button" onClick={() => moveTestimonials(-1)} aria-label="Show previous testimonials">←</button><div className="kp-carousel-dots" aria-label="Choose testimonial slide">{testimonials.map((testimonial, index) => <button key={testimonial.name} type="button" onClick={() => setTestimonialStart(index)} className={index === testimonialStart ? "is-active" : ""} aria-label={`Show testimonial ${index + 1}`} aria-current={index === testimonialStart ? "true" : undefined}></button>)}</div><button type="button" onClick={() => moveTestimonials(1)} aria-label="Show next testimonials">→</button></div>
        </div>
      </section>

      <section className="kp-management-message"><div className="kp-message-mark">“</div><div><p className="kp-kicker">A MESSAGE FROM MANAGEMENT</p><h2>Improvement belongs to everyone.</h2><p>“Our ambition is not simply to solve today’s problems. It is to create an environment where every colleague feels able to notice, question and improve the work around them. The Kaizen Contest is a celebration of that shared responsibility.”</p><div className="kp-signature"><b>Rajiv Malhotra</b><span>Managing Director</span></div></div></section>

      <section className="kp-resources">
        <SectionTitle eyebrow="GET READY" title="Everything you need to take part." />
        <div className="kp-resource-grid"><article><span>01</span><h3>Contest rules</h3><p>Eligibility, entry requirements and timelines.</p><Link href="/contest#rules">Read the rules →</Link></article><article><span>02</span><h3>Participant guide</h3><p>A practical guide to preparing your Kaizen story.</p><Link href="/contest#guidelines">View the guide →</Link></article><article><span>03</span><h3>Evaluation method</h3><p>Understand how entries are assessed fairly.</p><Link href="/contest#evaluation">See the criteria →</Link></article></div>
      </section>

      <section className="kp-committee"><SectionTitle eyebrow="THE PEOPLE BEHIND THE CONTEST" title="Meet the organizing committee." /><div className="kp-committee-grid"><article><div className="kp-avatar kp-avatar-one">AK</div><h3>Ananya Kapoor</h3><p>Contest Chair</p><small>Strategy & Transformation</small></article><article><div className="kp-avatar kp-avatar-two">RM</div><h3>Rohan Mehta</h3><p>Program Lead</p><small>Operational Excellence</small></article><article><div className="kp-avatar kp-avatar-three">SP</div><h3>Shruti Patel</h3><p>Participant Support</p><small>People & Culture</small></article><article><div className="kp-avatar kp-avatar-four">VK</div><h3>Vikram Kulkarni</h3><p>Evaluation Lead</p><small>Quality Systems</small></article></div><p className="kp-support-note"><b>Need help with your entry?</b> Our support team is available Monday–Friday, 9:00 AM–6:00 PM at <a href="mailto:kaizen@example.com">kaizen@example.com</a>.</p></section>
    </main>
    <footer className="kp-footer"><div className="kp-footer-top"><div><b className="kp-footer-brand">KAIZEN</b><p>Making continuous improvement a way of working.</p></div><div><h4>Explore</h4><a href="#methodology">Methodology</a><Link href="/contest">Contest</Link><a href="#community">Community</a></div><div><h4>Get in touch</h4><Link href="/contact">Contact us</Link><a href="mailto:kaizen@example.com">kaizen@example.com</a><a href="tel:+910000000000">+91 00000 00000</a></div></div><div className="kp-footer-bottom">© 2026 Kaizen. Continuous improvement for a better tomorrow. <Link href="/contest/login">Organizer login</Link></div></footer>
  </div>;
}

export default PublicPortal;
