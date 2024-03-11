import { isObject } from '@proton/pass/utils/object/is-object';
import { uint8ArrayToBase64String } from '@proton/shared/lib/helpers/encoding';

import { objectMap } from '../object/map';

type ByteArrays = ArrayBuffer | ArrayBufferView | Uint8Array;

export type SanitizedBuffers<T> = T extends ByteArrays
    ? string
    : T extends (infer U)[]
      ? SanitizedBuffers<U>[]
      : T extends object
        ? { [K in keyof T]: SanitizedBuffers<T[K]> }
        : T;

export const sanitizeBuffers = <T>(value: T): SanitizedBuffers<T> => {
    if (value instanceof ArrayBuffer) return uint8ArrayToBase64String(new Uint8Array(value)) as SanitizedBuffers<T>;
    else if (value instanceof Uint8Array) return uint8ArrayToBase64String(value) as SanitizedBuffers<T>;
    else if (Array.isArray(value)) return value.map(sanitizeBuffers) as SanitizedBuffers<T>;
    else if (isObject(value)) return objectMap(value, (_, val) => sanitizeBuffers(val)) as SanitizedBuffers<T>;
    return value as SanitizedBuffers<T>;
};
