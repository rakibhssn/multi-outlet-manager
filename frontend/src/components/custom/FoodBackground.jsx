import {
  PiBeerStein,
  PiBowlFood,
  PiCake,
  PiCoffee,
  PiCookie,
  PiCookingPot,
  PiForkKnife,
  PiHamburger,
  PiIceCream,
  PiMartini,
  PiPepper,
  PiPizza,
  PiWine,
  PiChefHat,
  PiOrange,
} from "react-icons/pi";

const FOOD_ICONS = [
  PiCoffee,
  PiPizza,
  PiWine,
  PiHamburger,
  PiCake,
  PiMartini,
  PiBowlFood,
  PiBeerStein,
  PiIceCream,
  PiPepper,
  PiCookie,
  PiCookingPot,
  PiChefHat,
  PiOrange,
  PiForkKnife,
];
const TILTS = 5;
const PATTERN_CELLS = 240;

export default function FoodBackground() {
  return (
    <div aria-hidden className="login-bg">
      <div className="login-glow login-glow-top" />
      <div className="login-glow login-glow-bottom" />
      <div className="login-glow login-glow-center" />

      <div className="login-pattern">
        {Array.from({ length: PATTERN_CELLS }, (_, i) => {
          const Icon = FOOD_ICONS[(i * 7) % FOOD_ICONS.length];
          const tilt = `food-icon-tilt-${((i * 3) % TILTS) + 1}`;
          const shift = Math.floor(i / 16) % 2 ? "food-icon-shift" : "";
          return <Icon key={i} className={`food-icon ${tilt} ${shift}`} />;
        })}
      </div>

      <div className="login-vignette" />
    </div>
  );
}
