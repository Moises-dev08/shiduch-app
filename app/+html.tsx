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
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveRootStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveRootStyles = `
html, body, #root {
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
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
