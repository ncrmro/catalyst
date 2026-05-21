/**
 * Memorable Name Generator
 *
 * Generates random memorable names for preview environments using the factory pattern.
 * Format: {adjective}-{noun}-{number}
 * Example: "purple-elephant-42", "swift-river-73"
 */

/**
 * Wordlist of adjectives for name generation (~200 words).
 * Chosen for being positive, memorable, and easy to pronounce.
 */
const ADJECTIVES = [
  "ancient",
  "autumn",
  "azure",
  "bold",
  "brave",
  "bright",
  "calm",
  "clever",
  "cool",
  "cosmic",
  "crystal",
  "daring",
  "dawn",
  "divine",
  "dream",
  "eager",
  "electric",
  "elegant",
  "emerald",
  "epic",
  "fancy",
  "fast",
  "fierce",
  "fire",
  "forest",
  "fresh",
  "frosty",
  "gentle",
  "gleaming",
  "golden",
  "grand",
  "happy",
  "harmonic",
  "heroic",
  "hidden",
  "holy",
  "humble",
  "icy",
  "infinite",
  "jade",
  "jolly",
  "keen",
  "kind",
  "lazy",
  "light",
  "lively",
  "lucky",
  "lunar",
  "magic",
  "majestic",
  "mellow",
  "mighty",
  "misty",
  "modern",
  "mystic",
  "neat",
  "noble",
  "ocean",
  "orange",
  "pearl",
  "pink",
  "polite",
  "prime",
  "proud",
  "purple",
  "quick",
  "quiet",
  "radiant",
  "rapid",
  "red",
  "regal",
  "royal",
  "ruby",
  "rustic",
  "sage",
  "scarlet",
  "serene",
  "shadow",
  "shiny",
  "silent",
  "silver",
  "simple",
  "sleek",
  "smooth",
  "snowy",
  "solar",
  "sonic",
  "speedy",
  "spring",
  "stable",
  "stellar",
  "storm",
  "summer",
  "sunny",
  "super",
  "swift",
  "teal",
  "tender",
  "thunder",
  "tiny",
  "tranquil",
  "trusty",
  "turbo",
  "twilight",
  "united",
  "velvet",
  "vibrant",
  "violet",
  "vital",
  "vivid",
  "warm",
  "wild",
  "winter",
  "wise",
  "zen",
] as const;

/**
 * Wordlist of nouns for name generation (~200 words).
 * Chosen for being concrete, memorable, and universally understood.
 */
const NOUNS = [
  "anchor",
  "badger",
  "bear",
  "beaver",
  "bird",
  "bison",
  "boat",
  "breeze",
  "bridge",
  "butterfly",
  "canyon",
  "castle",
  "cave",
  "cheetah",
  "citadel",
  "cliff",
  "cloud",
  "comet",
  "compass",
  "coral",
  "coyote",
  "crane",
  "creek",
  "crystal",
  "delta",
  "desert",
  "dolphin",
  "dove",
  "dragon",
  "dune",
  "eagle",
  "echo",
  "elephant",
  "falcon",
  "fern",
  "fjord",
  "flame",
  "forest",
  "fortress",
  "fountain",
  "fox",
  "galaxy",
  "garden",
  "glacier",
  "grove",
  "hawk",
  "haven",
  "hill",
  "horizon",
  "hummingbird",
  "island",
  "jaguar",
  "journey",
  "jungle",
  "lantern",
  "leopard",
  "lighthouse",
  "lion",
  "lotus",
  "meadow",
  "meteor",
  "moon",
  "mountain",
  "nebula",
  "oak",
  "oasis",
  "ocean",
  "orchid",
  "otter",
  "owl",
  "panda",
  "panther",
  "path",
  "peak",
  "penguin",
  "phoenix",
  "pine",
  "planet",
  "pond",
  "prairie",
  "pyramid",
  "quasar",
  "rabbit",
  "raven",
  "reef",
  "river",
  "rocket",
  "rose",
  "sage",
  "sandstone",
  "sea",
  "shadow",
  "shark",
  "shore",
  "sky",
  "sparrow",
  "sphinx",
  "spirit",
  "star",
  "stone",
  "stream",
  "summit",
  "sunrise",
  "sunset",
  "temple",
  "thunder",
  "tide",
  "tiger",
  "tower",
  "trail",
  "tree",
  "universe",
  "valley",
  "volcano",
  "wave",
  "whale",
  "willow",
  "wind",
  "wolf",
  "zenith",
] as const;

/**
 * Configuration for name generation.
 */
export interface NameGeneratorConfig {
  /**
   * Maximum number of retries when checking for name uniqueness.
   * Default: 5
   */
  maxRetries?: number;

  /**
   * Minimum number for the numeric suffix (inclusive).
   * Default: 10
   */
  minNumber?: number;

