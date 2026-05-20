import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Item, PendingMutation } from "@/types";

interface NotedDB extends DBSchema {
  items: {
    key: string;
    value: Item;
  };
  mutations: {
    key: string;
    value: PendingMutation;
  };
  meta: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = "noted";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<NotedDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<NotedDB>> {
  if (typeof window === "undefined") {
    throw new Error("idb is browser-only");
  }
  if (!dbPromise) {
    dbPromise = openDB<NotedDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("items")) {
          db.createObjectStore("items", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("mutations")) {
          db.createObjectStore("mutations", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
      },
      blocked() {
        // older tab holding the db open with a stale version
        console.warn("[idb] blocked by another tab");
      },
      blocking() {
        // another tab wants to upgrade — close this connection
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

/** Wipes everything. Call on user switch or "reset local cache". */
export async function clearLocalData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear("items"),
    db.clear("mutations"),
    db.clear("meta"),
  ]);
}