export type ViewType = "queue" | "solutions" | "debug";

export const PROCESSING_EVENTS = {
    UNAUTHORIZED: "processing-unauthorized",
    NO_SCREENSHOTS: "processing-no-screenshots",
    API_KEY_INVALID: "processing-api-key-invalid",
    INITIAL_START: "initial-start",
    PROBLEM_EXTRACTED: "problem-extracted",
    SOLUTION_SUCCESS: "solution-success",
    INITIAL_SOLUTION_ERROR: "solution-error",
    DEBUG_START: "debug-start",
    DEBUG_SUCCESS: "debug-success",
    DEBUG_ERROR: "debug-error"
} as const;

export class AppState {
    private view: ViewType = "queue";
    private problemInfo: any = null;
    private hasDebugged: boolean = false;

    public getView(): ViewType {
        return this.view;
    }

    public setView(view: ViewType): void {
        this.view = view;
    }

    public getProblemInfo(): any {
        return this.problemInfo;
    }

    public setProblemInfo(info: any): void {
        this.problemInfo = info;
    }

    public getHasDebugged(): boolean {
        return this.hasDebugged;
    }

    public setHasDebugged(value: boolean): void {
        this.hasDebugged = value;
    }

    public reset(): void {
        this.problemInfo = null;
        this.setView("queue");
    }
} 