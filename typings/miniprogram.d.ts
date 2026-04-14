declare namespace WechatMiniprogram {
  interface Dataset {
    [key: string]: unknown;
  }

  interface Target {
    dataset: Dataset;
  }

  interface TouchEvent {
    detail: any;
    currentTarget: Target;
    target: Target;
  }

  interface CustomEvent<T = any> extends TouchEvent {
    detail: T;
  }
}

declare const wx: any;

declare function App<T>(options: T): void;

declare function Page<T>(options: any): void;

declare function Component(options: any): void;
