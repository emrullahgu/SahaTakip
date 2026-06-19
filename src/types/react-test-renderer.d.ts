// Minimal tip bildirimi — @types/react-test-renderer kurmadan (yalnız smoke-render
// harness'inin ihtiyaç duyduğu yüzey). react-test-renderer devDependency'dir.
declare module 'react-test-renderer' {
  import { ReactElement } from 'react';
  export interface ReactTestRenderer {
    toJSON(): unknown;
    unmount(): void;
    update(el: ReactElement): void;
    root: unknown;
  }
  export function create(el: ReactElement, options?: unknown): ReactTestRenderer;
  export function act(cb: () => void | Promise<void>): Promise<void>;
  const _default: { create: typeof create; act: typeof act };
  export default _default;
}
