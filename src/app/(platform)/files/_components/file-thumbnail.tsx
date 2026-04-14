'use client'

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

interface FileThumbnailProps {
    fileId: string;
    alt?: string;
    className?: string;
}

export function FileThumbnail({
    fileId,
    alt = "File thumbnail",
    className = "",
}: Readonly<FileThumbnailProps>) {
    const { data, isPending } = useQuery({
        queryKey: queryKeys.fileThumbnail(fileId),
        queryFn: async () => {
            const res = await fetch(`/api/files/${fileId}/thumbnail`);
            if (!res.ok) throw new Error("Failed to fetch thumbnail");
            return res.json() as Promise<
                | { isImage: true; url: string; contentType: string }
                | { isImage: false; data: string; contentType: string }
            >;
        },
        staleTime: 4 * 60 * 1000, // 4 min — slightly under the 5-min signed URL expiry
    });

    if (isPending) {
        return (
            <div
                className={`animate-pulse rounded bg-default-200 aspect-square ${className || "size-10"}`}
            />
        );
    }

    if (!data) {
        return (
            <div
                className={`flex items-center justify-center rounded bg-default-100 aspect-square ${className || "size-10"}`}
            >
                <span className="text-xs text-default-400">?</span>
            </div>
        );
    }

    const src = data.isImage ? data.url : data.data;

    return (
        <div className={`aspect-square overflow-hidden rounded ${className || "size-10"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={alt}
                className="size-full object-cover"
            />
        </div>
    );
}
