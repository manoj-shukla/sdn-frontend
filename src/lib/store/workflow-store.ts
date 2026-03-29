import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────

export interface WorkflowStep {
    stepId: number;
    workflowId: number;
    stepName: string;
    order: number;
    assignedRole: string;
    requiredActions: string[];
    estimatedDuration: number | null;
}

export interface Workflow {
    workflowId: number;
    workflowName: string;
    description: string | null;
    buyerId: number;
    isActive: boolean;
    steps: WorkflowStep[];
    createdAt: string;
    updatedAt: string;
}

export interface WorkflowExecution {
    executionId: number;
    workflowId: number;
    workflowName: string;
    entityType: 'SUPPLIER' | 'CONTRACT' | 'DOCUMENT';
    entityId: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
    currentStepOrder: number | null;
    currentStepName: string | null;
    assignedTo: number | null;
    initiatedBy: number;
    initiatedAt: string;
    completedAt: string | null;
}

export interface WorkflowTemplate {
    templateId: string;
    name: string;
    description: string;
    category: string;
    steps: Omit<WorkflowStep, 'workflowId' | 'stepId'>[];
}

// ─── State ────────────────────────────────────────────────────────────────

interface WorkflowState {
    workflows: Workflow[];
    activeWorkflow: Workflow | null;
    executions: WorkflowExecution[];
    activeExecution: WorkflowExecution | null;
    templates: WorkflowTemplate[];
    isLoading: boolean;
    error: string | null;

    // Workflow Actions
    setWorkflows: (workflows: Workflow[]) => void;
    setActiveWorkflow: (workflow: Workflow | null) => void;
    addWorkflow: (workflow: Workflow) => void;
    updateWorkflow: (workflowId: number, updates: Partial<Workflow>) => void;
    removeWorkflow: (workflowId: number) => void;

    // Execution Actions
    setExecutions: (executions: WorkflowExecution[]) => void;
    setActiveExecution: (execution: WorkflowExecution | null) => void;
    addExecution: (execution: WorkflowExecution) => void;
    updateExecution: (executionId: number, updates: Partial<WorkflowExecution>) => void;

    // Template Actions
    setTemplates: (templates: WorkflowTemplate[]) => void;

    // Utility Actions
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────

export const useWorkflowStore = create<WorkflowState>((set) => ({
    workflows: [],
    activeWorkflow: null,
    executions: [],
    activeExecution: null,
    templates: [],
    isLoading: false,
    error: null,

    // Workflow Actions
    setWorkflows: (workflows) => set({ workflows }),

    setActiveWorkflow: (workflow) => set({ activeWorkflow: workflow }),

    addWorkflow: (workflow) => set((state) => ({
        workflows: [...state.workflows, workflow]
    })),

    updateWorkflow: (workflowId, updates) => set((state) => ({
        workflows: state.workflows.map(w =>
            w.workflowId === workflowId ? { ...w, ...updates } : w
        ),
        activeWorkflow: state.activeWorkflow?.workflowId === workflowId
            ? { ...state.activeWorkflow, ...updates }
            : state.activeWorkflow
    })),

    removeWorkflow: (workflowId) => set((state) => ({
        workflows: state.workflows.filter(w => w.workflowId !== workflowId),
        activeWorkflow: state.activeWorkflow?.workflowId === workflowId ? null : state.activeWorkflow
    })),

    // Execution Actions
    setExecutions: (executions) => set({ executions }),

    setActiveExecution: (execution) => set({ activeExecution: execution }),

    addExecution: (execution) => set((state) => ({
        executions: [...state.executions, execution]
    })),

    updateExecution: (executionId, updates) => set((state) => ({
        executions: state.executions.map(e =>
            e.executionId === executionId ? { ...e, ...updates } : e
        ),
        activeExecution: state.activeExecution?.executionId === executionId
            ? { ...state.activeExecution, ...updates }
            : state.activeExecution
    })),

    // Template Actions
    setTemplates: (templates) => set({ templates }),

    // Utility Actions
    setLoading: (loading) => set({ isLoading: loading }),

    setError: (error) => set({ error }),

    clearError: () => set({ error: null })
}));
