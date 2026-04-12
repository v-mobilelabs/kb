import { getServerContext } from "@/lib/server-context";
import { MemoryDocumentDetailClient } from "@/components/memories/documents/memory-document-detail-client";

interface Props {
    params: Promise<{ memoryId: string; documentId: string }>;
}

export default async function MemoryDocumentDetailPage({
    params,
}: Readonly<Props>) {
    const { orgId } = await getServerContext();
    const { memoryId, documentId } = await params;

    return (
        <MemoryDocumentDetailClient
            orgId={orgId ?? ""}
            memoryId={memoryId}
            documentId={documentId}
        />
    );
}
