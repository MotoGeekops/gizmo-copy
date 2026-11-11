import wasm from "../lib/wasm/study_core.wasm?module";
import { callEngine, type EngineExports } from "../lib/engine-abi";
const instance = new WebAssembly.Instance(wasm, {});
export function engine<T = any>(input: unknown): T {
  return callEngine<T>(instance.exports as EngineExports, input);
}
