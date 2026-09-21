import { LANDING_BUILDINGS } from './landing-buildings';
import './styles/landing-buildings.css';

export default function LandingBuildings() {
  return (
    <section className="landing-buildings" id="buildings" aria-labelledby="landing-buildings-heading">
      <h2 id="landing-buildings-heading">Your buildings. One workspace.</h2>
      <ul className="landing-building-grid">
        {LANDING_BUILDINGS.map(building => (
          <li key={building.name}>
            <img src={`/landing/tower-logos/${building.logo}`} alt={building.name}
              width="180" height="90" loading="lazy" decoding="async" />
          </li>
        ))}
      </ul>
    </section>
  );
}
