# dkutils-cli package

**Version:** 0.0.1

`dkutils-cli` is the package-first distribution of this repo. It ships:

- a branded library entry at `dist/DKUTILS.js`
- an executable CLI at `dist/bin/dkutils.js`
- an interactive terminal UI when run without arguments

## Install

```bash
pnpm add dkutils-cli
```

## Run with npx

```bash
npx dkutils-cli
npx dkutils-cli --help
npx dkutils-cli image --help
```

Running `npx dkutils-cli` opens the terminal UI so non-technical users can choose an operation instead of memorizing commands.

## Package usage

```ts
import { DKUTILS } from "dkutils-cli";

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
npx dkutils-cli image convert --input <path> --format <jpeg|png|webp|tiff|gif|avif> [--no-watermark]
npx dkutils-cli image compress --input <path> [--quality <1-100>] [--no-watermark]
npx dkutils-cli image resize --input <path> --width <n> --height <n> [--no-watermark]
npx dkutils-cli image crop --input <path> --left <n> --top <n> --width <n> --height <n> [--no-watermark]
npx dkutils-cli image grayscale --input <path> [--no-watermark]
npx dkutils-cli image flip --input <path> --direction <horizontal|vertical> [--no-watermark]
npx dkutils-cli image remove-bg --input <path> [--no-watermark]
npx dkutils-cli image to-pdf --input <path> [--no-watermark]
npx dkutils-cli image to-base64 --input <path> [--stdout]
npx dkutils-cli image from-base64 --input <file> [--format <png|jpeg|webp|tiff|gif|avif>] [--no-watermark]
npx dkutils-cli image png-to-jpg --input <path> [--no-watermark]
```

### `pdf`

```bash
npx dkutils-cli pdf merge <file...> [--no-watermark]
npx dkutils-cli pdf split --input <file> --ranges <1-3,5> [--no-watermark]
npx dkutils-cli pdf compress --input <file> [--level <low|medium|high>] [--no-watermark]
npx dkutils-cli pdf rotate --input <file> --angle <90|180|270> [--no-watermark]
npx dkutils-cli pdf delete-pages --input <file> --ranges <1-3,5> [--no-watermark]
npx dkutils-cli pdf to-text --input <file>
npx dkutils-cli pdf to-word --input <file>
npx dkutils-cli pdf to-excel --input <file>
npx dkutils-cli pdf text-to-pdf [--input <file> | --text <value>] [--no-watermark]
```

### `media`

```bash
npx dkutils-cli media mov-to-mp4 --input <path>
npx dkutils-cli media to-png --input <path>
```

### `youtube`

```bash
npx dkutils-cli youtube download --url <url>
```

## Dist artifacts

After `pnpm --filter dkutils-cli build`, the main shipped files are:

- `dist/DKUTILS.js`
- `dist/DKUTILS.d.ts`
- `dist/bin/dkutils.js`
- `dist/bin/dkutils.d.ts`

## Development

```bash
pnpm --filter dkutils-cli type-check
pnpm --filter dkutils-cli lint
pnpm --filter dkutils-cli build
pnpm --filter dkutils-cli test
```

## Notes

- Native-heavy commands depend on `ffmpeg-static`, and `yt-dlp-static`.
- If install scripts are blocked in your environment, reinstall dependencies with build scripts enabled before using image, PDF, or media commands end-to-end.
- Output files are always saved in the same directory as the input file.
