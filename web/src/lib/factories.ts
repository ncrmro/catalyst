/**
 * Factory infrastructure for test data generation
 *
 * Provides base Factory class, faker for realistic data,
 * and database access for factory persistence
 */

import { faker } from "@faker-js/faker";
import { Factory as BaseFactory } from "fishery";
import { db } from "@/db";

export { BaseFactory as Factory, faker, db };
