"use client";

import { useRef, useState } from "react";
import { Button } from "@heroui/react";
import { useQueryClient } from "@tanstack/react-query";
import { getSignedUploadUrlAction } from "@/actions/document-actions";

const MAX_SIZE_BYTES = 52_428_800; // 50 MB

interface DocumentUploadButtonProps {
    storeId: string;
    orgId: string;
}

export function DocumentUploadButton({ storeId, orgId }: DocumentUploadButtonProps) {
    const queryClient = useQueryClient();
    const inputRef = useRef<HTMLInputElement>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setError(null);

        if (file.size > MAX_SIZE_BYTES) {
            setError("File exceeds 50 MB limit");
            if (inputRef.current) inputRef.current.value = "";
            return;
        }

        setProgress(0);

        const urlResult = await getSignedUploadUrlAction({
            storeId,
            filename: file.name,
            mimeType: file.type || "application/octet-stream",
            sizeBytes: file.size,
        });

        if (!urlResult.ok) {
            setError(urlResult.error.message);
            setProgress(null);
            if (inputRef.current) inputRef.current.value = "";
            return;
        }

        const { docId, storagePath } = urlResult.value;

        try {
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener("progress", (evt) => {
                if (evt.lengthComputable) {
                    setProgress(Math.round((evt.loaded / evt.total) * 100));
                }
            });

            await new Promise<void>((resolve, reject) => {
                xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
                xhr.onerror = () => reject(new Error("Network error during upload"));
                xhr.open("PUT", `/api/stores/${storeId}/documents/${docId}/upload`);
                xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
                xhr.setRequestHeader("x-storage-path", storagePath);
                xhr.send(file);
            });

            queryClient.invalidateQueries({ queryKey: ["documents", orgId, storeId] });
            queryClient.invalidateQueries({ queryKey: ["store", storeId] });
        } catch (uploadErr) {
            setError(uploadErr instanceof Error ? uploadErr.message : "Upload failed");
        } finally {
            setProgress(null);
            if (inputRef.current) inputRef.current.value = "";
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <Button
                variant="primary"
                onPress={() => inputRef.current?.click()}
                isDisabled={progress !== null}
            >
                {progress !== null ? `Uploading ${progress}%` : "Upload file"}
            </Button>
            <input
                ref={inputRef}
                type="file"
                className="sr-only"
                accept="*/*"
                onChange={handleFileChange}
                aria-label="Upload file"
            />
            {progress !== null && (
                <div className="w-full bg-foreground/10 rounded-full h-1.5">
                    <div
                        className="bg-accent h-1.5 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
            {error && <p className="text-xs text-danger">{error}</p>}
        </div>
    );
}
