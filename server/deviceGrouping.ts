import { EventEmitter } from 'events';

/**
 * Device group types
 */
export enum GroupType {
  ZONE = 'zone',
  PRODUCTION_LINE = 'production_line',
  DEPARTMENT = 'department',
  CUSTOM = 'custom',
}

/**
 * Device group configuration
 */
export interface DeviceGroup {
  id: string;
  name: string;
  type: GroupType;
  description?: string;
  deviceIds: number[];
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

/**
 * Batch operation request
 */
export interface BatchOperation {
  id: string;
  groupId: string;
  operation: 'update_status' | 'update_config' | 'firmware_update' | 'restart';
  parameters: Record<string, unknown>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  results?: Record<number, unknown>;
}

/**
 * Group analytics
 */
export interface GroupAnalytics {
  groupId: string;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  errorDevices: number;
  maintenanceDevices: number;
  averageTemperature?: number;
  averageHumidity?: number;
  averagePower?: number;
  criticalAlerts: number;
  warningAlerts: number;
  infoAlerts: number;
  lastUpdated: number;
}

/**
 * Device grouping service
 * Manages device organization into zones and production lines
 */
export class DeviceGroupingService extends EventEmitter {
  private groups: Map<string, DeviceGroup> = new Map();
  private batchOperations: Map<string, BatchOperation> = new Map();
  private deviceToGroups: Map<number, Set<string>> = new Map();

  /**
   * Create a new device group
   */
  public createGroup(
    name: string,
    type: GroupType,
    deviceIds: number[],
    description?: string,
    metadata?: Record<string, unknown>
  ): DeviceGroup {
    const id = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const group: DeviceGroup = {
      id,
      name,
      type,
      description,
      deviceIds,
      metadata,
      createdAt: now,
      updatedAt: now,
    };

    this.groups.set(id, group);

    // Update device-to-groups mapping
    for (const deviceId of deviceIds) {
      if (!this.deviceToGroups.has(deviceId)) {
        this.deviceToGroups.set(deviceId, new Set());
      }
      this.deviceToGroups.get(deviceId)!.add(id);
    }

    this.emit('group_created', group);
    console.log(`[Device Grouping] Created group: ${name} (${id})`);

    return group;
  }

  /**
   * Get group by ID
   */
  public getGroup(groupId: string): DeviceGroup | undefined {
    return this.groups.get(groupId);
  }

  /**
   * Get all groups
   */
  public getAllGroups(): DeviceGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Get groups by type
   */
  public getGroupsByType(type: GroupType): DeviceGroup[] {
    return Array.from(this.groups.values()).filter((g) => g.type === type);
  }

  /**
   * Get groups containing a device
   */
  public getGroupsForDevice(deviceId: number): DeviceGroup[] {
    const groupIds = this.deviceToGroups.get(deviceId) || new Set();
    return Array.from(groupIds)
      .map((id) => this.groups.get(id))
      .filter((g) => g !== undefined) as DeviceGroup[];
  }

  /**
   * Update group
   */
  public updateGroup(
    groupId: string,
    updates: Partial<Omit<DeviceGroup, 'id' | 'createdAt'>>
  ): DeviceGroup | undefined {
    const group = this.groups.get(groupId);
    if (!group) return undefined;

    // Update device-to-groups mapping if deviceIds changed
    if (updates.deviceIds) {
      const oldDeviceIds = group.deviceIds;
      const newDeviceIds = updates.deviceIds;

      // Remove group from old devices
      for (const deviceId of oldDeviceIds) {
        if (!newDeviceIds.includes(deviceId)) {
          this.deviceToGroups.get(deviceId)?.delete(groupId);
        }
      }

      // Add group to new devices
      for (const deviceId of newDeviceIds) {
        if (!oldDeviceIds.includes(deviceId)) {
          if (!this.deviceToGroups.has(deviceId)) {
            this.deviceToGroups.set(deviceId, new Set());
          }
          this.deviceToGroups.get(deviceId)!.add(groupId);
        }
      }
    }

    const updatedGroup: DeviceGroup = {
      ...group,
      ...updates,
      updatedAt: Date.now(),
    };

    this.groups.set(groupId, updatedGroup);
    this.emit('group_updated', updatedGroup);
    console.log(`[Device Grouping] Updated group: ${groupId}`);

    return updatedGroup;
  }

  /**
   * Delete group
   */
  public deleteGroup(groupId: string): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;

    // Remove group from device-to-groups mapping
    for (const deviceId of group.deviceIds) {
      this.deviceToGroups.get(deviceId)?.delete(groupId);
    }

    this.groups.delete(groupId);
    this.emit('group_deleted', groupId);
    console.log(`[Device Grouping] Deleted group: ${groupId}`);

    return true;
  }

  /**
   * Add devices to group
   */
  public addDevicesToGroup(groupId: string, deviceIds: number[]): DeviceGroup | undefined {
    const group = this.groups.get(groupId);
    if (!group) return undefined;

    const newDeviceIds = [...new Set([...group.deviceIds, ...deviceIds])];
    return this.updateGroup(groupId, { deviceIds: newDeviceIds });
  }

