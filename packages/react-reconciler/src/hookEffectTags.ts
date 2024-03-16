// 保存在 Effect.tag 中的 tags
export type EffectTags = number;

// Fiber 节点本次更新存在副作用
export const HookHasEffect = 0b0001;

export const Passive = 0b0010; // useEffect
export const Layout = 0b0100; // useLayoutEffect
