#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get the fixtures directory path
const fixturesDir = path.join(__dirname, '..', 'src', 'fixtures');

// Create the directory if it doesn't exist
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
  console.log('✓ Created fixtures directory');
} else {
  console.log('✓ Fixtures directory already exists');
}

// Data for fixtures
const adjectives = [
  "ancient", "autumn", "azure", "bold", "brave", "bright", "calm", "clever", "cool", "cosmic",
  "crystal", "daring", "dawn", "divine", "dream", "eager", "electric", "elegant", "emerald", "epic",
  "fancy", "fast", "fierce", "fire", "forest", "fresh", "frosty", "gentle", "gleaming", "golden",
  "grand", "happy", "harmonic", "heroic", "hidden", "holy", "humble", "icy", "infinite", "jade",
  "jolly", "keen", "kind", "lazy", "light", "lively", "lucky", "lunar", "magic", "majestic",
  "mellow", "mighty", "misty", "modern", "mystic", "neat", "noble", "ocean", "orange", "pearl",
  "pink", "polite", "prime", "proud", "purple", "quick", "quiet", "radiant", "rapid", "red",
  "regal", "royal", "ruby", "rustic", "sage", "scarlet", "serene", "shadow", "shiny", "silent",
  "silver", "simple", "sleek", "smooth", "snowy", "solar", "sonic", "speedy", "spring", "stable",
  "stellar", "storm", "summer", "sunny", "super", "swift", "teal", "tender", "thunder", "tiny",
  "tranquil", "trusty", "turbo", "twilight", "united", "velvet", "vibrant", "violet", "vital", "vivid",
  "warm", "wild", "winter", "wise", "zen"
];

const nouns = [
  "anchor", "badger", "bear", "beaver", "bird", "bison", "boat", "breeze", "bridge", "butterfly",
  "canyon", "castle", "cave", "cheetah", "citadel", "cliff", "cloud", "comet", "compass", "coral",
  "coyote", "crane", "creek", "crystal", "delta", "desert", "dolphin", "dove", "dragon", "dune",
  "eagle", "echo", "elephant", "falcon", "fern", "fjord", "flame", "forest", "fortress", "fountain",
  "fox", "galaxy", "garden", "glacier", "grove", "hawk", "haven", "hill", "horizon", "hummingbird",
  "island", "jaguar", "journey", "jungle", "lantern", "leopard", "lighthouse", "lion", "lotus", "meadow",
  "meteor", "moon", "mountain", "nebula", "oak", "oasis", "ocean", "orchid", "otter", "owl",
  "panda", "panther", "path", "peak", "penguin", "phoenix", "pine", "planet", "pond", "prairie",
  "pyramid", "quasar", "rabbit", "raven", "reef", "river", "rocket", "rose", "sage", "sandstone",
  "sea", "shadow", "shark", "shore", "sky", "sparrow", "sphinx", "spirit", "star", "stone",
  "stream", "summit", "sunrise", "sunset", "temple", "thunder", "tide", "tiger", "tower", "trail",
  "tree", "universe", "valley", "volcano", "wave", "whale", "willow", "wind", "wolf", "zenith"
];

const systemNamespaces = [
  "default",
  "kube-system",
  "kube-public",
  "kube-node-lease",
  "catalyst-system"
];

// Write JSON files
const files = [
  { name: 'adjectives.json', data: adjectives },
  { name: 'nouns.json', data: nouns },
  { name: 'system-namespaces.json', data: systemNamespaces }
];

files.forEach(({ name, data }) => {
  const filepath = path.join(fixturesDir, name);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n');
  console.log(`✓ Created ${name}`);
});

// Create index.ts that imports and validates the JSON files
const indexContent = `/**
 * Static fixtures imported from JSON files
 * 
 * This file serves as a central export point for all fixtures used throughout the application.
 * Fixtures are validated against Zod schemas to ensure type safety.
 */

import { z } from "zod";
import adjectivesData from "./adjectives.json";
import nounsData from "./nouns.json";
import systemNamespacesData from "./system-namespaces.json";

// Zod schemas for validation
const AdjectivesSchema = z.array(z.string()).readonly();
const NounsSchema = z.array(z.string()).readonly();
const SystemNamespacesSchema = z.array(z.string()).readonly();

// Validate and export
export const ADJECTIVES = AdjectivesSchema.parse(adjectivesData);
export const NOUNS = NounsSchema.parse(nounsData);
export const SYSTEM_NAMESPACES = SystemNamespacesSchema.parse(systemNamespacesData);

// Type exports
export type Adjective = typeof ADJECTIVES[number];
export type Noun = typeof NOUNS[number];
export type SystemNamespace = typeof SYSTEM_NAMESPACES[number];
`;

const indexPath = path.join(fixturesDir, 'index.ts');
fs.writeFileSync(indexPath, indexContent);
console.log('✓ Created index.ts');

console.log('\n✅ All fixtures created successfully!');
console.log(`\nLocation: ${fixturesDir}`);
console.log('Files:', fs.readdirSync(fixturesDir));
