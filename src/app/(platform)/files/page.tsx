import { Suspense } from "react";
import { getServerContext } from "@/lib/server-context";
import { listFilesQuery } from "@/data/files/queries/list-files-query";
import { FileListClient } from "./_components/file-list-client";
import FilesLoading from "./loading";

interface Props {
    searchParams: Promise<{
        search?: string;
        sort?: string;
        order?: string;
        kinds?: string;
        cursor?: string;
    }>;
}

export default async function FilesPage({ searchParams }: Readonly<Props>) {
    const { orgId } = await getServerContext();
    const params = await searchParams;

    const search = params.search ?? undefined;
    const sort = (params.sort as "name" | "createdAt" | "size") ?? "createdAt";
    const order = (params.order as "asc" | "desc") ?? "desc";
    const kinds = params.kinds ? params.kinds.split(",").filter(Boolean) : undefined;

    // SSR initial data fetch
    const result = await listFilesQuery(orgId ?? "", {
        search,
        sort,
        order,
        kinds,
        limit: 25,
    });

    const initialFiles = result.ok ? result.value.files : [];
    const initialNextCursor = result.ok ? result.value.nextCursor : null;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Files</h1>
            </div>

            <Suspense fallback={<FilesLoading />}>
                <FileListClient
                    orgId={orgId ?? ""}
                    initialFiles={initialFiles}
                    initialNextCursor={initialNextCursor}
                />
            </Suspense>
        </div>
    );
}
