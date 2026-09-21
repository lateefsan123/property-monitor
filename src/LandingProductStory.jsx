import { LANDING_PRODUCT_SECTIONS } from "./landing-product-sections";

const productStory = LANDING_PRODUCT_SECTIONS.map((section) => (
  <section
    className="landing-product-story"
    id={section.id}
    aria-labelledby={`${section.id}-heading`}
    key={section.id}
  >
    <div className="landing-product-story-inner">
      <h2 id={`${section.id}-heading`}>{section.title}</h2>
      <p>{section.description}</p>
      <figure className="landing-product-artwork">
        <picture>
          <source
            media="(max-width: 600px)"
            srcSet={`/landing/${section.mobileImage}`}
            width={section.mobileWidth}
            height={section.mobileHeight}
          />
          <img
            src={`/landing/${section.image}`}
            alt={section.alt}
            width={section.width}
            height={section.height}
            loading="lazy"
            decoding="async"
          />
        </picture>
      </figure>
      {section.prompts && (
        <ul className="landing-assistant-prompts" aria-label="Things you can ask Repeat">
          {section.prompts.map(prompt => <li key={prompt}>“{prompt}”</li>)}
        </ul>
      )}
    </div>
  </section>
));

export default function LandingProductStory() {
  return productStory;
}
