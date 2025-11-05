# Lucid Cipher Dreams - Frontend

Dream Encryption Game frontend built with React + TypeScript + Vite + RainbowKit.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy UI components from `model/lucid-cipher-dreams/src/components/ui/` to `src/components/ui/`

3. Copy logo asset:
```bash
# Copy drecate-logo.png from model/lucid-cipher-dreams/src/assets/ to src/assets/
```

4. Create favicon.png and place in `public/` directory

5. Create contract types after deployment:
```bash
# After contract deployment, copy generated types from ../types/contracts/
```

6. Update contract address in `src/config/contracts.ts` after deployment

7. Set environment variables (optional):
```bash
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Features

- Rainbow wallet integration
- FHEVM integration for homomorphic encryption
- AES-GCM encryption for dream text
- Contract interaction hooks
- Dream submission and gallery
- Dream interpretation with count tracking



