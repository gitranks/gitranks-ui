export type NonNull<T> = {
  [K in keyof T as null extends T[K] ? never : K]: Exclude<T[K], null>;
};
