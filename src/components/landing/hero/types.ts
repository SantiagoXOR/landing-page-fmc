export interface ParallaxOptions {
  bgSpeed?: number;
  fgSpeed?: number;
}

export interface ParallaxRefs {
  bgRef: React.RefObject<HTMLDivElement>;
  fgRef: React.RefObject<HTMLDivElement>;
}

export interface HeroProps {
  className?: string;
}