import { notFound } from "next/navigation";
import { getServerContext } from "@/lib/server-context";
import { StoreRepository } from "@/data/stores/repositories/store-repository";
import { GetStoreMonitoringUseCase } from "@/data/stores/use-cases/get-store-monitoring-use-case";
import type { AppContext } from "@/lib/middleware/with-context";
import { StoreMonitoringClient } from "@/components/stores/monitoring/store-monitoring-client";

interface Params {
    storeId: string;
}

export default async function StoreMonitoringPage({ params }: Readonly<{ params: Promise<Params> }>) {
    const { storeId } = await params;

    const { uid, orgId, user } = await getServerContext();

    const storeRepo = new StoreRepository(orgId ?? '');
    const storeResult = await storeRepo.findById(storeId);
    if (!storeResult.ok) notFound();

    const store = storeResult.value;

    // Fetch initial monitoring data on server
    const ctx: AppContext = {
        uid,
        orgId: orgId ?? '',
        email: (user?.email as string) ?? "",
    };
    const useCase = new GetStoreMonitoringUseCase(ctx);
    const monitoringResult = await useCase.execute({ storeId });
    const initialMonitoring = monitoringResult.ok ? monitoringResult.value : null;

    return (
        <StoreMonitoringClient
            storeId={store.id}
            orgId={orgId ?? ''}
            documentCount={store.documentCount}
            initialData={initialMonitoring}
        />
    );
}
