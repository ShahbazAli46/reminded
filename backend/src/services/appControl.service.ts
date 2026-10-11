import semver from 'semver';
import { AppControlModel, type AppControlRow } from '../models/appControl.model.js';

export interface AppControlCheckQuery {
  platform?: 'ios' | 'android' | 'web';
  version?: string;
  bypassKey?: string;
}

export interface AppControlResponse {
  maintenance: {
    active: boolean;
    title: string;
    message: string;
  };
  update: {
    type: 'none' | 'soft_update' | 'force_update';
    required: boolean;
    available: boolean;
    current_version: string;
    latest_version: string;
    min_supported_version: string;
    title?: string;
    message?: string;
    store_url?: string;
  };
  announcement: {
    enabled: boolean;
    type: string;
    title: string;
    message: string;
  };
  features: Record<string, boolean>;
  timestamp: string;
}

export class AppControlService {
  /**
   * Helper to safely sanitize semver string (e.g. "1.0" -> "1.0.0")
   */
  private static sanitizeVersion(v?: string): string {
    if (!v) return '1.0.0';
    const cleaned = semver.clean(v) || semver.valid(semver.coerce(v));
    return cleaned || '1.0.0';
  }

  static async evaluateAppStatus(query: AppControlCheckQuery): Promise<AppControlResponse> {
    const raw = await AppControlModel.get();

    // Default fallback in case DB is being initialized
    const config: AppControlRow = raw || {
      id: 1,
      maintenance_mode: 0,
      maintenance_title: 'System Under Maintenance',
      maintenance_message: 'We are performing server updates. Please check back shortly.',
      maintenance_bypass_key: 'bypass_admin_2026',
      min_version_android: '1.0.0',
      latest_version_android: '1.0.0',
      store_url_android: 'https://play.google.com/store/apps/details?id=com.reminder.app',
      min_version_ios: '1.0.0',
      latest_version_ios: '1.0.0',
      store_url_ios: 'https://apps.apple.com/app/id123456789',
      min_version_web: '1.0.0',
      latest_version_web: '1.0.0',
      force_update_title: 'Update Required',
      force_update_message: 'A required update is available. Please update to continue.',
      soft_update_title: 'New Version Available',
      soft_update_message: 'A new update is available with improvements and fixes.',
      announcement_enabled: 0,
      announcement_type: 'info',
      announcement_title: '',
      announcement_message: '',
      features_json: { voice_notes: true, attachments: true, registration: true },
      updated_at: new Date(),
    } as AppControlRow;

    const platform = (query.platform?.toLowerCase() as 'ios' | 'android' | 'web') || 'android';
    const clientVersion = this.sanitizeVersion(query.version);

    // 1. Maintenance Check (Allow bypass if provided key matches)
    const isBypass = query.bypassKey && query.bypassKey === config.maintenance_bypass_key;
    const isMaintenanceActive = Boolean(config.maintenance_mode) && !isBypass;

    // 2. Version Thresholds per Platform
    let minVersion = config.min_version_android;
    let latestVersion = config.latest_version_android;
    let storeUrl = config.store_url_android;

    if (platform === 'ios') {
      minVersion = config.min_version_ios;
      latestVersion = config.latest_version_ios;
      storeUrl = config.store_url_ios;
    } else if (platform === 'web') {
      minVersion = config.min_version_web;
      latestVersion = config.latest_version_web;
      storeUrl = '';
    }

    minVersion = this.sanitizeVersion(minVersion);
    latestVersion = this.sanitizeVersion(latestVersion);

    // Version Comparison
    let updateType: 'none' | 'soft_update' | 'force_update' = 'none';
    let isForceUpdate = false;
    let isSoftUpdate = false;

    if (semver.lt(clientVersion, minVersion)) {
      updateType = 'force_update';
      isForceUpdate = true;
    } else if (semver.lt(clientVersion, latestVersion)) {
      updateType = 'soft_update';
      isSoftUpdate = true;
    }

    // 3. Parse features
    let features: Record<string, boolean> = {
      voice_notes: true,
      attachments: true,
      registration: true,
      sharing: true,
    };

    if (typeof config.features_json === 'string') {
      try {
        features = JSON.parse(config.features_json);
      } catch {
        // use default
      }
    } else if (typeof config.features_json === 'object' && config.features_json !== null) {
      features = config.features_json;
    }

    return {
      maintenance: {
        active: isMaintenanceActive,
        title: config.maintenance_title,
        message: config.maintenance_message,
      },
      update: {
        type: updateType,
        required: isForceUpdate,
        available: isSoftUpdate || isForceUpdate,
        current_version: clientVersion,
        latest_version: latestVersion,
        min_supported_version: minVersion,
        title: isForceUpdate ? config.force_update_title : isSoftUpdate ? config.soft_update_title : undefined,
        message: isForceUpdate ? config.force_update_message : isSoftUpdate ? config.soft_update_message : undefined,
        store_url: storeUrl,
      },
      announcement: {
        enabled: Boolean(config.announcement_enabled),
        type: config.announcement_type || 'info',
        title: config.announcement_title || '',
        message: config.announcement_message || '',
      },
      features,
      timestamp: new Date().toISOString(),
    };
  }

  static async updateConfig(data: Partial<AppControlRow>): Promise<AppControlRow | null> {
    return AppControlModel.update(data);
  }

  static async getRawConfig(): Promise<AppControlRow | null> {
    return AppControlModel.get();
  }
}
