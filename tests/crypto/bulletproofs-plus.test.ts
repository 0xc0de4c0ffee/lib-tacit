// Bulletproofs+ tests: KAT vectors + round-trip self-consistency + rejection.
// Mirrors tacit-specs/tests/bulletproofs-plus-*.test.mjs

import { describe, test, expect } from 'bun:test';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, concatBytes } from '@noble/hashes/utils';
import {
  bppGens, bppTranscript, bppRangeProve, bppRangeVerify,
  vecAdd, vecScalarMul, vecPow, weightedInnerProduct, hadamardFold,
  BPP_MAX_M,
} from '../../src/crypto/bulletproofs-plus.js';
import { G, ZERO, H, modN, pointToBytes, bytesToPoint, pedersenCommit, randomScalar, safeMult } from '../../src/crypto/pedersen.js';
import { SECP_N, N_BITS } from '../../src/constants/limits.js';

describe('BP+ generator derivation (SPEC §3.1)', () => {
  test('Gvec/Hvec/H match pinned hex', () => {
    const { Gvec, Hvec, H: Hval } = bppGens();
    expect(Gvec.length).toBe(512);
    expect(Hvec.length).toBe(512);

    const PINNED_G = [
      '025cfa02a4913b0b122c4f275ae566e6ba52627d80036e25a43a3fd5d2062f28d4',
      '027608f5161dd88146ab22635ad357622a7e3fd9a293efd6fc21d18b50efab7c4e',
      '022f8c08dda9ade0264065a6770b219a5ee82c872f627d4503c4c3292472f1fb23',
      '02add28339b32e0e27075cb6cdee409acf07860ba5bf7cdca07cabf50947ed5a55',
    ];
    const PINNED_H = [
      '02b78ed462f5c137b05d1e99daeb2619eb890ec4781acf098018628ca0ec0d20e2',
      '02ac4ee8f1ded833bf18be0815b9602b4fe0d586ade57923b35ef22e3e7c1e6ce2',
      '02795d359afdced0c4c7735bf61f24cdab214d43301f5210eefd46b96657a708a8',
      '02b65a170dfd727dd403cda635ddd2419882da910f6f79e10b24c4e5f3d171c76c',
    ];

    for (let i = 0; i < 4; i++) {
      expect(bytesToHex(pointToBytes(Gvec[i]!))).toBe(PINNED_G[i]);
      expect(bytesToHex(pointToBytes(Hvec[i]!))).toBe(PINNED_H[i]);
    }
    expect(bytesToHex(pointToBytes(Hval))).toBe(
      '02bd7bf40fb5db2f7e0a1e8660ca13df55bb0d9f904e36e6297361f00376865e56',
    );
  });

  test('H is the same as pedersen H', () => {
    const { H: Hval } = bppGens();
    expect(Hval.equals(H)).toBe(true);
  });
});

describe('BP+ round-trip: prove → verify', () => {
  for (const m of [1, 2, 4, 8] as const) {
    const tOpts: any = m >= 8 ? { timeout: 30000 } : {};
    test(`m=${m} honest proof verifies`, tOpts, () => {
      const values: bigint[] = [];
      const blindings: bigint[] = [];
      for (let j = 0; j < m; j++) {
        values.push(BigInt(1000 + j * 100));
        blindings.push(randomScalar());
      }
      const result = bppRangeProve(values, blindings);
      expect(result.commitments.length).toBe(m);
      const logMN = Math.log2(m) + 6;
      const expectedLen = 99 + 96 + logMN * 66;
      expect(result.proof.length).toBe(expectedLen);

      const ok = bppRangeVerify(result.commitments, result.proof);
      expect(ok).toBe(true);
    });
  }
});

describe('BP+ edge values', () => {
  test('value=0 verifies', () => {
    const r = bppRangeProve([0n], [randomScalar()]);
    expect(bppRangeVerify(r.commitments, r.proof)).toBe(true);
  });

  test('value=2^64-1 verifies', () => {
    const r = bppRangeProve([(1n << 64n) - 1n], [randomScalar()]);
    expect(bppRangeVerify(r.commitments, r.proof)).toBe(true);
  });

  test('m=2 mixed [0, 2^64-1] verifies', () => {
    const r = bppRangeProve([0n, (1n << 64n) - 1n], [randomScalar(), randomScalar()]);
    expect(bppRangeVerify(r.commitments, r.proof)).toBe(true);
  });
});

