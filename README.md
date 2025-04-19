# Raydium Liquidity Pool Creator

This application allows users to create and seed SOL liquidity pools for any Solana token, including Token-2022 tokens.

## Direct Raydium Protocol Implementation

This project uses a direct implementation of the Raydium protocol to create liquidity pools without relying on the Raydium SDK, which has compatibility issues with bn.js. Instead, we:

1. Directly interact with the Raydium Liquidity Program
2. Create and initialize the necessary accounts
3. Build and send the required transactions

This approach avoids the "The 'bn.js' module does not provide an export named 'isBN'" error completely while still creating real, functional Raydium liquidity pools.

## Features

- Create real SOL liquidity pools for any Solana token
- Support for Token-2022 tokens
- Check if a pool already exists for a token pair
- Track your created pools
- Detailed guide on how to create and manage liquidity pools

## Technical Details

- Uses Next.js App Router
- Connects to Solana using Alchemy RPC
- Directly interacts with Raydium Liquidity Program
- Stores pool creation data in Supabase
- Supports Phantom wallet for transactions

## Development

\`\`\`bash
npm run dev
\`\`\`

## Building for Production

\`\`\`bash
npm run build
npm run start
