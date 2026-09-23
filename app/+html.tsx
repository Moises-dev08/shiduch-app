import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveRootStyles }} />
        <script dangerouslySetInnerHTML={{ __html: viewportHeightScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveRootStyles = `
html, body, #root {
  height: 100%;
  height: 100dvh;
  height: var(--app-height, 100dvh);
  max-height: 100dvh;
  max-height: var(--app-height, 100dvh);
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
#root {
  display: flex;
  flex-direction: column;
}
input,
textarea {
  font-family: inherit;
  -webkit-user-select: text;
  user-select: text;
}
input:focus,
textarea:focus {
  outline: none;
}
`;

/** Keeps the document height equal to the visible viewport (excludes Android Chrome's toolbar). */
const viewportHeightScript = `
(function () {
  function setAppHeight() {
    var viewport = window.visualViewport;
    var height = viewport && viewport.height ? viewport.height : window.innerHeight;
    document.documentElement.style.setProperty("--app-height", Math.round(height) + "px");
  }
  setAppHeight();
  window.addEventListener("resize", setAppHeight);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", setAppHeight);
    window.visualViewport.addEventListener("scroll", setAppHeight);
  }
})();
`;
