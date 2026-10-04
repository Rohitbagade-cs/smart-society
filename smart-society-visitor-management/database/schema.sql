-- ============================================================================
-- Smart Society Visitor Management — MySQL 8 schema
-- Database: smart_society_db   Charset: utf8mb4   Engine: InnoDB
--
-- Mirrors the Django models (apps.accounts / apps.visitors / apps.society).
-- In practice the schema is created by Django migrations; this file is the
-- canonical reference / manual-creation script for DBAs and reviewers.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS smart_society_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE smart_society_db;

-- ----------------------------------------------------------------------------
-- accounts: custom User (extends django.contrib.auth user fields)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts_user (
  id            BIGINT NOT NULL AUTO_INCREMENT,
  password      VARCHAR(128) NOT NULL,
  last_login    DATETIME(6) NULL,
  is_superuser  TINYINT(1) NOT NULL DEFAULT 0,
  username      VARCHAR(150) NOT NULL,
  first_name    VARCHAR(150) NOT NULL DEFAULT '',
  last_name     VARCHAR(150) NOT NULL DEFAULT '',
  email         VARCHAR(254) NOT NULL DEFAULT '',
  is_staff      TINYINT(1) NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  date_joined   DATETIME(6) NOT NULL,
  role          VARCHAR(16) NOT NULL DEFAULT 'resident'
                CHECK (role IN ('admin','guard','resident')),
  phone         VARCHAR(20) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE KEY uq_accounts_user_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS accounts_user_groups (
  id       BIGINT NOT NULL AUTO_INCREMENT,
  user_id  BIGINT NOT NULL,
  group_id INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_group (user_id, group_id),
  CONSTRAINT fk_user_groups_user FOREIGN KEY (user_id)
    REFERENCES accounts_user (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS accounts_user_user_permissions (
  id            BIGINT NOT NULL AUTO_INCREMENT,
  user_id       BIGINT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_perm (user_id, permission_id),
  CONSTRAINT fk_user_perms_user FOREIGN KEY (user_id)
    REFERENCES accounts_user (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS accounts_residentprofile (
  id             BIGINT NOT NULL AUTO_INCREMENT,
  user_id        BIGINT NOT NULL,
  flat_no        VARCHAR(20) NOT NULL DEFAULT '',
  wing           VARCHAR(20) NOT NULL DEFAULT '',
  floor          SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  phone          VARCHAR(20) NOT NULL DEFAULT '',
  family_members SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_residentprofile_user (user_id),
  CONSTRAINT fk_residentprofile_user FOREIGN KEY (user_id)
    REFERENCES accounts_user (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS accounts_securityguardprofile (
  id      BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  shift   VARCHAR(16) NOT NULL DEFAULT 'morning'
          CHECK (shift IN ('morning','evening','night')),
  gate    VARCHAR(60) NOT NULL DEFAULT 'Main Gate',
  phone   VARCHAR(20) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE KEY uq_guardprofile_user (user_id),
  CONSTRAINT fk_guardprofile_user FOREIGN KEY (user_id)
    REFERENCES accounts_user (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- visitors: visitor lifecycle
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visitors_visitor (
  id              BIGINT NOT NULL AUTO_INCREMENT,
  full_name       VARCHAR(120) NOT NULL,
  phone           VARCHAR(20) NOT NULL DEFAULT '',
  id_proof_type   VARCHAR(40) NOT NULL DEFAULT '',
  id_proof_number VARCHAR(60) NOT NULL DEFAULT '',
  photo_url       VARCHAR(500) NOT NULL DEFAULT '',
  visitor_type    VARCHAR(16) NOT NULL DEFAULT 'guest'
                  CHECK (visitor_type IN ('guest','delivery','service','cab','other')),
  vehicle_number  VARCHAR(30) NOT NULL DEFAULT '',
  created_by_id   BIGINT NULL,
  created_at      DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_visitor_name (full_name),
  KEY ix_visitor_phone (phone),
  CONSTRAINT fk_visitor_created_by FOREIGN KEY (created_by_id)
    REFERENCES accounts_user (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visitors_visitrequest (
  id            BIGINT NOT NULL AUTO_INCREMENT,
  visitor_id    BIGINT NOT NULL,
  resident_id   BIGINT NOT NULL,
  purpose       VARCHAR(255) NOT NULL,
  expected_at   DATETIME(6) NOT NULL,
  status        VARCHAR(16) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','approved','rejected','checked_in','checked_out','cancelled')),
  qr_token      VARCHAR(32) NOT NULL,
  otp_verified  TINYINT(1) NOT NULL DEFAULT 0,
  created_by_id BIGINT NULL,
  created_at    DATETIME(6) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_visitrequest_qr (qr_token),
  KEY ix_request_status (status),
  KEY ix_request_created (created_at),
  KEY ix_request_resident_status (resident_id, status),
  CONSTRAINT fk_request_visitor FOREIGN KEY (visitor_id)
    REFERENCES visitors_visitor (id) ON DELETE CASCADE,
  CONSTRAINT fk_request_resident FOREIGN KEY (resident_id)
    REFERENCES accounts_user (id) ON DELETE CASCADE,
  CONSTRAINT fk_request_created_by FOREIGN KEY (created_by_id)
    REFERENCES accounts_user (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visitors_approval (
  id               BIGINT NOT NULL AUTO_INCREMENT,
  visit_request_id BIGINT NOT NULL,
  decided_by_id    BIGINT NULL,
  decision         VARCHAR(8) NOT NULL CHECK (decision IN ('approve','reject')),
  decided_at       DATETIME(6) NOT NULL,
  note             TEXT NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_approval_request FOREIGN KEY (visit_request_id)
    REFERENCES visitors_visitrequest (id) ON DELETE CASCADE,
  CONSTRAINT fk_approval_decided_by FOREIGN KEY (decided_by_id)
    REFERENCES accounts_user (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visitors_accesslog (
  id               BIGINT NOT NULL AUTO_INCREMENT,
  visit_request_id BIGINT NOT NULL,
  gate             VARCHAR(60) NOT NULL DEFAULT 'Main Gate',
  direction        VARCHAR(3) NOT NULL CHECK (direction IN ('in','out')),
  timestamp        DATETIME(6) NOT NULL,
  recorded_by_id   BIGINT NULL,
  PRIMARY KEY (id),
  KEY ix_accesslog_ts (timestamp),
  KEY ix_accesslog_gate (gate),
  CONSTRAINT fk_accesslog_request FOREIGN KEY (visit_request_id)
    REFERENCES visitors_visitrequest (id) ON DELETE CASCADE,
  CONSTRAINT fk_accesslog_recorded_by FOREIGN KEY (recorded_by_id)
    REFERENCES accounts_user (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visitors_notification (
  id                 BIGINT NOT NULL AUTO_INCREMENT,
  recipient_id       BIGINT NOT NULL,
  title              VARCHAR(200) NOT NULL,
  message            TEXT NOT NULL,
  is_read            TINYINT(1) NOT NULL DEFAULT 0,
  created_at         DATETIME(6) NOT NULL,
  related_request_id BIGINT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_notification_recipient FOREIGN KEY (recipient_id)
    REFERENCES accounts_user (id) ON DELETE CASCADE,
  CONSTRAINT fk_notification_request FOREIGN KEY (related_request_id)
    REFERENCES visitors_visitrequest (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visitors_otpcode (
  id               BIGINT NOT NULL AUTO_INCREMENT,
  visit_request_id BIGINT NOT NULL,
  code_hash        CHAR(64) NOT NULL,
  expires_at       DATETIME(6) NOT NULL,
  used             TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_otp_request FOREIGN KEY (visit_request_id)
    REFERENCES visitors_visitrequest (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visitors_auditlog (
  id         BIGINT NOT NULL AUTO_INCREMENT,
  actor_id   BIGINT NULL,
  action     VARCHAR(60) NOT NULL,
  entity     VARCHAR(60) NOT NULL,
  entity_id  INT NULL,
  timestamp  DATETIME(6) NOT NULL,
  ip_address VARCHAR(45) NULL,
  details    JSON NULL,
  PRIMARY KEY (id),
  KEY ix_audit_action (action),
  KEY ix_audit_entity (entity),
  KEY ix_audit_ts (timestamp),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id)
    REFERENCES accounts_user (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- society: singleton configuration row (expected pk = 1)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS society_society (
  id                   BIGINT NOT NULL AUTO_INCREMENT,
  name                 VARCHAR(200) NOT NULL DEFAULT '',
  address              TEXT NOT NULL,
  city                 VARCHAR(100) NOT NULL DEFAULT '',
  total_flats          INT UNSIGNED NOT NULL DEFAULT 0,
  gates                INT UNSIGNED NOT NULL DEFAULT 1,
  contact_email        VARCHAR(254) NOT NULL DEFAULT '',
  contact_phone        VARCHAR(20) NOT NULL DEFAULT '',
  visiting_hours_start TIME NULL,
  visiting_hours_end   TIME NULL,
  otp_enabled          TINYINT(1) NOT NULL DEFAULT 1,
  qr_enabled           TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Minimal seed for the society singleton (row id = 1)
-- ----------------------------------------------------------------------------
INSERT INTO society_society
  (id, name, address, city, total_flats, gates, contact_email, contact_phone,
   visiting_hours_start, visiting_hours_end, otp_enabled, qr_enabled)
VALUES
  (1, 'Green Meadows Society', '12 Palm Avenue, Sector 5', 'Pune', 120, 2,
   'office@greenmeadows.example', '+91-20-4000-1234',
   '09:00:00', '21:00:00', 1, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);
