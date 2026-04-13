'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@heroui/react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * React Error Boundary for catching errors in FileListClient.
 * Displays error state with retry button (UI-011).
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error) {
        console.error('[Files Error Boundary]', error);
    }

    reset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-danger-200 bg-danger-50 p-8">
                    <div className="text-center">
                        <h2 className="text-lg font-semibold text-danger-700">Failed to load files</h2>
                        <p className="mt-2 text-sm text-danger-600">
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                    </div>
                    <Button
                        variant="danger"
                        onPress={this.reset}
                        className="mt-4"
                    >
                        Retry
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}

