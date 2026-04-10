import { notFound } from "next/navigation";
import { getServerContext } from "@/lib/server-context";
import { StoreRepository } from "@/data/stores/repositories/store-repository";
import { StoreTabs } from "@/components/stores/store-tabs";
import { StoreHeader } from "@/components/stores/store-header";

export default async function StoreLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode;
    params: Promise<{ storeId: string }>;
}>) {
    const { storeId } = await params;
    const { orgId } = await getServerContext();

    // Fetch store data
    const storeRepo = new StoreRepository(orgId);
    const storeResult = await storeRepo.findById(storeId);
    if (!storeResult.ok) notFound();

    const store = storeResult.value;

    return (
        <div className="flex flex-col gap-6">
            {/* Store header with breadcrumbs, name, and controls */}
            <StoreHeader store={store} orgId={orgId} />

            {/* Tab navigation */}
            <StoreTabs storeId={storeId} />

            {/* Page content */}
            <div>{children}</div>
        </div>
    );
}
