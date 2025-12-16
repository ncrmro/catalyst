type ClassValue =
  | string
  | number
  | null
  | undefined
  | boolean
  | ClassDictionary
  | ClassArray;

interface ClassDictionary {
  [id: string]: any;
}

interface ClassArray extends Array<ClassValue> {}

function toVal(mix: ClassValue): string {
  if (typeof mix === 'string' || typeof mix === 'number') return String(mix);

  if (typeof mix === 'object') {
    if (Array.isArray(mix)) {
      return mix.map(toVal).filter(Boolean).join(' ');
    }
    if (mix) {
      return Object.entries(mix)
        .filter(([, value]) => Boolean(value))
        .map(([key]) => key)
        .join(' ');
    }
  }

  return '';
}

/**
 * Lightweight class name combiner (clsx-style) with no external deps.
 * Supports strings, numbers, arrays, and object maps of truthy keys.
 */
export function cn(...inputs: ClassValue[]) {
  return inputs.map(toVal).filter(Boolean).join(' ');
}
