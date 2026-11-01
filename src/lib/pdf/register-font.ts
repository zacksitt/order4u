import path from "node:path";

import { Font } from "@react-pdf/renderer";

const fontDir = path.join(process.cwd(), "src/lib/pdf/fonts");

Font.register({
  family: "Noto Sans Thai",
  fonts: [
    { src: path.join(fontDir, "NotoSansThai-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "NotoSansThai-Bold.ttf"), fontWeight: 700 },
  ],
});

/** Default hyphenation gives Thai and long marketplace titles a width of zero, so the words draw on top of each other. */
Font.registerHyphenationCallback((word) => [word]);
