"use client";

import { Button } from "@heroui/react";
import { useStoreActions } from "./store-actions-provider";

export function NewStoreButton() {
    const { openCreate } = useStoreActions();
    return (
        <Button variant="primary" onPress={openCreate}>
            New store
        </Button>
    );
}
