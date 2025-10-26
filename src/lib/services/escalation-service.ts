/**
 * Escalation Service
 * Manages escalation policies, rules, actions, and chains
 */

import {
  EscalationPolicy,
  EscalationRule,
  EscalationAction,
  EscalationEvent,
  EscalationChain,
  CreateEscalationPolicyRequest,
  CreateEscalationRuleRequest,
} from '@/types/escalation';

// ============================================================================
// ESCALATION SERVICE
// ============================================================================

export class EscalationService {
  // ============================================================================
  // ESCALATION POLICY METHODS
  // ============================================================================

  /**
   * Create escalation policy for workflow template
   */
  static async createPolicy(
    tenantId: string,
    request: CreateEscalationPolicyRequest,
    createdBy: string
  ): Promise<EscalationPolicy> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const policy = {
        id: `policy-${Date.now()}`,
        workflowTemplateId: request.workflowTemplateId,
        tenantId,
        name: request.name,
        description: request.description || null,
        warningThresholdPercent: request.warningThresholdPercent || 75,
        maxEscalationLevels: request.maxEscalationLevels || 3,
        cooldownBetweenEscalations: request.cooldownBetweenEscalations || 60,
        rules: [],
        isActive: true,
        isDefault: request.isDefault || false,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // In production, this would be persisted to database
      // For now, return the created policy
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return policy as any;
    } catch (error) {
      console.error(`Failed to create escalation policy: ${error}`);
      throw error;
    }
  }

  /**
   * Get escalation policy by ID
   */
  static async getPolicy(policyId: string): Promise<EscalationPolicy | null> {
    try {
      // In production, fetch from database
      // For now, return null (not found)
      return null;
    } catch (error) {
      console.error(`Failed to get escalation policy ${policyId}: ${error}`);
      return null;
    }
  }

  /**
   * Get escalation policy for workflow template
   */
  static async getPolicyForTemplate(
    workflowTemplateId: string,
    _isDefault?: boolean
  ): Promise<EscalationPolicy | null> {
    try {
      // In production, query database for template's policy
      // For now, return null
      return null;
    } catch (error) {
      console.error(`Failed to get policy for template ${workflowTemplateId}: ${error}`);
      return null;
    }
  }

  /**
   * List escalation policies for tenant
   */
  static async listPolicies(
    _tenantId: string,
    _workflowTemplateId?: string
  ): Promise<EscalationPolicy[]> {
    try {
      // In production, query database
      return [];
    } catch (error) {
      console.error(`Failed to list escalation policies: ${error}`);
      return [];
    }
  }

  /**
   * Update escalation policy
   */
  static async updatePolicy(
    policyId: string,
    _updates: Partial<EscalationPolicy>,
    _userId?: string
  ): Promise<EscalationPolicy | null> {
    try {
      // In production, update in database
      return null;
    } catch (error) {
      console.error(`Failed to update escalation policy ${policyId}: ${error}`);
      return null;
    }
  }

  /**
   * Delete escalation policy
   */
  static async deletePolicy(policyId: string, _userId?: string): Promise<boolean> {
    try {
      // In production, delete from database
      return true;
    } catch (error) {
      console.error(`Failed to delete escalation policy ${policyId}: ${error}`);
      return false;
    }
  }

  // ============================================================================
  // ESCALATION RULE METHODS
  // ============================================================================

  /**
   * Create escalation rule within policy
   */
  static async createRule(
    request: CreateEscalationRuleRequest,
    createdBy: string
  ): Promise<EscalationRule> {
    try {
      // Convert action requests to action objects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const actions: EscalationAction[] = request.actions.map((actionReq, index) => ({
        id: `action-${Date.now()}-${index}`,
        escalationRuleId: `rule-${Date.now()}`,
        actionType: actionReq.actionType,
        reassignToUserId: actionReq.reassignToUserId,
        reassignToRole: actionReq.reassignToRole,
        notificationTemplate: actionReq.notificationTemplate,
        newPriority: actionReq.newPriority,
        comment: actionReq.comment,
        webhookUrl: actionReq.webhookUrl,
        isActive: true,
        order: actionReq.order || index,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any));

      // Create rule
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rule: any = {
        id: `rule-${Date.now()}`,
        escalationPolicyId: request.escalationPolicyId,
        name: request.name,
        description: request.description,
        triggerType: request.triggerType,
        escalationLevel: request.escalationLevel,
        hoursInStage: request.hoursInStage,
        warningThresholdPercent: request.warningThresholdPercent,
        minimumPriority: request.minimumPriority,
        customCondition: null,
        isActive: true,
        isRepeatable: request.isRepeatable !== false,
        cooldownMinutes: request.cooldownMinutes || 60,
        maxEscalations: request.maxEscalations,
        actions,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return rule;
    } catch (error) {
      console.error(`Failed to create escalation rule: ${error}`);
      throw error;
    }
  }

  /**
   * Get escalation rule by ID
   */
  static async getRule(ruleId: string): Promise<EscalationRule | null> {
    try {
      return null;
    } catch (error) {
      console.error(`Failed to get escalation rule ${ruleId}: ${error}`);
      return null;
    }
  }

  /**
   * List rules for policy
   */
  static async listRulesForPolicy(policyId: string): Promise<EscalationRule[]> {
    try {
      return [];
    } catch (error) {
      console.error(`Failed to list rules for policy ${policyId}: ${error}`);
      return [];
    }
  }

  /**
   * Update escalation rule
   */
  static async updateRule(
    ruleId: string,
    _updates: Partial<EscalationRule>,
    _userId?: string
  ): Promise<EscalationRule | null> {
    try {
      return null;
    } catch (error) {
      console.error(`Failed to update escalation rule ${ruleId}: ${error}`);
      return null;
    }
  }

  /**
   * Delete escalation rule
   */
  static async deleteRule(ruleId: string, _userId?: string): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      console.error(`Failed to delete escalation rule ${ruleId}: ${error}`);
      return false;
    }
  }

  // ============================================================================
  // ESCALATION CHAIN METHODS
  // ============================================================================

  /**
   * Create escalation chain
   */
  static async createChain(
    policyId: string,
    name: string,
    description: string | undefined,
    level1UserId: string,
    level1DelayMinutes: number,
    level2UserId?: string,
    level2DelayMinutes?: number,
    level3UserId?: string,
    level3DelayMinutes?: number,
    createdBy?: string
  ): Promise<EscalationChain> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {
        id: `chain-${Date.now()}`,
        escalationPolicyId: policyId,
        name,
        description,
        level1: {
          roleOrUserId: level1UserId,
          escalationDelayMinutes: level1DelayMinutes,
        },
        level2: level2UserId
          ? {
              roleOrUserId: level2UserId,
              escalationDelayMinutes: level2DelayMinutes || 120,
            }
          : undefined,
        level3: level3UserId
          ? {
              roleOrUserId: level3UserId,
              escalationDelayMinutes: level3DelayMinutes || 240,
            }
          : undefined,
        isActive: true,
        createdBy: createdBy || 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return chain;
    } catch (error) {
      console.error(`Failed to create escalation chain: ${error}`);
      throw error;
    }
  }

  /**
   * Get escalation chain
   */
  static async getChain(chainId: string): Promise<EscalationChain | null> {
    try {
      return null;
    } catch (error) {
      console.error(`Failed to get escalation chain ${chainId}: ${error}`);
      return null;
    }
  }

  /**
   * List chains for policy
   */
  static async listChainsForPolicy(policyId: string): Promise<EscalationChain[]> {
    try {
      return [];
    } catch (error) {
      console.error(`Failed to list chains for policy ${policyId}: ${error}`);
      return [];
    }
  }

  /**
   * Update escalation chain
   */
  static async updateChain(
    chainId: string,
    _updates: Partial<EscalationChain>,
    _userId?: string
  ): Promise<EscalationChain | null> {
    try {
      return null;
    } catch (error) {
      console.error(`Failed to update escalation chain ${chainId}: ${error}`);
      return null;
    }
  }

  /**
   * Delete escalation chain
   */
  static async deleteChain(chainId: string): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      console.error(`Failed to delete escalation chain ${chainId}: ${error}`);
      return false;
    }
  }

  // ============================================================================
  // ESCALATION EVENT TRACKING
  // ============================================================================

  /**
   * Log escalation event
   */
  static async logEscalation(
    workflowInstanceId: string,
    escalationRuleId: string,
    tenantId: string,
    reason: string,
    escalationLevel: number,
    triggerType: string,
    previousAssignee?: string,
    newAssignee?: string,
    previousPriority?: string,
    newPriority?: string,
    triggeredByUserId?: string
  ): Promise<EscalationEvent> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const event: EscalationEvent = {
        id: `escalation-${Date.now()}`,
        workflowInstanceId,
        escalationRuleId,
        tenantId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        triggerType: triggerType as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        escalationLevel: escalationLevel as any,
        triggeredBy: triggeredByUserId ? 'Manual' : 'Rule',
        triggeredByUserId,
        previousAssigneeId: previousAssignee,
        newAssigneeId: newAssignee,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        previousPriority: previousPriority as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newPriority: newPriority as any,
        reason,
        details: {
          ruleName: escalationRuleId,
          timestamp: new Date().toISOString(),
        },
        escalationChainLevel: 1,
        createdAt: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      // In production, persist to database
      return event;
    } catch (error) {
      console.error(`Failed to log escalation for workflow ${workflowInstanceId}: ${error}`);
      throw error;
    }
  }

  /**
   * Get escalation events for workflow
   */
  static async getEscalationHistory(
    workflowInstanceId: string,
    _skip: number = 0,
    _take: number = 50
  ): Promise<{ events: EscalationEvent[]; total: number }> {
    try {
      // In production, query database
      return { events: [], total: 0 };
    } catch (error) {
      console.error(
        `Failed to get escalation history for workflow ${workflowInstanceId}: ${error}`
      );
      return { events: [], total: 0 };
    }
  }

  /**
   * Get escalation events for tenant
   */
  static async getEscalationsByTenant(
    tenantId: string,
    _startDate: Date,
    _endDate: Date,
    _skip: number = 0,
    _take: number = 50
  ): Promise<{ events: EscalationEvent[]; total: number }> {
    try {
      // In production, query database with date range
      return { events: [], total: 0 };
    } catch (error) {
      console.error(`Failed to get escalations for tenant ${tenantId}: ${error}`);
      return { events: [], total: 0 };
    }
  }

  /**
   * Mark escalation as resolved
   */
  static async resolveEscalation(
    escalationEventId: string,
    _resolvedBy: string,
    _resolutionNotes?: string
  ): Promise<boolean> {
    try {
      // In production, update database
      return true;
    } catch (error) {
      console.error(`Failed to resolve escalation ${escalationEventId}: ${error}`);
      return false;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get applicable rules for a workflow instance
   */
  static async getApplicableRules(
    workflowInstanceId: string,
    policyId: string,
    triggerType: string
  ): Promise<EscalationRule[]> {
    try {
      const rules = await this.listRulesForPolicy(policyId);
      return rules.filter((rule) => rule.triggerType === triggerType && rule.isActive);
    } catch (error) {
      console.error(
        `Failed to get applicable rules for workflow ${workflowInstanceId}: ${error}`
      );
      return [];
    }
  }

  /**
   * Check if escalation should be skipped (cooldown period)
   */
  static async isInCooldown(
    workflowInstanceId: string,
    _ruleId: string,
    _cooldownMinutes: number
  ): Promise<boolean> {
    try {
      // In production, check last escalation time against cooldown
      // For now, return false (not in cooldown)
      return false;
    } catch (error) {
      console.error(
        `Failed to check cooldown for workflow ${workflowInstanceId}: ${error}`
      );
      return false;
    }
  }

  /**
   * Check if max escalations reached
   */
  static async hasReachedMaxEscalations(
    workflowInstanceId: string,
    _ruleId: string,
    _maxEscalations: number
  ): Promise<boolean> {
    try {
      // In production, count escalations and check against max
      // For now, return false (not reached)
      return false;
    } catch (error) {
      console.error(
        `Failed to check max escalations for workflow ${workflowInstanceId}: ${error}`
      );
      return false;
    }
  }

  /**
   * Get next escalation level in chain
   */
  static async getNextEscalationLevel(chainId: string, currentLevel: number): Promise<string | null> {
    try {
      const chain = await this.getChain(chainId);
      if (!chain) return null;

      if (currentLevel === 1 && chain.level2) {
        return chain.level2.roleOrUserId;
      } else if (currentLevel === 2 && chain.level3) {
        return chain.level3.roleOrUserId;
      }

      return null;
    } catch (error) {
      console.error(`Failed to get next escalation level for chain ${chainId}: ${error}`);
      return null;
    }
  }
}
