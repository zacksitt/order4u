"use server";

import { searchCatalogItems } from "@/server/queries/catalog";

export async function searchCatalogItemsAction(query: string) {
  return searchCatalogItems(query);
}