  /**
   * Maximum number for the numeric suffix (exclusive).
   * Default: 100 (generates 10-99)
   */
  maxNumber?: number;

  /**
   * Custom separator between parts.
   * Default: "-"
   */
  separator?: string;
}

/**
 * Result of name generation.
 */
export interface GeneratedName {
  /**
   * The full generated name (e.g., "purple-elephant-42")
   */
  name: string;

  /**
   * The adjective part
   */
  adjective: string;

  /**
   * The noun part
   */
  noun: string;

  /**
   * The numeric suffix
   */
  number: number;

  /**
   * Number of retries needed to generate a unique name
   */
  retries: number;
}

/**
 * Function to check if a generated name already exists.
 * Returns true if the name is already taken.
 */
export type NameExistsCheck = (name: string) => Promise<boolean>;

/**
 * Generate a random integer between min (inclusive) and max (exclusive).
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Generate a single random name without uniqueness checking.
 *
 * @param config - Generation configuration
 * @returns Generated name components
 */
export function generateNameUnchecked(
  config: NameGeneratorConfig = {},
): Omit<GeneratedName, "retries"> {
  const { minNumber = 10, maxNumber = 100, separator = "-" } = config;

  const adjective = ADJECTIVES[randomInt(0, ADJECTIVES.length)];
  const noun = NOUNS[randomInt(0, NOUNS.length)];
  const number = randomInt(minNumber, maxNumber);

  const name = `${adjective}${separator}${noun}${separator}${number}`;

  return {
    name,
    adjective,
    noun,
    number,
  };
}

/**
 * Generate a unique random name with collision detection.
 *
 * Uses a factory pattern to generate memorable names with retry logic
 * for handling collisions.
 *
 * @param existsCheck - Async function to check if a name already exists
 * @param config - Generation configuration
 * @returns Generated name with metadata
 * @throws Error if unable to generate unique name after maxRetries attempts
 *
 * @example
 * ```typescript
 * const checkExists = async (name: string) => {
 *   const result = await db.query.pullRequestPods.findFirst({
 *     where: eq(pullRequestPods.namespace, name)
 *   });
 *   return !!result;
 * };
 *
 * const name = await generateUniqueName(checkExists);
 * console.log(name.name); // "purple-elephant-42"
 * ```
 */
export async function generateUniqueName(
  existsCheck: NameExistsCheck,
  config: NameGeneratorConfig = {},
): Promise<GeneratedName> {
  const { maxRetries = 5 } = config;

  let retries = 0;

  while (retries < maxRetries) {
    const generated = generateNameUnchecked(config);

    // Check if name already exists
    const exists = await existsCheck(generated.name);

    if (!exists) {
      return {
        ...generated,
        retries,
      };
    }

    retries++;
  }

  // Fallback: use UUID-based name after max retries
  const uuid = crypto.randomUUID();
  const fallbackName = `fallback-${uuid.slice(0, 8)}`;

  console.warn(
    `Failed to generate unique name after ${maxRetries} retries. Using fallback: ${fallbackName}`,
  );

  return {
    name: fallbackName,
    adjective: "fallback",
    noun: uuid.slice(0, 8),
    number: 0,
    retries,
  };
}

/**
 * Name generator factory that creates configured name generators.
 *
 * @param defaultConfig - Default configuration for all generated names
 * @returns Factory object with generation methods
 *
 * @example
 * ```typescript
 * const factory = createNameGeneratorFactory({
 *   maxRetries: 3,
 *   minNumber: 1,
 *   maxNumber: 1000,
 * });
 *
 * const name1 = factory.generateUnchecked();
 * const name2 = await factory.generateUnique(checkExists);
 * ```
 */
export function createNameGeneratorFactory(
  defaultConfig: NameGeneratorConfig = {},
) {
  return {
    /**
     * Generate a name without uniqueness checking.
     */
    generateUnchecked: (
      overrideConfig?: NameGeneratorConfig,
    ): Omit<GeneratedName, "retries"> => {
      return generateNameUnchecked({ ...defaultConfig, ...overrideConfig });
    },

    /**
     * Generate a unique name with collision detection.
     */
    generateUnique: async (
      existsCheck: NameExistsCheck,
      overrideConfig?: NameGeneratorConfig,
    ): Promise<GeneratedName> => {
      return generateUniqueName(existsCheck, {
        ...defaultConfig,
        ...overrideConfig,
      });
    },

    /**
     * Get the configured defaults.
     */
    getConfig: () => ({ ...defaultConfig }),
  };
}

/**
 * Default name generator factory instance.
 * Can be used directly for common use cases.
 */
export const nameGenerator = createNameGeneratorFactory({
  maxRetries: 5,
  minNumber: 10,
  maxNumber: 100,
  separator: "-",
});
