import { callEngine, type EngineExports } from "./engine-abi";
let ready: Promise<EngineExports> | undefined;
export async function browserEngine(input: unknown) {
  ready ??= fetch("/engine/study_core.wasm")
    .then(async (r) => {
      if (!r.ok) throw new Error("Study engine could not load");
      const bytes = await r.arrayBuffer();
      const module = await WebAssembly.compile(bytes);
      const instance = new WebAssembly.Instance(module, {});
      return instance.exports as EngineExports;
    })
    .catch((e) => {
      ready = undefined;
      throw e;
    });
  return callEngine(await ready, input);
}
