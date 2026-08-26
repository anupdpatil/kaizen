import { useEffect, useState } from "react";
import "../styles/public-portal.css";

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const updateHeader = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    event.currentTarget.reset();
  };

  return <div className="kaizen-portal kp-contact-page">
    <header className={`kp-header${isScrolled ? " is-scrolled" : ""}`}><a href="/" className="kp-brand"><b>KAIZEN</b><i>Continuous improvement, every day.</i></a><nav className="kp-nav"><a href="/">About Kaizen</a><a href="/contest">Contest</a></nav><a href="/contest/login" className="kp-login">Contest login <span>→</span></a></header>
    <main className="kp-contact-main"><section className="kp-contact-intro"><p className="kp-kicker">CONTACT US</p><h1>Let’s make<br /><em>better happen.</em></h1><p>Whether you need contest support, would like to discuss Kaizen, or have a question for the organizing committee, we would love to hear from you.</p></section><section className="kp-contact-layout"><aside><h2>Talk to our team</h2><div><b>Kaizen Support Desk</b><a href="mailto:kaizen@example.com">kaizen@example.com</a><a href="tel:+910000000000">+91 00000 00000</a></div><div><b>Support hours</b><p>Monday–Friday<br />9:00 AM–6:00 PM IST</p></div><div><b>Contest office</b><p>Kaizen Office<br />Continuous Improvement Centre<br />Mumbai, India</p></div></aside><div className="kp-contact-form-wrap"><h2>Send us a message</h2>{submitted ? <div className="kp-form-success"><b>Thank you—your message is ready for the Kaizen team.</b><p>We will respond within two working days.</p><button type="button" onClick={() => setSubmitted(false)} className="kp-button kp-button-quiet">Send another message</button></div> : <form onSubmit={handleSubmit} className="kp-contact-form"><label>Full name<input required name="name" type="text" placeholder="Your name" /></label><label>Work email<input required name="email" type="email" placeholder="name@company.com" /></label><label>I am contacting about<select required name="topic" defaultValue=""><option value="" disabled>Select a topic</option><option>Contest participation</option><option>Kaizen methodology</option><option>Partnership or collaboration</option><option>General enquiry</option></select></label><label>Message<textarea required name="message" rows="5" placeholder="How can we help?"></textarea></label><button className="kp-button kp-button-primary" type="submit">Send message <span>→</span></button></form>}</div></section></main>
    <footer className="kp-footer"><div className="kp-footer-bottom">© 2026 Kaizen. Continuous improvement for a better tomorrow. <a href="/">Back to Kaizen home</a></div></footer>
  </div>;
}

export default ContactPage;
