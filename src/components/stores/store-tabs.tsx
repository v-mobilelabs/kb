"use client";

import { usePathname, useRouter } from "next/navigation";

interface StoreTabsProps {
    storeId: string;
}

const TABS = [
    { key: "monitoring", label: "Activity", href: (id: string) => `/stores/${id}/monitoring` },
    { key: "documents", label: "Documents", href: (id: string) => `/stores/${id}/documents` },
];

export function StoreTabs({ storeId }: Readonly<StoreTabsProps>) {
    const pathname = usePathname();

    // Determine active tab based on current path
    const activeTab = pathname.includes("/monitoring") ? "monitoring" : "documents";

    return (
        <div className="flex gap-4 border-b border-foreground/10">
            {TABS.map((tab) => (
                <a
                    key={tab.key}
                    href={tab.href(storeId)}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.key
                        ? "border-accent text-accent"
                        : "border-transparent text-foreground/60 hover:text-foreground"
                        }`}
                >
                    {tab.label}
                </a>
            ))}
        </div>
    );
}
