# TNS Wallet Integration: Resolve → Derive → Send

## User Flow

```
User enters recipient: "alice.tacit"          User enters recipient: "alice@nostr"
         │                                               │
         ▼                                               ▼
  normalize("alice.tacit")                        normalize("alice@nostr")
  → tacit:alice                                    → nip05:alice
         │                                               │
         ▼                                               ▼
  resolve("tacit:alice")                           resolve("nip05:alice")
         │                                               │
   ┌─────┴──────┐                                     ┌─┴─┐
   │ On-chain?  │                                     │   │
   └─────┬──────┘                                     │   │
    YES  │  NO                                        │   │
         ▼            ┌──────────────┐                 │   │
  [view_pub]──► Nostr │ kind 39020?  │◄────────────────┘   │
  [spend_pub]  ├ YES  └──────┬───────┘                     │
               │             │  NO                          │
               │             ▼                              │
               │      [NIP-05 direct] ◄─────────────────────┘
               │             │
               │             ▼
               │      [view_pub, spend_pub]
               │             │
               └─────────────┘
                             │
                             ▼
                Derive payment output
                ┌──────────────────────┐
                │ Pick method:          │
                │  BIP-352: sp1 addr    │
                │  BIP-47: payment code │
                │  Stealth: ECDH derive │
                └──────────────────────┘
                             │
                             ▼
                   Construct CXFER
                   Broadcast Bitcoin tx
                             │
                             ▼
                   Optionally send
                   Nostr notification
                   (kind 39015 or 39016)
```

## Client API

```typescript
interface TNSClient {
  // Resolve any supported name format to resolver record
  resolve(name: string): Promise<TNSResolver>;

  // Derive payment output from resolver record
  derivePayment(
    resolver: TNSResolver,
    amount: bigint,
    options?: DeriveOptions
  ): Promise<DerivedPayment>;

  // Send payment (resolve + derive + construct + broadcast)
  send(
    recipient: string,
    amount: bigint,
    options?: SendOptions
  ): Promise<SendResult>;
}

interface TNSResolver {
  name: string;                   // canonical name
  namehash: Uint8Array;           // 32-byte SHA256 namehash
  viewPub?: Uint8Array;           // 33-byte compressed
  spendPub?: Uint8Array;          // 33-byte compressed
  sp1Address?: string;            // BIP-352 silent payment address
  paymentCode?: string;           // BIP-47 payment code
  nostrPubkey?: Uint8Array;       // 32-byte xonly
  nip05?: string;                 // NIP-05 identifier
  textRecords?: Record<string, string>;
  tld: string;                    // tacit | ens | nip05 | icann | wns
  proof: ResolutionProof;
}

interface DerivedPayment {
  outputKey: Uint8Array;          // xonly pubkey for the recipient output
  blinding: Uint8Array;           // blinding factor for Pedersen commitment
  encryptedAmount: Uint8Array;    // encrypted amount for the output
  method: 'bip352' | 'bip47' | 'stealth';
}

interface SendOptions {
  method?: 'auto' | 'bip352' | 'bip47' | 'stealth';
  notify?: boolean;               // send Nostr notification
  years?: number;                 // for name registration
}
```

## Resolve Implementation

```typescript
async function resolve(name: string): Promise<TNSResolver> {
  const { label, tld, namespace } = normalize(name);

  // 1. Try on-chain (fast path)
  const namehash = computeNamehash(label, tld);
  const resolver = await lookupOnChain(namehash);
  if (resolver) return resolver;

  // 2. Try Nostr kind 39020 (medium path)
  const nostrResolver = await lookupNostr(label, tld);
  if (nostrResolver) return nostrResolver;

  // 3. Try direct bridge (slow path)
  switch (namespace) {
    case 'nip05':
      return resolveNip05(label, tld);     // ICANN HTTPS
    case 'ens':
      return resolveEns(label, tld);       // ENS gateway
    case 'dns':
      return resolveDns(label, tld);       // DNS oracle or direct TXT
    case 'wns':
      return resolveWns(label, tld);       // WNS bridge
    default:
      throw new Error(`unsupported namespace: ${namespace}`);
  }
}
```

## Derive Implementation

```typescript
async function derivePayment(
  resolver: TNSResolver,
  amount: bigint,
  options: DeriveOptions = {}
): Promise<DerivedPayment> {
  const method = options.method ?? 'auto';

  if (method === 'bip352' || (method === 'auto' && resolver.sp1Address)) {
    // BIP-352 silent payment
    const sp = decodeSilentPaymentAddress(resolver.sp1Address!);
    const { xOnly } = senderComputeSilentPaymentOutput({
      inputPrivs: options.inputPrivs,
      inputOutpoints: options.inputOutpoints,
      scanPub: sp.scanPub,
      spendPub: sp.spendPub,
    });
    return {
      outputKey: xOnly,
      blinding: deriveBlinding(/* ... */),
      encryptedAmount: encryptAmount(amount, blinding),
      method: 'bip352',
    };
  }

  if (method === 'bip47' || (method === 'auto' && resolver.paymentCode)) {
    // BIP-47 payment code — requires Nostr notification
    // ... (future implementation)
  }

  // Default: stealth derivation from view_pub + spend_pub
  const ephKeypair = generateKeypair();
  const sharedSecret = ecdh(ephKeypair.priv, resolver.viewPub!);
  const oneTimeSpend = hmac(sharedSecret, 'tacit-name-payment-v1');
  return {
    outputKey: pointAdd(resolver.spendPub!, multiplyG(oneTimeSpend)),
    method: 'stealth',
  };
}
```

## Name Entry UX

### Input Parsing

```
// Auto-detect name format:
"alice.tacit"    → native tacit name
"alice.tic"      → shorthand tacit name
"alice"          → default to .tacit
"alice.eth"      → ENS name
"alice@nostr"    → NIP-05 (requires domain)
"alice@co"       → ambiguous — could be NIP-05 or short tacit
"1Lbcfr7sA..."   → raw Bitcoin address (bypass TNS)
"sp1..."         → BIP-352 address (bypass TNS)
```

### Name Suggestions

When user types in the recipient field:

```
// Client queries Nostr kind 39020 with prefix search:
// (relay-dependent — not all relays support prefix search)
[{"query": {"kind": 39020, "d": "ali*"}}]

// Returns matching names + their resolver records
"alice.tacit" → view_pub: 02abc...
"alice.eth"   → view_pub: 02def...
"alice.tic"   → view_pub: 02abc... (same as alice.tacit — alias)
```

## Notification on Payment

After broadcasting the Bitcoin tx:

```typescript
// Optionally notify recipient via Nostr
if (options.notify) {
  const notifyEvent = createNotification({
    kind: resolver.tld === 'tacit' ? 39015 : 39016,
    recipient: resolver.nostrPubkey,
    content: {
      expected_output_key: derived.outputKey,
      amount_sats: amount.toString(),
      txid: broadcastResult.txid,
    },
  });

  // Gift-wrap to recipient's Nostr pubkey
  const wrapped = await giftWrap(notifyEvent, recipientNostrKey);
  await publishToRelays(wrapped);
}
```
