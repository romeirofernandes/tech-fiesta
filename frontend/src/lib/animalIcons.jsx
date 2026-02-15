import { GiCow, GiBullHorns, GiGoat, GiSheep, GiRooster, GiPig, GiHorseHead, GiPawPrint } from "react-icons/gi";

const speciesIconMap = {
  cow: GiCow,
  buffalo: GiBullHorns,
  goat: GiGoat,
  sheep: GiSheep,
  chicken: GiRooster,
  pig: GiPig,
  horse: GiHorseHead,
  other: GiPawPrint,
};

const speciesColors = {
  cow: "#8B4513",        // brown
  buffalo: "#2F4F4F",    // dark slate grey
  goat: "#F5DEB3",       // wheat/light tan
  sheep: "#FFFACD",      // light yellow
  chicken: "#FF6347",    // tomato/red
  pig: "#FFB6C1",        // light pink
  horse: "#A0522D",      // sienna/brown
  other: "#A9A9A9",      // dark grey
};

export function getSpeciesIcon(species, className = "h-6 w-6") {
  const IconComponent = speciesIconMap[species] || GiPawPrint;
  const color = speciesColors[species] || speciesColors.other;
  return <IconComponent className={className} style={{ color }} />;
}

export function SpeciesIcon({ species, className = "h-6 w-6" }) {
  const IconComponent = speciesIconMap[species] || GiPawPrint;
  const color = speciesColors[species] || speciesColors.other;
  return <IconComponent className={className} style={{ color }} />;
}

export const speciesOptions = [
  { value: "cow", label: "Cow", Icon: GiCow, color: speciesColors.cow },
  { value: "buffalo", label: "Buffalo", Icon: GiBullHorns, color: speciesColors.buffalo },
  { value: "goat", label: "Goat", Icon: GiGoat, color: speciesColors.goat },
  { value: "sheep", label: "Sheep", Icon: GiSheep, color: speciesColors.sheep },
  { value: "chicken", label: "Chicken", Icon: GiRooster, color: speciesColors.chicken },
  { value: "pig", label: "Pig", Icon: GiPig, color: speciesColors.pig },
  { value: "horse", label: "Horse", Icon: GiHorseHead, color: speciesColors.horse },
  { value: "other", label: "Other", Icon: GiPawPrint, color: speciesColors.other },
];
