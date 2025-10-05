/**
 * Helper functions for selecting appropriate image assets based on device type
 */

export const getHeroImages = () => {
  const isMobile = typeof window !== "undefined" && 
    window.matchMedia("(max-width: 768px)").matches;

  return {
    background: isMobile 
      ? "/hero/hero-bg-mobile.jpg"
      : "/hero/hero-bg-desktop.jpg",
    foreground: isMobile
      ? "/hero/hero-fg-mobile.png" 
      : "/hero/hero-fg-desktop.png"
  };
};

export const getImageDimensions = () => {
  const isMobile = typeof window !== "undefined" && 
    window.matchMedia("(max-width: 768px)").matches;

  return {
    background: isMobile 
      ? { width: 1080, height: 1920 }
      : { width: 1920, height: 1080 },
    foreground: isMobile
      ? { width: 800, height: 1200 }
      : { width: 1200, height: 1600 }
  };
};