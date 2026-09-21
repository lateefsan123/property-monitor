import "./styles/landing-broker-feedback.css";

// Fictional layout copy only. Never render these as real customer endorsements.
export default function LandingBrokerFeedback() {
  if (!import.meta.env.DEV) return null;

  return (
    <section className="landing-feedback" id="broker-feedback" aria-labelledby="landing-feedback-heading" aria-describedby="landing-feedback-draft">
      <div className="landing-feedback-inner">
        <h2 id="landing-feedback-heading">Less admin. More conversations.</h2>
        <p className="landing-feedback-draft" id="landing-feedback-draft">
          Draft preview · Fictional names and quotes, not customer reviews.
        </p>
        <div className="landing-feedback-grid">
          <figure className="landing-feedback-quote">
            <blockquote>
              “I had sellers in three different Excel files. Now it’s <mark>all in one place.</mark> I can find the owner, check my notes and get on with the call.”
            </blockquote>
            <figcaption>Ahmed <span>Dubai Marina</span></figcaption>
          </figure>
          <figure className="landing-feedback-quote">
            <blockquote>
              “Between viewings, it’s easy to forget who you were meant to message. <mark>Having the follow-ups ready</mark> makes the day a bit easier.”
            </blockquote>
            <figcaption>Ayesha <span>Downtown Dubai</span></figcaption>
          </figure>
          <figure className="landing-feedback-quote">
            <blockquote>
              “Most of my day is on WhatsApp anyway. Being able to <mark>check the seller and send an update</mark> without digging through sheets just makes sense.”
            </blockquote>
            <figcaption>Rohan <span>Business Bay</span></figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
