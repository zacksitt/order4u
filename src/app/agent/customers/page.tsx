import { CustomersDirectory } from "@/components/order4u/customers-directory";
import { listAgentCustomersPage } from "@/server/queries/customers";

type PageProps = {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string; sort?: string; dir?: string }>;
};

export default async function AgentCustomersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const list = await listAgentCustomersPage({
    search: params.q,
    page: params.page,
    pageSize: params.pageSize,
    sort: params.sort,
    dir: params.dir,
  });

  return <CustomersDirectory list={list} />;
}
