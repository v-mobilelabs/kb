'use client'

import { useState } from "react";
import { Card, Button, Spinner } from "@heroui/react";
import type { File } from "@/data/files/models/file.model";
import { FileThumbnail } from "./file-thumbnail";
import { DeleteFileModal } from "./delete-file-modal";
import { KindBadge } from "@/components/shared/kind-badge";
import { formatFileSize } from "@/data/files/lib/format-file-size";
import { useFileDownload } from "@/lib/hooks/use-file-download";

interface FileCardProps {
    file: File;
    onDeleted: () => void;
}

/**
 * Mobile-friendly card layout for individual file (used on sm: screens).
 * Shows thumbnail prominently, all metadata, and actions in single column.
 */
export function FileCard({ file, onDeleted }: Readonly<FileCardProps>) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const { triggerDownload, isPending: isDownloading } = useFileDownload(file.id);

    const uploadDate = file.createdAt instanceof Date
        ? file.createdAt.toLocaleDateString(undefined, { dateStyle: "medium" })
        : new Date(file.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" });

    return (
        <>
            <Card className="border border-default-200">
                <div className="gap-3 p-4 space-y-3">
                    {/* Thumbnail - prominent */}
                    <div className="flex justify-center">
                        <FileThumbnail
                            fileId={file.id}
                            alt={file.originalName}
                            className="size-32"
                        />
                    </div>

                    {/* Metadata */}
                    <div className="space-y-2 text-sm">
                        <div>
                            <p className="line-clamp-2 font-medium text-foreground">
                                {file.originalName}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <KindBadge kind={file.kind} />
                            <span className="text-xs text-foreground/60">
                                {formatFileSize(file.size)}
                            </span>
                        </div>

                        <p className="text-xs text-foreground/50">
                            Uploaded {uploadDate}
                        </p>
                    </div>

                    {/* Actions - full width buttons on mobile */}
                    <div className="flex flex-col gap-2 pt-2">
                        <Button
                            fullWidth
                            size="sm"
                            variant="outline"
                            onPress={() => void triggerDownload()}
                            isDisabled={isDownloading}
                        >
                            {isDownloading ? "Downloading…" : "Download"}
                        </Button>

                        <Button
                            fullWidth
                            size="sm"
                            variant="danger"
                            onPress={() => setShowDeleteModal(true)}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            </Card>

            {showDeleteModal && (
                <DeleteFileModal
                    isOpen={showDeleteModal}
                    fileId={file.id}
                    fileName={file.originalName}
                    fileSize={file.size}
                    onDismiss={() => setShowDeleteModal(false)}
                    onDeleted={() => {
                        setShowDeleteModal(false);
                        onDeleted();
                    }}
                />
            )}
        </>
    );
}
