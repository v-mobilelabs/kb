import { getServerContext } from "@/lib/server-context";
import { RagQueryTester } from "@/components/query/rag-query-tester";

export const metadata = { title: "Query RAG | CosmoOps" };

export default async function QueryPage() {
    const { orgId } = await getServerContext();

    return (
        <main className="flex flex-col gap-8">
            <div>
                <h1 className="text-2xl font-bold">Query RAG</h1>
                <p className="text-sm text-foreground/60 mt-1">
                    Test semantic search across your knowledge bases
                </p>
            </div>

            <RagQueryTester orgId={orgId ?? ''} />
        </main>
    );
}
