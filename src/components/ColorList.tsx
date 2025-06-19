import { useState } from "react";

const colorList = [
  "FFF8A3",
  "FFD1DC",
  "FFCBA4",
  "FFE5B4",
  "D1F7C4",
  "A4F3FF",
  "CFE2FF",
  "A0C4FF",
  "E9DAFF",
  "D4F1BE",
  "CFFF04",
  "FF6F61",
  "FFE066",
  "FFABAB",
  "FFFFFF",
  "DDDDDD",
];

interface ColorListProps {
  selectedColor?: string,
  className?: string,
  onPicked: (color: string) => void,
}

export default function ColorList({ selectedColor, className, onPicked }: ColorListProps) {
  const [expanded, setExpanded] = useState(false);
  const onClickExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    setExpanded(!expanded);
  };
  const onClickPick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    const color = e.currentTarget.dataset.color;
    if (color) {
      onPicked(color);
      setExpanded(false);
    }
  };

  return (
    <div className={"absolute top-0 left-0 w-full p-2 flex flex-wrap gap-[2px] " + (className ?? '')}>
      <div className="w-4 h-4 bg-white cursor-pointer border border-dotted" style={{ backgroundColor: `#${selectedColor ?? 'fff'}` }} onClick={onClickExpand}></div>
      {expanded ? colorList.filter(c => c != selectedColor).map(color => (
        <div className="w-4 h-4 bg-white cursor-pointer border border-dotted" data-color={color} style={{ backgroundColor: `#${color ?? 'fff'}` }} onClick={onClickPick}></div>
      )) : null}
    </div>
  );
}
