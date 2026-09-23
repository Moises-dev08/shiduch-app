import { useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * Visible viewport height on web.
 * Android Chrome's layout viewport (100vh) extends under the browser toolbar,
 * which pushes the bottom tab bar off screen. visualViewport is the area
 * that is actually visible.
 */
export function useWebViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    const update = (): void => {
      const viewport = window.visualViewport;
      const next = Math.round(viewport?.height ?? window.innerHeight);
      setHeight((prev) => (prev === next ? prev : next));
    };

    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);

    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);

  return height;
}
