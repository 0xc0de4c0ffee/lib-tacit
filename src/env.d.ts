declare module 'snarkjs' {
  const groth16: {
    verify(
      vk: any,
      publicSignals: any[],
      proof: any,
    ): Promise<boolean>;
  };
  export { groth16 };
}