describe('BP+ rejection: tampered proofs', () => {
  test('tampered r1 rejects', () => {
    const r = bppRangeProve([12345n], [randomScalar()]);
    expect(bppRangeVerify(r.commitments, r.proof)).toBe(true);

    const tampered = new Uint8Array(r.proof);
    const r1Off = 33 * 3;
    tampered[r1Off]! ^= 0x01;
    expect(bppRangeVerify(r.commitments, tampered)).toBe(false);
  });

  test('tampered A rejects', () => {
    const r = bppRangeProve([12345n], [randomScalar()]);
    const tampered = new Uint8Array(r.proof);
    tampered[1]! ^= 0x01;
    expect(bppRangeVerify(r.commitments, tampered)).toBe(false);
  });

  test('wrong commitment rejects', () => {
    const r = bppRangeProve([12345n], [randomScalar()]);
    const wrongCommit = [pedersenCommit(99999n, randomScalar())];
    expect(bppRangeVerify(wrongCommit, r.proof)).toBe(false);
  });

  test('malformed proof lengths reject', () => {
    const commit = [pedersenCommit(1n, 1n)];
    expect(bppRangeVerify(commit, new Uint8Array(0))).toBe(false);
    expect(bppRangeVerify(commit, new Uint8Array(100))).toBe(false);
  });

  test('cross-witness rejection', () => {
    const r1 = bppRangeProve([777n], [randomScalar()]);
    const r2 = bppRangeProve([777n], [randomScalar()]);
    expect(bppRangeVerify(r2.commitments, r1.proof)).toBe(false);
    expect(bppRangeVerify(r1.commitments, r2.proof)).toBe(false);
  });
});

describe('BP+ invalid m', () => {
  test('m=3 throws in prover', () => {
    expect(() => bppRangeProve([100n, 200n, 300n], [1n, 2n, 3n])).toThrow();
  });

  test('m=3 returns false in verifier', () => {
    const Cs = [pedersenCommit(1n, 1n), pedersenCommit(2n, 2n), pedersenCommit(3n, 3n)];
    expect(bppRangeVerify(Cs, new Uint8Array(1000))).toBe(false);
  });

  test('out-of-range value throws', () => {
    expect(() => bppRangeProve([1n << 64n], [randomScalar()])).toThrow();
    expect(() => bppRangeProve([(1n << 64n) + 1n], [randomScalar()])).toThrow();
  });
});

describe('BP+ vector helpers', () => {
  test('vecAdd', () => {
    expect(vecAdd([1n, 2n], [3n, 4n])).toEqual([4n, 6n]);
  });
  test('vecScalarMul', () => {
    expect(vecScalarMul([1n, 2n], 3n)).toEqual([3n, 6n]);
  });
  test('vecPow', () => {
    const p = vecPow(2n, 4);
    expect(p).toEqual([1n, 2n, 4n, 8n]);
  });
  test('weightedInnerProduct', () => {
    // Σ a_i·b_i·y^(i+1) for a=[1,2], b=[3,4], y=2
    // = 1·3·2 + 2·4·4 = 6 + 32 = 38
    expect(weightedInnerProduct([1n, 2n], [3n, 4n], 2n)).toBe(38n);
  });
  test('hadamardFold (point vector)', () => {
    // Fold [G, G, G, G] with a=2, b=3 → [2G+3G, 2G+3G] = [5G, 5G]
    const v = [G, G, G, G];
    const folded = hadamardFold(v, 2n, 3n);
    expect(folded.length).toBe(2);
    expect(folded[0]!.equals(safeMult(G, 5n))).toBe(true);
    expect(folded[1]!.equals(safeMult(G, 5n))).toBe(true);
  });
});

