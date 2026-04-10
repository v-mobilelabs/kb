import { notFound } from "next/navigation";
import { getServerContext } from "@/lib/server-context";
import { StoreDocumentRepository } from "@/data/stores/repositories/store-document-repository";
import { CustomDocumentViewer } from "@/components/stores/custom-document-viewer";
import { CustomDocumentForm } from "@/components/stores/custom-document-form";

interface Params {
    storeId: string;
    docId: string;
}

interface SearchParams {
    edit?: string;
}

export default async function DocumentViewerPage({
    params,
    searchParams,
}: {
    params: Promise<Params>;
    searchParams: Promise<SearchParams>;
}) {
    const { storeId, docId } = await params;
    const { edit } = await searchParams;

    const { orgId } = await getServerContext();

    const docRepo = new StoreDocumentRepository(orgId ?? '', storeId);
    const docResult = await docRepo.findById(docId);
    if (!docResult.ok) notFound();

    const doc = docResult.value;
    if (doc.kind !== "data") notFound();

    if (edit === "1") {
        return <CustomDocumentForm storeId={storeId} document={doc} />;
    }

    return <CustomDocumentViewer orgId={orgId ?? ''} document={doc} />;
}
