import { PageHeader } from "@/components/order4u/page-header";
import { CargoCategoriesManager } from "@/components/order4u/cargo-categories-manager";
import { listItemCategories } from "@/server/queries/item-categories";

export default async function CargoCategoriesPage() {
  const categories = await listItemCategories();

  return (
    <>
      <PageHeader
        title="Categories"
        description="Name each item type and set its cargo price in THB per kg. On each cargo invoice you enter the weight per category."
      />
      <CargoCategoriesManager categories={categories} />
    </>
  );
}
