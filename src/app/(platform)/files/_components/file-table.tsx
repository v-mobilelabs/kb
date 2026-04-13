'use client'

import { useState } from "react";
import {
    Table,
    TableScrollContainer,
    TableContent,
    TableHeader,
    TableBody,
    TableColumn,
    TableRow,
    TableCell,
    Button,
    Spinner,
} from "@heroui/react";
import type { File } from "@/data/files/models/file.model";
import { FileThumbnail } from "./file-thumbnail";
import { DeleteFileModal } from "./delete-file-modal";
import { KindBadge } from "@/components/shared/kind-badge";
import { formatFileSize } from "@/data/files/lib/format-file-size";
import { useFileDownload } from "@/lib/hooks/use-file-download";

interface FileRowProps {
    file: File;
    onDeleted: () => void;
}

function FileRow({ file, onDeleted }: Readonly<FileRowProps>) {
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const { triggerDownload, isPending: isDownloading } = useFileDownload(file.id);

    const uploadDate = file.createdAt instanceof Date
        ? file.createdAt.toLocaleDateString(undefined, { dateStyle: "medium" })
        : new Date(file.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" });

    return (
        <>
            <TableRow key={file.id}>
                {/* Thumbnail */}
                <TableCell className="w-14">
                    <FileThumbnail fileId={file.id} alt={file.originalName} className="size-10 shrink-0" />
                </TableCell>

                {/* File name */}
                <TableCell>
                    <span className="line-clamp-1 text-sm font-medium">{file.originalName}</span>
                </TableCell>

                {/* Size — hidden on mobile */}
                <TableCell className="hidden sm:table-cell text-sm text-foreground/70">
                    {formatFileSize(file.size)}
                </TableCell>

                {/* Kind badge */}
                <TableCell>
                    <KindBadge kind={file.kind} />
                </TableCell>

                {/* Upload date — hidden on mobile */}
                <TableCell className="hidden sm:table-cell text-sm text-foreground/70">
                    {uploadDate}
                </TableCell>

                {/* Actions */}
                <TableCell className="w-20">
                    <div className="flex items-center gap-1">
                        {/* Download */}
                        <Button
                            isIconOnly
                            size="sm"
                            variant="ghost"
                            onPress={() => void triggerDownload()}
                            isDisabled={isDownloading}
                            aria-label={`Download ${file.originalName}`}
                        >
                            {isDownloading ? (
                                <Spinner size="sm" />
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            )}
                        </Button>

                        {/* Delete */}
                        <Button
                            isIconOnly
                            size="sm"
                            variant="danger-soft"
                            onPress={() => setShowDeleteModal(true)}
                            aria-label={`Delete ${file.originalName}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </Button>
                    </div>
                </TableCell>
            </TableRow>

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

interface FileTableProps {
    files: File[];
    onDeleted: () => void;
}

export function FileTable({ files, onDeleted }: Readonly<FileTableProps>) {
    return (
        <Table>
            <TableScrollContainer>
                <TableContent aria-label="Files" selectionMode="none">
                    <TableHeader>
                        <TableColumn className="w-14"> </TableColumn>
                        <TableColumn>Name</TableColumn>
                        <TableColumn className="hidden sm:table-cell">Size</TableColumn>
                        <TableColumn>Type</TableColumn>
                        <TableColumn className="hidden sm:table-cell">Uploaded</TableColumn>
                        <TableColumn className="w-20">Actions</TableColumn>
                    </TableHeader>
                    <TableBody>
                        {files.map((file) => (
                            <FileRow key={file.id} file={file} onDeleted={onDeleted} />
                        ))}
                    </TableBody>
                </TableContent>
            </TableScrollContainer>
        </Table>
    );
}
