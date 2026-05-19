// Pinned NUMS generator test vectors from SPEC §3.1.
// A re-implementation that types one of the domain strings wrong silently
// produces different generators and rejects every proof from the canonical
// implementation. These vectors are the cross-check.

export const H_HEX = '02bd7bf40fb5db2f7e0a1e8660ca13df55bb0d9f904e36e6297361f00376865e56';
export const Q_HEX  = '0279b66e857697b21949facaa998d6c31e4636f81f442c63f84bea33e83baafda4';

export const G_VEC_0 = '025cfa02a4913b0b122c4f275ae566e6ba52627d80036e25a43a3fd5d2062f28d4';
export const G_VEC_1 = '027608f5161dd88146ab22635ad357622a7e3fd9a293efd6fc21d18b50efab7c4e';
export const G_VEC_2 = '022f8c08dda9ade0264065a6770b219a5ee82c872f627d4503c4c3292472f1fb23';
export const G_VEC_3 = '02add28339b32e0e27075cb6cdee409acf07860ba5bf7cdca07cabf50947ed5a55';

export const H_VEC_0 = '02b78ed462f5c137b05d1e99daeb2619eb890ec4781acf098018628ca0ec0d20e2';
export const H_VEC_1 = '02ac4ee8f1ded833bf18be0815b9602b4fe0d586ade57923b35ef22e3e7c1e6ce2';
export const H_VEC_2 = '02795d359afdced0c4c7735bf61f24cdab214d43301f5210eefd46b96657a708a8';
export const H_VEC_3 = '02b65a170dfd727dd403cda635ddd2419882da910f6f79e10b24c4e5f3d171c76c';

export const G_VEC_HEX = [G_VEC_0, G_VEC_1, G_VEC_2, G_VEC_3];
export const H_VEC_HEX = [H_VEC_0, H_VEC_1, H_VEC_2, H_VEC_3];
