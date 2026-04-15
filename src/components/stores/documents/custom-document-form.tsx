"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Button,
    Input,
    TextField,
    Label,
    FieldError,
    Spinner,
} from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    createCustomDocumentAction,
    updateCustomDocumentAction,
} from "@/actions/document-actions";
import { useOptimisticUpdate } from "@/lib/hooks/use-optimistic-mutation";
import type { StoreDocument } from "@/data/stores/models/store-document.model";
import Link from "next/link";

interface CustomDocumentFormProps {
    readonly storeId: string;
    readonly document?: StoreDocument;
}

function isValidJson(val: string): boolean {
    try {
        JSON.parse(val);
        return true;
    } catch {
        return false;
    }
}

export function CustomDocumentForm({ storeId, document }: Readonly<CustomDocumentFormProps>) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const isEdit = !!document;

    const [name, setName] = useState(document?.name ?? "");
    const [data, setData] = useState(
        document?.data
            ? JSON.stringify(
                typeof document.data === "string"
                    ? JSON.parse(document.data)
                    : document.data,
                null,
                2
            )
            : "",
    );
    const [sourceId, setSourceId] = useState(document?.source?.id ?? "");
    const [sourceCollection, setSourceCollection] = useState(document?.source?.collection ?? "");
    const [nameError, setNameError] = useState("");
    const [jsonError, setJsonError] = useState("");
    const [formError, setFormError] = useState("");

    // Always call the hook to satisfy React hooks rules
    const optimisticUpdateOptions = useOptimisticUpdate(
        ["documents", document?.storeId ?? "", document?.id ?? ""],
        document?.id ?? "",
        {
            name: name.trim(),
            source: { id: sourceId.trim() || "manual", collection: sourceCollection.trim() || "default" },
            data,
        }
    );

    const mutation = useMutation<unknown, Error, void>({
        mutationFn: () => {
            const source = { id: sourceId.trim() || "manual", collection: sourceCollection.trim() || "default" };
            if (isEdit && document) {
                return updateCustomDocumentAction({
                    storeId,
                    docId: document.id,
                    name: name.trim(),
                    source,
                    data,
                });
            }
            return createCustomDocumentAction({ storeId, name: name.trim(), source, data });
        },
        // Only apply optimistic updates when in edit mode
        ...(isEdit ? optimisticUpdateOptions : {}),
        onSuccess: (result: any) => {
            if (!result.ok) {
                setFormError(result.error.message);
                return;
            }
            const docId = "document" in result.value ? result.value.document.id : document?.id;
            // Invalidate documents list on creation
            if (!isEdit) {
                queryClient.invalidateQueries({ queryKey: ["documents"], exact: false });
            }
            router.push(`/stores/${storeId}/documents/${docId}`);
        },
    });

    function handleJsonBlur() {
        if (data && !isValidJson(data)) {
            setJsonError("Invalid JSON syntax");
        } else {
            setJsonError("");
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) { setNameError("Name is required"); return; }
        if (!isValidJson(data)) { setJsonError("Invalid JSON syntax"); return; }
        setNameError("");
        setJsonError("");
        setFormError("");
        mutation.mutate();
    }

    return (
        <div className="flex flex-col gap-6 max-w-3xl">
            <nav className="text-sm text-foreground/50">
                <Link href="/stores" className="hover:text-foreground transition-colors">Stores</Link>
                <span className="mx-2">/</span>
                <Link href={`/stores/${storeId}`} className="hover:text-foreground transition-colors">Store</Link>
                <span className="mx-2">/</span>
                <span>{isEdit ? "Edit record" : "New record"}</span>
            </nav>

            <h1 className="text-2xl font-bold">{isEdit ? "Edit record" : "New JSON record"}</h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <TextField.Root isInvalid={!!nameError} variant="secondary">
                    <Label>Name *</Label>
                    <Input
                        placeholder="e.g. config, settings, product-123"
                        value={name}
                        maxLength={100}
                        onChange={(e) => { setName(e.target.value); setNameError(""); }}
                    />
                    <FieldError>{nameError}</FieldError>
                </TextField.Root>

                <div className="grid grid-cols-2 gap-3">
                    <TextField.Root variant="secondary">
                        <Label>Source ID</Label>
                        <Input
                            placeholder="e.g. manual, api, import"
                            value={sourceId}
                            onChange={(e) => setSourceId(e.target.value)}
                        />
                    </TextField.Root>
                    <TextField.Root variant="secondary">
                        <Label>Source Collection</Label>
                        <Input
                            placeholder="e.g. default, products, docs"
                            value={sourceCollection}
                            onChange={(e) => setSourceCollection(e.target.value)}
                        />
                    </TextField.Root>
                </div>

                <div className="flex flex-col gap-1">
                    <label htmlFor="json-data" className="text-sm font-medium">Data (JSON) *</label>
                    <textarea
                        id="json-data"
                        className={`w-full font-mono text-sm bg-surface border rounded-lg px-3 py-2 min-h-[240px] outline-none focus:border-accent transition-colors resize-y ${jsonError ? "border-danger" : "border-foreground/10"
                            }`}
                        value={data}
                        onChange={(e) => { setData(e.target.value); setJsonError(""); }}
                        onBlur={handleJsonBlur}
                        placeholder='{"key": "value"}'
                        spellCheck={false}
                    />
                    {jsonError && <p className="text-sm text-danger">{jsonError}</p>}
                </div>

                {formError && <p className="text-sm text-danger">{formError}</p>}

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        type="button"
                        onPress={() => router.back()}
                        isDisabled={mutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" isDisabled={mutation.isPending}>
                        {mutation.isPending ? <Spinner size="sm" /> : isEdit ? "Save changes" : "Create record"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
