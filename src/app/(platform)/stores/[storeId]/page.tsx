import { redirect } from "next/navigation";

interface Params {
    storeId: string;
}

export default async function StoreDetailPage({ params }: { params: Promise<Params> }) {
    const { storeId } = await params;
    redirect(`/stores/${storeId}/monitoring`);
}
