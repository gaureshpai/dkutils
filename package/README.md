# dkutils package

**Version:** 0.0.1

`dkutils` is the package-first distribution of this repo. It ships:

- a branded library entry at `dist/DKUTILS.js`
- an executable CLI at `dist/bin/dkutils.js`
- an interactive terminal UI when run without arguments

## Install

```bash
pnpm add dkutils
```

## Run with npx

```bash
npx dkutils
npx dkutils --help
npx dkutils image --help
```

Running `npx dkutils` opens the terminal UI so non-technical users can choose an operation instead of memorizing commands.

## Package usage

```ts
import { DKUTILS } from "dkutils";

const pages = DKUTILS.pdf.parsePageRanges("1-3,5", 8);
```

## CLI groups

The CLI has four top-level groups:

- `image`
- `pdf`
- `media`
- `youtube`

## Common commands

### `image`

```bash
npx dkutils image convert --input <path> --format <jpeg|png|webp|tiff|gif|avif> [--no-watermark]
npx dkutils image compress --input <path> [--quality <1-100>] [--no-watermark]
npx dkutils image resize --input <path> --width <n> --height <n> [--no-watermark]
npx dkutils image crop --input <path> --left <n> --top <n> --width <n> --height <n> [--no-watermark]
npx dkutils image grayscale --input <path> [--no-watermark]
npx dkutils image flip --input <path> --direction <horizontal|vertical> [--no-watermark]
npx dkutils image remove-bg --input <path> [--no-watermark]
npx dkutils image to-pdf --input <path> [--no-watermark]
npx dkutils image to-base64 --input <path> [--stdout]
npx dkutils image from-base64 --input <file> [--format <png|jpeg|webp|tiff|gif|avif>] [--no-watermark]
npx dkutils image png-to-jpg --input <path> [--no-watermark]
```

### `pdf`

```bash
npx dkutils pdf merge <file...> [--no-watermark]
npx dkutils pdf split --input <file> --ranges <1-3,5> [--no-watermark]
npx dkutils pdf compress --input <file> [--level <low|medium|high>] [--no-watermark]
npx dkutils pdf rotate --input <file> --angle <90|180|270> [--no-watermark]
npx dkutils pdf delete-pages --input <file> --ranges <1-3,5> [--no-watermark]
npx dkutils pdf to-text --input <file>
npx dkutils pdf to-word --input <file>
npx dkutils pdf to-excel --input <file>
npx dkutils pdf text-to-pdf [--input <file> | --text <value>] [--no-watermark]
```

### `media`

```bash
npx dkutils media mov-to-mp4 --input <path>
npx dkutils media to-png --input <path>
```

### `youtube`

```bash
npx dkutils youtube download --url <url>
```

## Dist artifacts

After `pnpm --filter dkutils build`, the main shipped files are:

- `dist/DKUTILS.js`
- `dist/DKUTILS.d.ts`
- `dist/bin/dkutils.js`
- `dist/bin/dkutils.d.ts`

## Development

```bash
pnpm --filter dkutils type-check
pnpm --filter dkutils lint
pnpm --filter dkutils build
pnpm --filter dkutils test
```

## Notes

- Native-heavy commands depend on `ffmpeg-static`, and `yt-dlp-static`.
- If install scripts are blocked in your environment, reinstall dependencies with build scripts enabled before using image, PDF, or media commands end-to-end.
- Output files are always saved in the same directory as the input file.
