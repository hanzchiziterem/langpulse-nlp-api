export type PrismaJsonCompatible<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends object
    ? PrismaJsonCompatible<T[K]>
    : T[K];
} & { [key: string]: any }; 
