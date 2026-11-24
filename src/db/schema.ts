import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export interface BuildItemSummary {
  name: string;
  slot: number;
  rarity: number;
  icon?: string;
  itemLevel?: number;
  stats?: Record<string, number>;
}

export interface BuildSummary {
  equipment: BuildItemSummary[];
  loadout?: number[];
  talents?: Record<string, Record<string, number>>;
}

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const playerPreferences = pgTable('player_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  muted: boolean('muted').notNull().default(false),
  volume: real('volume').notNull().default(0.8),
  highPerformance: boolean('high_performance').notNull().default(false),
  uiScale: real('ui_scale').notNull().default(1),
  autoSalvage: text('auto_salvage').notNull().default('off'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const heroSaves = pgTable(
  'hero_saves',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    slotKey: text('slot_key').notNull().default('primary'),
    heroName: text('hero_name').notNull().default('Varg'),
    heroLevel: integer('hero_level').notNull().default(1),
    currentDepth: integer('current_depth').notNull().default(1),
    bestDepth: integer('best_depth').notNull().default(1),
    snapshot: jsonb('snapshot').$type<Record<string, string>>().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('hero_saves_user_slot_idx').on(table.userId, table.slotKey)]
);

export const dungeonRuns = pgTable('dungeon_runs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  heroName: text('hero_name').notNull(),
  heroLevel: integer('hero_level').notNull().default(1),
  depthReached: integer('depth_reached').notNull().default(1),
  runMode: text('run_mode').notNull().default('standard'),
  challengeDate: text('challenge_date'),
  buildSummary: jsonb('build_summary').$type<BuildSummary | null>(),
  notes: text('notes'),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

export const fallenHeroes = pgTable('fallen_heroes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  heroName: text('hero_name').notNull(),
  heroLevel: integer('hero_level').notNull().default(1),
  depthReached: integer('depth_reached').notNull().default(1),
  causeOfDeath: text('cause_of_death'),
  buildSummary: jsonb('build_summary').$type<BuildSummary | null>(),
  fallenAt: timestamp('fallen_at').defaultNow().notNull(),
});

export const accountStash = pgTable('account_stash', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  itemName: text('item_name').notNull(),
  rarity: integer('rarity').notNull().default(0),
  slot: integer('slot').notNull().default(0),
  itemLevel: integer('item_level').notNull().default(1),
  itemData: jsonb('item_data').$type<Record<string, unknown>>().notNull(),
  storedAt: timestamp('stored_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  preferences: one(playerPreferences, {
    fields: [users.id],
    references: [playerPreferences.userId],
  }),
  heroSaves: many(heroSaves),
  dungeonRuns: many(dungeonRuns),
  fallenHeroes: many(fallenHeroes),
  stashItems: many(accountStash),
}));

export const playerPreferencesRelations = relations(playerPreferences, ({ one }) => ({
  user: one(users, {
    fields: [playerPreferences.userId],
    references: [users.id],
  }),
}));

export const heroSavesRelations = relations(heroSaves, ({ one }) => ({
  user: one(users, {
    fields: [heroSaves.userId],
    references: [users.id],
  }),
}));

export const dungeonRunsRelations = relations(dungeonRuns, ({ one }) => ({
  user: one(users, {
    fields: [dungeonRuns.userId],
    references: [users.id],
  }),
}));

export const fallenHeroesRelations = relations(fallenHeroes, ({ one }) => ({
  user: one(users, {
    fields: [fallenHeroes.userId],
    references: [users.id],
  }),
}));

export const accountStashRelations = relations(accountStash, ({ one }) => ({
  user: one(users, {
    fields: [accountStash.userId],
    references: [users.id],
  }),
}));
