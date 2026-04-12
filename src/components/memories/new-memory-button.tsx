"use client";

import { Button } from "@heroui/react";
import { useMemoryActions } from "./memory-actions-provider";

export function NewMemoryButton() {
    const { openCreate } = useMemoryActions();
    return (
        <Button variant="primary" onPress={openCreate}>
            New memory
        </Button>
    );
}