describe('BP+ pinned fixture KAT', () => {
  // Reproduce the deterministic RNG from tacit-specs/tests/bulletproofs-plus-pinned-fixtures.test.mjs
  // and verify against their pinned hex.
  const SEED = sha256(new TextEncoder().encode('tacit-bpp-pinned-fixtures-v1'));
  let _rng_offset = 0;
  function _det_bytes(n: number): Uint8Array {
    const out = new Uint8Array(n);
    let remaining = n, dst = 0;
    while (remaining > 0) {
      const idxBytes = new Uint8Array(4);
      new DataView(idxBytes.buffer).setUint32(0, _rng_offset, false);
      const chunk = sha256(new Uint8Array([...SEED, ...idxBytes]));
      const take = Math.min(remaining, 32);
      out.set(chunk.slice(0, take), dst);
      remaining -= take; dst += take; _rng_offset++;
    }
    return out;
  }
  function resetRng(): void { _rng_offset = 0; }

  const originalGetRandomValues = crypto.getRandomValues.bind(crypto);

  // Deterministic getRandomValues
  const detGetRandomValues = (buf: Uint8Array): Uint8Array => {
    const b = _det_bytes(buf.length);
    for (let i = 0; i < buf.length; i++) buf[i] = b[i]!;
    return buf;
  };

  const FIXTURES: { m: number; values: bigint[]; blindings: bigint[]; proof_hex: string; commit_hex: string }[] = [
    {
      m: 1,
      values: [12345n],
      blindings: [0x1111111111111111111111111111111111111111111111111111111111111111n],
      proof_hex: '0390c2f2dbf975b12b7db2130f732da303c6378c4a94525864b7383e0d972b75e103cc5e65ebc94883e6519edf767e088a02e355be537f350edb45ac645d4fce5a8c03531822c3aac6976066829f496637093aa55b4b61566e0e9931293c287e6b823f5570030b011e344bb975e0364545b2c35adf88f4c2338abe65b042d5f7d2c2a07b2aa9aaa582ec3801020aa93828281dc8a498f3305d51efee7087c3175690a2a4cee8c65ea6af0d9e997717b0ea9d60e74f4afe1bb9ce56b7c2760aafa93c77024cbba8d517f564c02dab17ac735efdd59e190be848e06f4f8c4bfd6d9f5bb1b902d2ac3303a3b728bd58aa8aff3b43f47b0c7499b146e02a5c14053b16bcaf654502ddb3b0b1d5a08449da6f2428acabaa8c976eb37c99200c52de52d8f7f4adab1202fb75c30a1f8e52ed8f2c79674bde62304205f80c50544c66768517b7131ce30e02b69c22dce736480923af1c68c82573f00f1a5c655aa7dee5d997c4aea4d24de3024b868b642e4601a7b9ea6d6fd3be5c0cecab1a8472a2fb45a597db4b58c1aba203d4c5d986bd4626709215e7b7751e8c330690bab19d8d36aa5f600bdfdfc3e07203e33ee4cb43b4cef2fbe10adbff85e8eb0962dce493152950195c823c7f12781b020f1fa7970a518434dc6421c4eea1dcd6bbac907cc5fd1fd9f91d3b4b514dcd41038c504892b9056b4a67a9ff234668f9518f7c9f3aaef0bc84d584b96616f54e33034ce20e71fec7f7444b6ce0b3d66cc68cdec5915ba5d255daf810d9f0f82cfc1d0265c52e80c3ed8b8310407ef3bb04b0ab28be4810fcd069a5a2a557e1448a6edb',
      commit_hex: '0395befebc5e316ffe3fe29d394360a2b8a291bfea002f7562b0d3c9b500ffdc51',
    },
    {
      m: 2,
      values: [100n, 200n],
      blindings: [
        0x2222222222222222222222222222222222222222222222222222222222222222n,
        0x3333333333333333333333333333333333333333333333333333333333333333n,
      ],
      proof_hex: '03d58a03174f45734e7033adb01f2c617bb98bd0e450d135ff80726dc3f3b128d102192ee056015fa16459e5e7aa0c6525497a7e9a83410c0ed1fe0569a5293a58c003cf31eefbc1a5b799d4023d77e25f21b1f20eb68385285d417d90e5e7b8a84f55d6b8b0520b4a754505401564ad6695a52d9654fd1e81eee1da5b6338e8eb929b491aadda2854e7decf582eac8c6e0d96eac7b725229d8f70d10fc575ba81c6279e03b4ef042dc69ebff4f88b23b9ef5bed7ef426c0bed501ce3a8a7046b5b00603fdcd9ab9caec7bff66d6a97aae50010dfd9b10fe980a97925ac7dacc7e67ab470248df62292ac79efd237a41333a18c56600ae83a6124d0ccc2e32b1937319352702cb76ddd469328a998ba2fc8006f0b920c27d1d1e670021cafd7c2216806f9be103b08da8706ce5867ecea32ce99ad6fe5803b0aef6ca117d677730a69638db2dce021da92e49ef0990a610f6debd1ca562aee76b3b032f97ffed7b015bbb26968b2e021435d369d248b819e6a122387ddd95108221687884ed5e0c2935d8d773519b4902baa764dcd6973fb08956d14271cf3697df7e2eb37b75072a39960c00655c18e3026ecfde97c28ade8142862ae4a2c51ddbbefc097a1de72b8edfbc40aeaf50083802177f1afa27cbb246aa150086a29781f278a4e8c08db6919cf2a8d3897cf6931a03c3294c26e7eabdebe127f83cdda32bf43520e750e70f7fd27ea26d655e6e88fb0307b4fe87b6a5740752598d5c039d8b31b7b96d40a043ef75cedc7fef47ea3f090285527171cec1f5f74c560f6a6ca87d90b352bcc18864e08581d9b8e448af57980373b19ad9610024791da2160c20bbd3b0df96456fb298e9a0180aa509b50752dc0332798efde3ec38db08572248f8d3e25ece9cebdc95f9e08bef92f0177b54b283',
      commit_hex: '03a3930cbdce518e9f4e0801b4537a69e18335ea8ac634b8b634f60e95675d0e8e,0285080d11d7e2e4b521132c7772bd37a9047ffce40ced88c2a067c156006d7b1e',
    },
    {
      m: 4,
      values: [1n, 2n, 4n, 8n],
      blindings: [
        0x4444444444444444444444444444444444444444444444444444444444444444n,
        0x5555555555555555555555555555555555555555555555555555555555555555n,
        0x6666666666666666666666666666666666666666666666666666666666666666n,
        0x7777777777777777777777777777777777777777777777777777777777777777n,
      ],
      proof_hex: '0211960c6a27861628ca8efb2dd4e8070256bea1232aaad12e824cec42f98fd7b4031a9e606f34128782c836c35a635fb2e82467fdf7bba756b31e8f2430e1bde60e0322edde87af72d392e9be1ecea58800151ea3fd3215f97ecc4982849f632671569ad66c083981c4dc497acb99da6dc157a8749aff292b5b6719cacdcca8b8ad9b555e415ec04ef1d7e0f4dac7688116e7c5e18bd1b5e0d6764d9a23c77a4b76827197dfeaf2774a9098505d731a7ee27c621ac0d180539e332301476078a6d402037820dd31f9a46cf38ae70215e1f1707c6752c367fe9b29846e820520544a1d9d03a9766f65139dc4588e471e413394ef2542f4da898107f9d8f797ac5d42fc487f03ac50f006716d47d1149825eef6d4fa62932c0a0e63c8028a02e412f7893587f6033bac64025679ea23c52b2a482a097caa29c91b70742125c93174cf7812a90408037ed40f2fddb58cb0a7d3246163dad997605c116cbf9ac8955d92591f913eff4e0292bdc88b430075028e9b1c7ed89a89056d3e6f956eeed206e023b3ace712869f0243de394b3fccc997fca06843f04efd167251f8b695cb883b7089d1e32854015403be98a540c0fd6071c5da564a1cf789ca51053af8dc40ad9f6d0e55907c1eef0d0292a5d6f408b181353134b3098d9250e28068fbcf930083891f51fc5860f0ab60022961cb52eca636dc7b35d551dcd79ff6a1946e88084fea906ddb587cfbef1c6602a1cd27d379fc92917728c4bd58c9732933ec305a0aca62c3b211d7403f7e951303cb2ca6574e4bcdc30b784410782ee959d47c862116e5e5c06e3adcf242b83f9003754d6181c444232ebb686756616a54dc7ec84b181aa6de013aef8b590b41267202d57c46fc5015d6d317aec27a93f11a42a9ab9d16ac1a1ab6d832e42ced928cd40340a8305188e4e4afe137c8a4bfd9d84c16acd0306d7dd61a3e9ba248b023e631030f7cbf9df6ebbcbb173f10631bbf2e10e88d27b92b9f778d33f5dcf254727dbb',
      commit_hex: '0387c113ab780cffda13bb0513dbaabbeb59a2e126177c7023132d2e9a9e002750,03f4d75363982f1d57fcbaa0cb8bbb1d5aebfa3282efe236a10bb8eb69bc84a499,03b85524212f5a186c5aa2ea04f2809d5a16244975a36a7b805632568c0d1be2f2,037ef4af7e48cf4ceb4ace315c714933938dbf7490fdedf05dbf33f997888ec119',
    },
    {
      m: 8,
      values: [0n, 1n, (1n << 32n), (1n << 63n), (1n << 64n) - 1n, 42n, 1337n, 999_999_999n],
      blindings: [
        0x8888888888888888888888888888888888888888888888888888888888888888n,
        0x9999999999999999999999999999999999999999999999999999999999999999n,
        0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaan,
        0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbn,
        0xccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccn,
        0xddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddn,
        0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeen,
        0x0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0fn,
      ],
      proof_hex: '0330c93c9da5665e20819522d995d3b44c35c54d822679b7bd606004c7ddffe39c03415c45ffa043bd10fdeb20c71fb6288846797ffa109673e2e50e3041101bb4590311bbd8c74696c3f587661e1bf45a30de898891b8ad1279c46675e8a77544bf7bcc14dd9f312cfbd0d01c54dfece76999c3ced2d1bdbb1c944a816997a32e70578f540fc38c548c81a57d8585125018f4b8dcf37c740dd1b31632c7f17d67fa29b511767af2dfe67552d472ca10a277e085bede3bbcd3faacc48373c9a3e5ce9102c6131b9dec878b7e7b101d9550c51ef490c90fc51a573db60ac1b4a3eaa583cd0296940a0a9ed4a920dd4f43a32d77c2e93a69af74badadbcc1d68e138c713795002846c7386670bf506e12c71f299beafd8d5fcb42772a6d82c30e8a1c32500f19c0297607463625f66a119b0bd09974215e9f1d8ce97f1fad40c9ef0ffb56527d27403ccf9c96ada3300343559488cf42bd7d980b6a1d653b45388abe43772a28e0ec003b5634a2c7560a1a7b30088bb0e1445ccea4d790ac011d31cd093ca5f1d32b29c03daaa6fd1d8afabc0df2f3d3ab815e40d8def70ed7e4254e7266afcadd8d47328036950fa4bffbd7767170de29d04b84b8b5cf0bdc4734c3c0b35af8fb12307b8620258b66367d2f4578ceaebc60363f70625ef6d72d2e6e10bfdbc1c196dd60f28550232b6a7f918143027303589467ee4c4391d1825904a807a4af9fdab961c9d565902d255921f5949471c3eeae03667109049d63dbfbe757f9b7de57c18062832fada02b96de288930bb8c0dc54239b03be48b1d223ca9eb9df38f053f2ffc963f5746903fd32ca13a2d826ad77c2f23db31d6be3a805f41af5f873215025c975500452cd036a92ccac50ad751f01cd23da59850eb499f16fd39259f50e95745156d7dbff1102bc4edda760e94bf0e74d68c34c340fc5c0865cf719d42cb2905cc9f96527d5e903b97f77cf42d23e7b22e608934934938fbc611d993973fa5ae3ff869fb911be5e03a86b35a0f4618c7394fa8358a4cdaa88a290ad68b7e0bbe506ac23f15edb77c00373faa6ff12c5f2b43710c64fae2eea0676c2f9123ca504741ac19eb30c8e46a0',
      commit_hex: '021617d38ed8d8657da4d4761e8057bc396ea9e4b9d29776d4be096016dbd2509b,029a393a58d9694caab56e032a2ebb5adbe8352aa7b9e132f0ee42735743ad8983,02adcba739156e146190987393012d7ba7bf06544b6ca8ec5eacca8cf8049f9063,03797fa672da19ae21967044d050c4dbfcb39b0e3a56337dea42d23ffbbeecc92a,029d0a50de3e10adef23621a454fb29a4d77c83b5b99b381885b6181ad276b3fbc,02f56805a72ec7b742c49ccef5e901319778c7779063fe09069022d8be8ec9b0e1,02c57c816b9e1428c2603891d5593d0c9ab4457e62cfe3365741cf4ccbf26b2608,0242665f3ffb8f5ee3d926f522fef69bf8f5ba883cdf5763b5f0f8be0661087f9f',
    },
  ];

  for (const f of FIXTURES) {
    const tOpts = f.m >= 8 ? { timeout: 30000 } : {};
    test(`m=${f.m} pinned fixture matches`, tOpts, () => {
      resetRng();
      const restore = crypto.getRandomValues;
      (crypto as any).getRandomValues = detGetRandomValues;
      try {
        const r = bppRangeProve(f.values, f.blindings);
        expect(bppRangeVerify(r.commitments, r.proof)).toBe(true);
        expect(bytesToHex(r.proof)).toBe(f.proof_hex);

        // Test commitment hex
        const commitHex = r.commitments.map(c => bytesToHex(pointToBytes(c))).join(',');
        expect(commitHex).toBe(f.commit_hex);
      } finally {
        (crypto as any).getRandomValues = restore;
      }
    });
  }

  test('deterministic RNG produces same proof twice', () => {
    resetRng();
    const restore = crypto.getRandomValues;
    (crypto as any).getRandomValues = detGetRandomValues;
    try {
      resetRng();
      const a = bppRangeProve([7777n], [0xabcd1234n]);
      resetRng();
      const b = bppRangeProve([7777n], [0xabcd1234n]);
      expect(bytesToHex(a.proof)).toBe(bytesToHex(b.proof));
      expect(bytesToHex(pointToBytes(a.commitments[0]!))).toBe(
        bytesToHex(pointToBytes(b.commitments[0]!)),
      );
    } finally {
      (crypto as any).getRandomValues = restore;
    }
  });
});
