import { describe, test, expect } from 'bun:test';
import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';
import { concatBytes, bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { SECP_N } from '../../src/constants/limits.js';
import { Opcode } from '../../src/constants/opcodes.js';
import {
  STEALTH_HRP,
  DOMAIN_CXFER_STEALTH,
  DOMAIN_AXFER_STEALTH,
  STEALTH_DOMAIN_BY_OPCODE,
  MIXER_EMITTING_OPCODES,
} from '../../src/crypto/stealth.js';
import {
  encodeStealthAddress,
  decodeStealthAddress,
  deriveStealthEcdhBlinding,
  deriveStealthEcdhSharedSecret,
  deriveStealthBlindingFromShared,
  computeStealthCommit,
  computeStealthTweakedSk,
  classifyStealthInput,
  isStealthEligibleKind,
  aggregateStealthEligibleInputPubkeys,
  checkStealthEmissionSafety,
  senderComputeStealthCommit,
  recipientScanTxForStealth,
  stealthTxAnchorHead,
} from '../../src/crypto/stealth.js';
import { p2wpkhScript } from '../../src/transaction/address.js';

const G = secp.ProjectivePoint.BASE;

function keypair(): { priv: Uint8Array; pub: Uint8Array } {
  const priv = secp.utils.randomPrivateKey();
  return { priv, pub: secp.getPublicKey(priv, true) };
}

describe('Stealth address codec (§D.1)', () => {
  test('single-mode roundtrip on signet', () => {
    const { pub } = keypair();
    const addr = encodeStealthAddress({ network: 'signet', recipientPub: pub });
    expect(addr.startsWith('tcsts1')).toBe(true);
    const d = decodeStealthAddress(addr);
    expect(d.mode).toBe('single');
    if (d.mode === 'single') {
      expect(bytesToHex(d.recipientPub)).toBe(bytesToHex(pub));
    }
  });

  test('dual-mode roundtrip on mainnet', () => {
    const a = keypair();
    const b = keypair();
    const addr = encodeStealthAddress({
      network: 'mainnet',
      scanPub: a.pub,
      spendPub: b.pub,
    });
    expect(addr.startsWith('tcs1')).toBe(true);
    const d = decodeStealthAddress(addr);
    expect(d.mode).toBe('dual');
    if (d.mode === 'dual') {
      expect(bytesToHex(d.scanPub)).toBe(bytesToHex(a.pub));
      expect(bytesToHex(d.spendPub)).toBe(bytesToHex(b.pub));
    }
  });

  test('HRPs match network', () => {
    expect(STEALTH_HRP.mainnet).toBe('tcs');
    expect(STEALTH_HRP.signet).toBe('tcsts');
    expect(STEALTH_HRP.regtest).toBe('tcsrt');
  });

  test('tampered checksum rejected', () => {
    const { pub } = keypair();
    const addr = encodeStealthAddress({ network: 'signet', recipientPub: pub });
    const sep = addr.lastIndexOf('1');
    const tampered =
      addr.slice(0, sep + 5) +
      (addr[sep + 5] === 'q' ? 'p' : 'q') +
      addr.slice(sep + 6);
    expect(() => decodeStealthAddress(tampered)).toThrow();
  });

  test('malformed pubkey rejected', () => {
    const fakePub = new Uint8Array(33);
    expect(() =>
      decodeStealthAddress(
        encodeStealthAddress({ network: 'signet', recipientPub: fakePub }),
      ),
    ).toThrow();
  });
});

describe('ECDH blinding + commit (§A)', () => {
  test('sender and recipient agree on blinding', () => {
    const alice = keypair();
    const bob = keypair();
    const txAnchor = crypto.getRandomValues(new Uint8Array(40));
    const bSender = deriveStealthEcdhBlinding({
      ourPriv: bob.priv,
      theirPub: alice.pub,
      networkTag: 'signet',
      domain: DOMAIN_CXFER_STEALTH,
      txAnchor,
    });
    const bRecipient = deriveStealthEcdhBlinding({
      ourPriv: alice.priv,
      theirPub: bob.pub,
      networkTag: 'signet',
      domain: DOMAIN_CXFER_STEALTH,
      txAnchor,
    });
    expect(bSender).toBe(bRecipient);
  });

  test('locked-vector: x-only ECDH serialization', () => {
    const alice = {
      priv: hexToBytes('00'.repeat(31) + '01'),
      pub: secp.getPublicKey(hexToBytes('00'.repeat(31) + '01'), true),
    };
    const bob = {
      priv: hexToBytes('00'.repeat(31) + '02'),
      pub: secp.getPublicKey(hexToBytes('00'.repeat(31) + '02'), true),
    };
    const txAnchor = hexToBytes('00'.repeat(35) + 'ff' + '00'.repeat(4));
    const bSender = deriveStealthEcdhBlinding({
      ourPriv: bob.priv,
      theirPub: alice.pub,
      networkTag: 'mainnet',
      domain: DOMAIN_CXFER_STEALTH,
      txAnchor,
    });
    const sharedPt = secp.ProjectivePoint.fromHex(bytesToHex(alice.pub)).multiply(
      BigInt('0x' + bytesToHex(bob.priv)),
    );
    const xOnlyForm = sha256(sharedPt.toRawBytes(true).slice(1));
    const compressedForm = sha256(sharedPt.toRawBytes(true));
    expect(bytesToHex(xOnlyForm)).not.toBe(bytesToHex(compressedForm));
    const macXonly = hmac(
      sha256,
      xOnlyForm,
      concatBytes(DOMAIN_CXFER_STEALTH, new Uint8Array([0x00]), txAnchor),
    );
    const bXonly = BigInt('0x' + bytesToHex(macXonly)) % SECP_N;
    expect(bSender).toBe(bXonly);
  });

  test('end-to-end hand-traced §A.2 / §C walkthrough', () => {
    const walletPriv = hexToBytes('42'.repeat(32));
    const walletPub = secp.getPublicKey(walletPriv, true);
    const senderPriv = hexToBytes('11'.repeat(32));
    const senderPub = secp.getPublicKey(senderPriv, true);
    const anchorTxidBE =
      '0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';
    const anchorVout = 7;
    const voutIndex = 1;

    const expectedPsender = senderPub;
    const sharedPt = secp.ProjectivePoint.fromHex(bytesToHex(expectedPsender)).multiply(
      BigInt('0x' + bytesToHex(walletPriv)),
    );
    const expectedShared = sha256(sharedPt.toRawBytes(true).slice(1));

    const expectedAnchorHead = new Uint8Array(36);
    const txidBE = hexToBytes(anchorTxidBE);
    for (let i = 0; i < 32; i++) expectedAnchorHead[i] = txidBE[31 - i]!;
    new DataView(expectedAnchorHead.buffer).setUint32(32, anchorVout, true);

    const expectedAnchor = new Uint8Array(40);
    expectedAnchor.set(expectedAnchorHead, 0);
    new DataView(expectedAnchor.buffer).setUint32(36, voutIndex, true);

    const macBytes = hmac(
      sha256,
      expectedShared,
      concatBytes(DOMAIN_CXFER_STEALTH, new Uint8Array([0x01]), expectedAnchor),
    );
    const expectedB = BigInt('0x' + bytesToHex(macBytes)) % SECP_N;
    const expectedCommit = secp.ProjectivePoint.fromHex(bytesToHex(walletPub))
      .add(G.multiply(expectedB))
      .toRawBytes(true);
    const tweakedBig =
      (BigInt('0x' + bytesToHex(walletPriv)) + expectedB) % SECP_N;
    let h = tweakedBig.toString(16);
    while (h.length < 64) h = '0' + h;
    const expectedTweakedSk = hexToBytes(h);

    const { aggregatePub, eligibleCount } = aggregateStealthEligibleInputPubkeys([
      { kind: 'p2wpkh', pub: senderPub },
    ]);
    expect(eligibleCount).toBe(1);
    expect(bytesToHex(aggregatePub!)).toBe(bytesToHex(expectedPsender));

    const shared = deriveStealthEcdhSharedSecret({
      ourPriv: walletPriv,
      theirPub: aggregatePub!,
    });
    expect(bytesToHex(shared)).toBe(bytesToHex(expectedShared));

    const anchorHead = stealthTxAnchorHead(anchorTxidBE, anchorVout);
    expect(bytesToHex(anchorHead)).toBe(bytesToHex(expectedAnchorHead));

    const txAnchor = concatBytes(anchorHead, new Uint8Array(4));
    new DataView(txAnchor.buffer).setUint32(36, voutIndex, true);
    expect(bytesToHex(txAnchor)).toBe(bytesToHex(expectedAnchor));

    const { commit, blinding } = senderComputeStealthCommit({
      senderEligibleInputPrivs: [senderPriv],
      recipientPub: walletPub,
      networkTag: 'signet',
      domain: DOMAIN_CXFER_STEALTH,
      txAnchorHead: anchorHead,
      voutIndex,
    });
    expect(bytesToHex(commit)).toBe(bytesToHex(expectedCommit));
    expect(blinding).toBe(expectedB);

    const tweakedSk = computeStealthTweakedSk({
      underlyingPriv: walletPriv,
      blinding: expectedB,
    });
    expect(bytesToHex(tweakedSk)).toBe(bytesToHex(expectedTweakedSk));

    const credits = recipientScanTxForStealth({
      classifiedInputs: [{ kind: 'p2wpkh', pub: senderPub }],
      outputs: [
        { script: hexToBytes('0014' + '00'.repeat(20)) },
        { script: p2wpkhScript(expectedCommit) },
        { script: hexToBytes('0014' + 'ff'.repeat(20)) },
      ],
      walletPriv,
      walletPub,
      networkTag: 'signet',
      domain: DOMAIN_CXFER_STEALTH,
      txAnchorHead: anchorHead,
    });
    expect(credits.length).toBe(1);
    expect(credits[0]!.voutIndex).toBe(1);
    expect(bytesToHex(credits[0]!.commit)).toBe(bytesToHex(expectedCommit));
    expect(bytesToHex(credits[0]!.tweakedSk)).toBe(bytesToHex(expectedTweakedSk));
  });

  test('commit = P + b·G and tweaked sk opens commit', () => {
    const { priv, pub } = keypair();
    const b = 99999n;
    const commit = computeStealthCommit({ underlyingPub: pub, blinding: b });
    const tweakedSk = computeStealthTweakedSk({ underlyingPriv: priv, blinding: b });
    expect(bytesToHex(secp.getPublicKey(tweakedSk, true))).toBe(bytesToHex(commit));
  });
});

describe('Input classifier + emission safety (§A.2.5, §F.7)', () => {
  test('P2WPKH classified eligible', () => {
    const { pub } = keypair();
    const witness = [new Uint8Array(72), pub];
    const prevoutScript = hexToBytes('0014' + 'ab'.repeat(20));
    const c = classifyStealthInput({ witness, prevoutScript });
    expect(c.kind).toBe('p2wpkh');
    expect(isStealthEligibleKind(c.kind)).toBe(true);
  });

  test('mixer-derived takes precedence over P2WPKH shape', () => {
    const { pub } = keypair();
    const witness = [new Uint8Array(72), pub];
    const prevoutScript = hexToBytes('0014' + 'ab'.repeat(20));
    const c = classifyStealthInput({
      witness,
      prevoutScript,
      prevoutOpReturn: Opcode.T_WITHDRAW,
    });
    expect(c.kind).toBe('mixer-derived');
    expect(isStealthEligibleKind(c.kind)).toBe(false);
  });

  test('§F.7 refuses mixed-ownership eligible inputs', () => {
    const us = keypair();
    const them = keypair();
    const r = checkStealthEmissionSafety({
      inputs: [
        { kind: 'p2wpkh', pub: us.pub },
        { kind: 'p2wpkh', pub: them.pub },
      ],
      eachInputIsOurs: (inp) => bytesToHex(inp.pub!) === bytesToHex(us.pub),
    });
    expect(r.safe).toBe(false);
    expect(r.reason).toContain('not wallet-owned');
  });

  test('STEALTH_DOMAIN_BY_OPCODE maps CXFER family', () => {
    expect(STEALTH_DOMAIN_BY_OPCODE.get(Opcode.T_CXFER)).toBe(DOMAIN_CXFER_STEALTH);
    expect(STEALTH_DOMAIN_BY_OPCODE.get(Opcode.T_AXFER)).toBe(DOMAIN_AXFER_STEALTH);
  });

  test('MIXER_EMITTING_OPCODES includes T_WITHDRAW and T_SLOT_BURN', () => {
    expect(MIXER_EMITTING_OPCODES.has(Opcode.T_WITHDRAW)).toBe(true);
    expect(MIXER_EMITTING_OPCODES.has(Opcode.T_SLOT_BURN)).toBe(true);
  });
});

describe('§H.1 ECDH amortization', () => {
  test('split helpers match monolithic blinding', () => {
    const alice = keypair();
    const bob = keypair();
    const txAnchor = crypto.getRandomValues(new Uint8Array(40));
    const shared = deriveStealthEcdhSharedSecret({
      ourPriv: bob.priv,
      theirPub: alice.pub,
    });
    const bSplit = deriveStealthBlindingFromShared({
      shared,
      networkTag: 'signet',
      domain: DOMAIN_CXFER_STEALTH,
      txAnchor,
    });
    const bMono = deriveStealthEcdhBlinding({
      ourPriv: bob.priv,
      theirPub: alice.pub,
      networkTag: 'signet',
      domain: DOMAIN_CXFER_STEALTH,
      txAnchor,
    });
    expect(bSplit).toBe(bMono);
  });
});
