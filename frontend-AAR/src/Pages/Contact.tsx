import Header from '../Components/Layout/Header'
import Footer from '../Components/Layout/Footer'
import '../Styles/contact.css'

export default function Contact() {
  return (
    <div className="contact-shell">
      <Header />
      <main className="contact-main">
        <section className="contact-card">
          <h1>Contact Us</h1>
          <p>
            Joint Air Power Competence Centre<br />
            Römerstrasse 140<br />
            47546 Kalkar<br />
            Germany
          </p>
          <ul className="contact-list">
            <li>
              Email: <a href="mailto:contact@japcc.org">contact@japcc.org</a>
            </li>
            <li>
              Telefoon: <a href="tel:+49 (0) 2824 90 2201">+49 (0) 2824 90 2201</a>
            </li>
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  )
}
