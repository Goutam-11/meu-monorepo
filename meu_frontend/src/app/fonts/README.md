# Bundled Geist fonts

Variable-weight Latin WOFF2 files already present in the Meu matte-dashboard assets, identical by SHA-256 to the previously built next/font/google Latin assets. The app loads these with next/font/local so production builds do not require Google font downloads. Existing CSS font variable names and weight ranges are preserved. Other character ranges use fallback fonts.

Source assets: `opendesign/mockups/matte-dashboard/meu-sans.woff2` and `meu-mono.woff2`.
