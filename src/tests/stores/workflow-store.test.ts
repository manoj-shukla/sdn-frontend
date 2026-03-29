import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useWorkflowStore } from '@/lib/store/workflow-store';
import type { Workflow, WorkflowExecution, WorkflowTemplate } from '@/lib/store/workflow-store';

const resetStore = () => {
    useWorkflowStore.setState({
        workflows: [],
        activeWorkflow: null,
        executions: [],
        activeExecution: null,
        templates: [],
        isLoading: false,
        error: null,
    });
};

describe('Workflow Store', () => {
    beforeEach(() => resetStore());

    const mockWorkflow: Workflow = {
        workflowId: 1,
        workflowName: 'Supplier Approval',
        description: 'Standard approval process',
        buyerId: 1,
        isActive: true,
        steps: [
            {
                stepId: 1,
                workflowId: 1,
                stepName: 'Compliance Review',
                order: 1,
                assignedRole: 'COMPLIANCE_OFFICER',
                requiredActions: ['APPROVE', 'REJECT'],
                estimatedDuration: 24,
            },
            {
                stepId: 2,
                workflowId: 1,
                stepName: 'Finance Review',
                order: 2,
                assignedRole: 'FINANCE_MANAGER',
                requiredActions: ['APPROVE', 'REJECT'],
                estimatedDuration: 24,
            },
        ],
        createdAt: '2026-02-26T00:00:00Z',
        updatedAt: '2026-02-26T00:00:00Z',
    };

    const mockExecution: WorkflowExecution = {
        executionId: 100,
        workflowId: 1,
        workflowName: 'Supplier Approval',
        entityType: 'SUPPLIER',
        entityId: 10,
        status: 'IN_PROGRESS',
        currentStepOrder: 1,
        currentStepName: 'Compliance Review',
        assignedTo: 5,
        initiatedBy: 1,
        initiatedAt: '2026-02-26T00:00:00Z',
        completedAt: null,
    };

    const mockTemplate: WorkflowTemplate = {
        templateId: 'supplier-approval',
        name: 'Supplier Approval Template',
        description: 'Pre-configured supplier approval workflow',
        category: 'SUPPLIER',
        steps: [
            {
                stepName: 'Review',
                order: 1,
                assignedRole: 'ADMIN',
                requiredActions: ['APPROVE', 'REJECT'],
                estimatedDuration: 48,
            },
        ],
    };

    describe('Workflow Management', () => {
        it('sets workflows list', () => {
            act(() => useWorkflowStore.getState().setWorkflows([mockWorkflow]));
            expect(useWorkflowStore.getState().workflows).toHaveLength(1);
        });

        it('sets active workflow', () => {
            act(() => useWorkflowStore.getState().setActiveWorkflow(mockWorkflow));
            expect(useWorkflowStore.getState().activeWorkflow).toEqual(mockWorkflow);
        });

        it('adds new workflow', () => {
            act(() => useWorkflowStore.getState().addWorkflow(mockWorkflow));
            expect(useWorkflowStore.getState().workflows).toHaveLength(1);
            expect(useWorkflowStore.getState().workflows[0].workflowName).toBe('Supplier Approval');
        });

        it('updates existing workflow', () => {
            act(() => useWorkflowStore.getState().addWorkflow(mockWorkflow));
            act(() => useWorkflowStore.getState().updateWorkflow(1, { workflowName: 'Updated Approval' }));

            const workflow = useWorkflowStore.getState().workflows[0];
            expect(workflow.workflowName).toBe('Updated Approval');
        });

        it('updates active workflow when modified', () => {
            act(() => useWorkflowStore.getState().setActiveWorkflow(mockWorkflow));
            act(() => useWorkflowStore.getState().updateWorkflow(1, { isActive: false }));

            expect(useWorkflowStore.getState().activeWorkflow?.isActive).toBe(false);
        });

        it('removes workflow from list', () => {
            act(() => useWorkflowStore.getState().addWorkflow(mockWorkflow));
            act(() => useWorkflowStore.getState().removeWorkflow(1));

            expect(useWorkflowStore.getState().workflows).toHaveLength(0);
        });

        it('clears active workflow when deleted', () => {
            act(() => useWorkflowStore.getState().setActiveWorkflow(mockWorkflow));
            act(() => useWorkflowStore.getState().removeWorkflow(1));

            expect(useWorkflowStore.getState().activeWorkflow).toBeNull();
        });
    });

    describe('Workflow Execution', () => {
        it('sets executions list', () => {
            act(() => useWorkflowStore.getState().setExecutions([mockExecution]));
            expect(useWorkflowStore.getState().executions).toHaveLength(1);
        });

        it('sets active execution', () => {
            act(() => useWorkflowStore.getState().setActiveExecution(mockExecution));
            expect(useWorkflowStore.getState().activeExecution).toEqual(mockExecution);
        });

        it('adds new execution', () => {
            act(() => useWorkflowStore.getState().addExecution(mockExecution));
            expect(useWorkflowStore.getState().executions).toHaveLength(1);
        });

        it('updates execution status', () => {
            act(() => useWorkflowStore.getState().addExecution(mockExecution));
            act(() => useWorkflowStore.getState().updateExecution(100, { status: 'COMPLETED' }));

            const execution = useWorkflowStore.getState().executions[0];
            expect(execution.status).toBe('COMPLETED');
        });

        it('updates active execution when modified', () => {
            act(() => useWorkflowStore.getState().setActiveExecution(mockExecution));
            act(() => useWorkflowStore.getState().updateExecution(100, { currentStepOrder: 2 }));

            expect(useWorkflowStore.getState().activeExecution?.currentStepOrder).toBe(2);
        });

        it('advances workflow to next step', () => {
            act(() => useWorkflowStore.getState().addExecution(mockExecution));
            act(() => useWorkflowStore.getState().updateExecution(100, {
                currentStepOrder: 2,
                currentStepName: 'Finance Review',
            }));

            const execution = useWorkflowStore.getState().executions[0];
            expect(execution.currentStepOrder).toBe(2);
        });

        it('completes workflow execution', () => {
            act(() => useWorkflowStore.getState().addExecution(mockExecution));
            act(() => useWorkflowStore.getState().updateExecution(100, {
                status: 'COMPLETED',
                completedAt: '2026-02-26T01:00:00Z',
            }));

            const execution = useWorkflowStore.getState().executions[0];
            expect(execution.status).toBe('COMPLETED');
            expect(execution.completedAt).toBeDefined();
        });
    });

    describe('Workflow Templates', () => {
        it('sets templates list', () => {
            act(() => useWorkflowStore.getState().setTemplates([mockTemplate]));
            expect(useWorkflowStore.getState().templates).toHaveLength(1);
        });

        it('stores template metadata', () => {
            act(() => useWorkflowStore.getState().setTemplates([mockTemplate]));

            const template = useWorkflowStore.getState().templates[0];
            expect(template.templateId).toBe('supplier-approval');
            expect(template.category).toBe('SUPPLIER');
        });

        it('preserves template steps without IDs', () => {
            act(() => useWorkflowStore.getState().setTemplates([mockTemplate]));

            const template = useWorkflowStore.getState().templates[0];
            expect(template.steps[0]).not.toHaveProperty('stepId');
            expect(template.steps[0]).not.toHaveProperty('workflowId');
        });
    });

    describe('Loading and Error States', () => {
        it('sets loading state', () => {
            act(() => useWorkflowStore.getState().setLoading(true));
            expect(useWorkflowStore.getState().isLoading).toBe(true);
        });

        it('sets error message', () => {
            act(() => useWorkflowStore.getState().setError('Workflow execution failed'));
            expect(useWorkflowStore.getState().error).toBe('Workflow execution failed');
        });

        it('clears error message', () => {
            act(() => useWorkflowStore.getState().setError('Some error'));
            act(() => useWorkflowStore.getState().clearError());
            expect(useWorkflowStore.getState().error).toBeNull();
        });
    });

    describe('Derived State & Filtering', () => {
        it('filters executions by status', () => {
            const completedExecution: WorkflowExecution = {
                ...mockExecution,
                executionId: 101,
                status: 'COMPLETED',
            };

            act(() => useWorkflowStore.getState().setExecutions([mockExecution, completedExecution]));

            const inProgress = useWorkflowStore.getState().executions.filter(e => e.status === 'IN_PROGRESS');
            expect(inProgress).toHaveLength(1);
        });

        it('filters executions by entity', () => {
            act(() => useWorkflowStore.getState().setExecutions([mockExecution]));

            const supplierExecutions = useWorkflowStore.getState().executions.filter(
                e => e.entityType === 'SUPPLIER' && e.entityId === 10
            );
            expect(supplierExecutions).toHaveLength(1);
        });

        it('calculates workflow step count', () => {
            act(() => useWorkflowStore.getState().setWorkflows([mockWorkflow]));

            const workflow = useWorkflowStore.getState().workflows[0];
            expect(workflow.steps).toHaveLength(2);
        });

        it('orders workflow steps correctly', () => {
            act(() => useWorkflowStore.getState().setWorkflows([mockWorkflow]));

            const workflow = useWorkflowStore.getState().workflows[0];
            expect(workflow.steps[0].order).toBe(1);
            expect(workflow.steps[1].order).toBe(2);
        });
    });

    describe('Complex Workflows', () => {
        it('handles workflow with multiple steps', () => {
            const complexWorkflow: Workflow = {
                ...mockWorkflow,
                steps: [
                    ...mockWorkflow.steps,
                    {
                        stepId: 3,
                        workflowId: 1,
                        stepName: 'Final Approval',
                        order: 3,
                        assignedRole: 'ADMIN',
                        requiredActions: ['APPROVE'],
                        estimatedDuration: 24,
                    },
                ],
            };

            act(() => useWorkflowStore.getState().setWorkflows([complexWorkflow]));
            expect(useWorkflowStore.getState().workflows[0].steps).toHaveLength(3);
        });

        it('tracks execution progress through steps', () => {
            act(() => useWorkflowStore.getState().addExecution(mockExecution));

            const execution = useWorkflowStore.getState().executions[0];
            expect(execution.currentStepOrder).toBe(1);

            act(() => useWorkflowStore.getState().updateExecution(100, { currentStepOrder: 2 }));
            expect(useWorkflowStore.getState().executions[0].currentStepOrder).toBe(2);
        });
    });
});
