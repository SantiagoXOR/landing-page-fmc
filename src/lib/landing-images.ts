/**
 * Helper functions for selecting appropriate image assets based on device type
 */

export const getHeroImages = () => {
  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 768px)").matches;

  // Selección aleatoria entre versión 1 y 2 del background
  // Solo se ejecuta en el cliente para evitar hydration mismatch
  const version = typeof window !== "undefined" 
    ? (Math.random() < 0.5 ? "1" : "2")
    : "1"; // Default para SSR

  const backgroundPath = isMobile
    ? `/landing/hero/hero-bg-mobile-${version}.svg`
    : `/landing/hero/hero-bg-desktop-${version}.svg`;

  return {
    // Moto unificada en el background con rotación aleatoria entre versiones 1 y 2
    background: backgroundPath,
    // No se usa foreground cuando la moto está en el fondo
    foreground: "",
    titule: isMobile
      ? "/landing/hero/hero-titule-mobile.svg"
      : "/landing/hero/hero-titule-desktop.svg",
    text: isMobile
      ? "/landing/hero/hero-text-mobile.svg"
      : "/landing/hero/hero-text-desktop.svg",
  };
};

export const getImageDimensions = () => {
  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 768px)").matches;

  return {
    background: isMobile
      ? { width: 1080, height: 1920 }
      : { width: 1920, height: 1080 },
  };
};
 