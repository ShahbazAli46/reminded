-- Reminder++ Database Schema
-- Optimized for MySQL 8 / MariaDB on Hostinger Shared Hosting

CREATE TABLE IF NOT EXISTS `app_controls` (
  `id` INT NOT NULL PRIMARY KEY DEFAULT 1,
  
  -- Maintenance / Hold Mode
  `maintenance_mode` TINYINT(1) NOT NULL DEFAULT 0,
  `maintenance_title` VARCHAR(255) NOT NULL DEFAULT 'System Under Maintenance',
  `maintenance_message` TEXT NOT NULL,
  `maintenance_bypass_key` VARCHAR(255) NOT NULL DEFAULT 'bypass_admin_2026',
  
  -- Version Control (Android)
  `min_version_android` VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  `latest_version_android` VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  `store_url_android` VARCHAR(500) NOT NULL DEFAULT 'https://play.google.com/store/apps/details?id=com.reminder.app',
  
  -- Version Control (iOS)
  `min_version_ios` VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  `latest_version_ios` VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  `store_url_ios` VARCHAR(500) NOT NULL DEFAULT 'https://apps.apple.com/app/id123456789',

  -- Version Control (Web / Other)
  `min_version_web` VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  `latest_version_web` VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  
  -- Update Copy / Prompts
  `force_update_title` VARCHAR(255) NOT NULL DEFAULT 'Update Required',
  `force_update_message` TEXT NOT NULL,
  `soft_update_title` VARCHAR(255) NOT NULL DEFAULT 'New Version Available',
  `soft_update_message` TEXT NOT NULL,

  -- Announcements Banner
  `announcement_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `announcement_type` VARCHAR(50) NOT NULL DEFAULT 'info',
  `announcement_title` VARCHAR(255) NOT NULL DEFAULT '',
  `announcement_message` TEXT,
  
  -- Feature Flags (JSON)
  `features_json` JSON,
  
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default row if not already present
INSERT IGNORE INTO `app_controls` (
  `id`,
  `maintenance_mode`,
  `maintenance_title`,
  `maintenance_message`,
  `maintenance_bypass_key`,
  `min_version_android`,
  `latest_version_android`,
  `store_url_android`,
  `min_version_ios`,
  `latest_version_ios`,
  `store_url_ios`,
  `min_version_web`,
  `latest_version_web`,
  `force_update_title`,
  `force_update_message`,
  `soft_update_title`,
  `soft_update_message`,
  `announcement_enabled`,
  `announcement_type`,
  `announcement_title`,
  `announcement_message`,
  `features_json`
) VALUES (
  1,
  0,
  'Under Scheduled Maintenance',
  'We are currently performing maintenance to improve your experience. Please check back shortly.',
  'bypass_admin_2026',
  '1.0.0',
  '1.0.0',
  'https://play.google.com/store/apps/details?id=com.reminder.app',
  '1.0.0',
  '1.0.0',
  'https://apps.apple.com/app/id123456789',
  '1.0.0',
  '1.0.0',
  'Update Required',
  'A required update is available with essential security and stability improvements. Please update to continue.',
  'Update Available',
  'A newer version of the app is available with performance improvements and new features.',
  0,
  'info',
  '',
  '',
  '{"voice_notes": true, "attachments": true, "registration": true, "sharing": true}'
);

-- Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `phone_number` VARCHAR(20) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL UNIQUE,
  `phone_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `public_key` VARCHAR(128) NOT NULL,
  `name` VARCHAR(100) DEFAULT NULL,
  `avatar_url` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_phone_hash` (`phone_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OTP Verification Table
CREATE TABLE IF NOT EXISTS `otps` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `phone_number` VARCHAR(20) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `otp_code` VARCHAR(10) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `verified` TINYINT(1) DEFAULT 0,
  `attempts` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_otp_phone` (`phone_number`),
  INDEX `idx_otp_expires_at` (`expires_at`),
  INDEX `idx_otp_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User Device Push Tokens (FCM)
CREATE TABLE IF NOT EXISTS `user_devices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `fcm_token` VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `platform` ENUM('ios', 'android', 'web') DEFAULT 'android',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_user_device` (`user_id`, `fcm_token`),
  INDEX `idx_user_devices_user` (`user_id`, `updated_at` DESC),
  INDEX `idx_user_devices_token` (`fcm_token`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tasks Table (Zero-Knowledge E2EE)
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `creator_id` INT NOT NULL,
  `assignee_phone` VARCHAR(20) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `assignee_id` INT DEFAULT NULL,
  `title` VARCHAR(255) DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `attachment_url` TEXT DEFAULT NULL,
  `audio_note_url` TEXT DEFAULT NULL,
  `audio_note_duration` VARCHAR(50) DEFAULT NULL,
  `encrypted_task_key_for_creator` TEXT DEFAULT NULL,
  `encrypted_task_key_for_assignee` TEXT DEFAULT NULL,
  `encrypted_payload` MEDIUMTEXT DEFAULT NULL,
  `payload_iv` VARCHAR(64) DEFAULT NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
  `status` ENUM('upcoming', 'pending', 'done_pending_confirmation', 'completed', 'cancelled') NOT NULL DEFAULT 'upcoming',
  `due_at` DATETIME NOT NULL,
  `read_state` ENUM('sent', 'delivered', 'notified', 'opened') NOT NULL DEFAULT 'sent',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tasks_creator_feed` (`creator_id`, `due_at`, `status`),
  INDEX `idx_tasks_assignee_feed` (`assignee_id`, `due_at`, `status`),
  INDEX `idx_tasks_phone_feed` (`assignee_phone`, `due_at`, `status`),
  INDEX `idx_tasks_creator` (`creator_id`, `status`),
  INDEX `idx_tasks_assignee` (`assignee_id`, `status`),
  INDEX `idx_tasks_assignee_phone` (`assignee_phone`, `status`),
  INDEX `idx_tasks_due_at` (`due_at`),
  INDEX `idx_tasks_updated_at` (`updated_at`),
  FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Task Comments & System Mutation Messages (Zero-Knowledge E2EE)
CREATE TABLE IF NOT EXISTS `task_comments` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `task_id` VARCHAR(64) NOT NULL,
  `sender_id` INT DEFAULT NULL,
  `is_system` TINYINT(1) NOT NULL DEFAULT 0,
  `message_type` ENUM('text', 'voice', 'image', 'system') NOT NULL DEFAULT 'text',
  `encrypted_content` MEDIUMTEXT NOT NULL,
  `content_iv` VARCHAR(64) NOT NULL,
  `voice_duration_seconds` INT DEFAULT NULL,
  `read_state` ENUM('sent', 'delivered', 'opened') NOT NULL DEFAULT 'sent',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_comments_task_time` (`task_id`, `created_at`),
  INDEX `idx_comments_updated_at` (`updated_at`),
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contacts & Consent Relations (First-Contact Gate, Blocks, Mutes)
CREATE TABLE IF NOT EXISTS `contacts_relations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sender_id` INT NOT NULL,
  `receiver_id` INT NOT NULL,
  `status` ENUM('pending', 'accepted', 'declined', 'blocked', 'muted') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uniq_sender_receiver` (`sender_id`, `receiver_id`),
  INDEX `idx_receiver_requests` (`receiver_id`, `status`, `created_at` DESC),
  INDEX `idx_receiver_status` (`receiver_id`, `status`),
  FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Native MySQL Scheduled Event: Purge expired/orphaned OTPs every hour
-- (Note: MySQL Event Scheduler must be enabled via `SET GLOBAL event_scheduler = ON;`)
-- Ignored if event privileges are restricted on shared hosting.
CREATE EVENT IF NOT EXISTS `purge_expired_otps`
ON SCHEDULE EVERY 1 HOUR
DO
  DELETE FROM `otps` WHERE `expires_at` < NOW();


