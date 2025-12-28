interface SlugifyOptions {
  separator?: string;
  lowercase?: boolean;
  strict?: boolean;
  maxLength?: number;
}

export function slugify(text: string, options: SlugifyOptions = {}): string {
  const {
    separator = '-',
    lowercase = true,
    strict = true,
    maxLength,
  } = options;

  let result = text;

  if (lowercase) {
    result = result.toLowerCase();
  }

  if (strict) {
    result = result
      .normalize('NFD') // The normalize() method returns the Unicode Normalization Form of a given string.
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^\w\s-]/g, ''); // Remove all non-word chars
  }

  result = result
    .replace(/\s+/g, separator) // Replace spaces with separator
    .replace(new RegExp(`${separator}+`, 'g'), separator); // Replace multiple separators with single

  if (maxLength) {
    result = result.substring(0, maxLength);
  }

  return result;
}
