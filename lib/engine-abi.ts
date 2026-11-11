export type EngineExports = {
  memory: WebAssembly.Memory;
  alloc: (n: number) => number;
  dealloc: (p: number, n: number) => void;
  run: (p: number, n: number) => number;
  result_len: () => number;
};
export function callEngine<T = any>(exports: EngineExports, value: unknown): T {
  const input = new TextEncoder().encode(JSON.stringify(value));
  if (input.length > 2_000_000) throw new Error("Engine input exceeds limit");
  const ptr = exports.alloc(input.length);
  try {
    new Uint8Array(exports.memory.buffer, ptr, input.length).set(input);
    const resultPtr = exports.run(ptr, input.length);
    const text = new TextDecoder().decode(
      new Uint8Array(exports.memory.buffer, resultPtr, exports.result_len()),
    );
    const result = JSON.parse(text);
    if (result.error) throw new Error(result.error);
    return result;
  } finally {
    exports.dealloc(ptr, input.length);
  }
}
