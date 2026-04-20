# dkutils

**Version:** 2.0.3

`dkutils` is now centered on the npm package and interactive CLI, with the website and backend kept as supporting surfaces inside the same monorepo.

## Main product

The primary distribution is the package in [`package`](./package):

- npm package name: `dkutils`
- library entry: `package/dist/DKUTILS.js`
- executable CLI: `package/dist/bin/dkutils.js`
- expected user flow: `npx dkutils`

Running `npx dkutils` opens an interactive terminal UI. Users can select image, PDF, media, and YouTube operations without needing to remember command syntax.

## Monorepo layout

- `package`: npm package
- `frontend`: website UI for browser-based usage
- `backend`: supporting API/backend services

Shared dependency versions are managed through the workspace catalog in [`pnpm-workspace.yaml`](./pnpm-workspace.yaml).

## Quick start

```bash
pnpm install
pnpm --filter dkutils build
pnpm --filter dkutils test
```

To try the packaged CLI locally from this repo:

```bash
node package/dist/bin/dkutils.js
```

To publish and use it the intended way:

```bash
npx dkutils
```

## Package usage

```ts
import { DKUTILS } from "dkutils";

const pages = DKUTILS.pdf.parsePageRanges("1-2,4", 6);
```

## Tool coverage

- Image: convert, compress, resize, crop, grayscale, flip, remove background, base64, image-to-PDF, PNG-to-JPG
- PDF: merge, split, compress, rotate, delete pages, PDF-to-text, PDF-to-Word, PDF-to-Excel, text-to-PDF
- Media: MOV-to-MP4, media-to-PNG
- YouTube: download

## Docs

- Package documentation: [`package/README.md`](./package/README.md)
- Frontend notes: [`frontend/README.md`](./frontend/README.md)
- Backend notes: [`backend/README.md`](./backend/README.md)

## Development

```bash
pnpm build
pnpm --filter dkutils type-check
pnpm --filter dkutils lint
pnpm --filter dkutils test
```

## Notes

- The package is the preferred focus for new utility work.
- Some image, PDF, and media features rely on native/runtime packages and external binaries, so those commands require a normal dependency install with build scripts enabled.

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please refer to [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

---

## 📄 License

Distributed under the **ISC License**. See `LICENSE` for more information.

---

**Developed with ❤️ by [gaureshpai](https://github.com/gaureshpai)**