  /**
   * Remove devices from group
   */
  public removeDevicesFromGroup(groupId: string, deviceIds: number[]): DeviceGroup | undefined {
    const group = this.groups.get(groupId);
    if (!group) return undefined;

    const newDeviceIds = group.deviceIds.filter((id) => !deviceIds.includes(id));
    return this.updateGroup(groupId, { deviceIds: newDeviceIds });
  }

  /**
   * Create batch operation for group
   */
  public createBatchOperation(
    groupId: string,
    operation: string,
    parameters: Record<string, unknown>
  ): BatchOperation | undefined {
    const group = this.groups.get(groupId);
    if (!group) return undefined;

    const id = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const batchOp: BatchOperation = {
      id,
      groupId,
      operation: operation as any,
      parameters,
      status: 'pending',
      progress: 0,
      createdAt: now,
    };

    this.batchOperations.set(id, batchOp);
    this.emit('batch_operation_created', batchOp);
    console.log(`[Device Grouping] Created batch operation: ${id}`);

    return batchOp;
  }

  /**
   * Get batch operation
   */
  public getBatchOperation(operationId: string): BatchOperation | undefined {
    return this.batchOperations.get(operationId);
  }

  /**
   * Update batch operation status
   */
  public updateBatchOperation(
    operationId: string,
    updates: Partial<Omit<BatchOperation, 'id' | 'groupId' | 'operation' | 'parameters' | 'createdAt'>>
  ): BatchOperation | undefined {
    const operation = this.batchOperations.get(operationId);
    if (!operation) return undefined;

    const updatedOperation: BatchOperation = {
      ...operation,
      ...updates,
    };

    this.batchOperations.set(operationId, updatedOperation);

    if (updates.status === 'in_progress' && !operation.startedAt) {
      updatedOperation.startedAt = Date.now();
    }

    if ((updates.status === 'completed' || updates.status === 'failed') && !operation.completedAt) {
      updatedOperation.completedAt = Date.now();
    }

    this.emit('batch_operation_updated', updatedOperation);
    return updatedOperation;
  }

  /**
   * Get batch operations for group
   */
  public getBatchOperationsForGroup(groupId: string): BatchOperation[] {
    return Array.from(this.batchOperations.values()).filter((op) => op.groupId === groupId);
  }

  /**
   * Calculate group analytics
   */
  public calculateGroupAnalytics(
    groupId: string,
    deviceStats: Map<number, any>
  ): GroupAnalytics | undefined {
    const group = this.groups.get(groupId);
    if (!group) return undefined;

    let onlineDevices = 0;
    let offlineDevices = 0;
    let errorDevices = 0;
    let maintenanceDevices = 0;
    let temperatureSum = 0;
    let humiditySum = 0;
    let powerSum = 0;
    let temperatureCount = 0;
    let humidityCount = 0;
    let powerCount = 0;
    let criticalAlerts = 0;
    let warningAlerts = 0;
    let infoAlerts = 0;

    const deviceIdsArray = Array.from(group.deviceIds);
    for (const deviceId of deviceIdsArray) {
      const stats = deviceStats.get(deviceId);
      if (!stats) continue;

      // Count device statuses
      if (stats.status === 'online') onlineDevices++;
      else if (stats.status === 'offline') offlineDevices++;
      else if (stats.status === 'error') errorDevices++;
      else if (stats.status === 'maintenance') maintenanceDevices++;

      // Aggregate metrics
      if (stats.temperature !== undefined) {
        temperatureSum += stats.temperature;
        temperatureCount++;
      }
      if (stats.humidity !== undefined) {
        humiditySum += stats.humidity;
        humidityCount++;
      }
      if (stats.power !== undefined) {
        powerSum += stats.power;
        powerCount++;
      }

      // Count alerts
      if (stats.alerts) {
        criticalAlerts += stats.alerts.critical || 0;
        warningAlerts += stats.alerts.warning || 0;
        infoAlerts += stats.alerts.info || 0;
      }
    }

    return {
      groupId,
      totalDevices: group.deviceIds.length,
      onlineDevices,
      offlineDevices,
      errorDevices,
      maintenanceDevices,
      averageTemperature: temperatureCount > 0 ? temperatureSum / temperatureCount : undefined,
      averageHumidity: humidityCount > 0 ? humiditySum / humidityCount : undefined,
      averagePower: powerCount > 0 ? powerSum / powerCount : undefined,
      criticalAlerts,
      warningAlerts,
      infoAlerts,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Get all batch operations
   */
  public getAllBatchOperations(): BatchOperation[] {
    return Array.from(this.batchOperations.values());
  }

  /**
   * Clear completed batch operations
   */
  public clearCompletedOperations(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    const cutoffTime = Date.now() - olderThanMs;
    let cleared = 0;

    const operationsArray = Array.from(this.batchOperations.entries());
    for (const [id, operation] of operationsArray) {
      if (
        (operation.status === 'completed' || operation.status === 'failed') &&
        operation.completedAt &&
        operation.completedAt < cutoffTime
      ) {
        this.batchOperations.delete(id);
        cleared++;
      }
    }

    if (cleared > 0) {
      console.log(`[Device Grouping] Cleared ${cleared} old batch operations`);
    }
  }
}

export const deviceGroupingService = new DeviceGroupingService();
