/*This script in combination with the python script "AAR_excel_to_sql" and the excel file
"" creates the SQL database necessary for the AAR compatibility software*/
----------------------------------------------------------------------------------
--CREATE DATABASE aar_comp_2;


/*The tabel with all tankers*/
CREATE TABLE IF NOT EXISTS tankers(
	ID SERIAL PRIMARY KEY,
	"nation" TEXT,
	"type" TEXT,
	"model" TEXT	
);

SELECT setval('tankers_id_seq', (SELECT MAX(id) FROM tankers));

----------------------------------------------------------------------------------
/*The table with all the receivers*/
CREATE TABLE IF NOT EXISTS receivers(
	ID SERIAL PRIMARY KEY,
	"nation" TEXT,
	"type" TEXT,
	"model" TEXT
);

CREATE UNIQUE INDEX ON tankers (nation, type, model);
CREATE UNIQUE INDEX ON receivers (nation, type, model);

SELECT setval('receivers_id_seq', (SELECT MAX(id) FROM receivers));

----------------------------------------------------------------------------------
/*This table is not in the excel file and creates all possible combinations of tanker and receiver*/
DROP TABLE IF EXISTS compatibility;
CREATE TABLE compatibility (
	id SERIAL PRIMARY KEY,	
	tanker_id INTEGER NOT NULL REFERENCES tankers(id) ON DELETE CASCADE,
	receiver_id INTEGER NOT NULL REFERENCES receivers(id) ON DELETE CASCADE,
	UNIQUE (tanker_id, receiver_id));

SELECT setval('compatibility_id_seq', (SELECT MAX(id) FROM compatibility));

-- INSERT INTO compatibility (tanker_id, receiver_id)
-- 	SELECT t.id, r.id
-- 	FROM tankers t
-- 	CROSS JOIN receivers r
-- 	ON CONFLICT (tanker_id, receiver_id) DO NOTHING;
	
DROP TABLE IF EXISTS specifications;---------------------------------------------------------------------------------
CREATE TABLE specifications (
    id SERIAL PRIMARY KEY,
    compatibility_id INT NOT NULL REFERENCES compatibility(id) ON DELETE CASCADE,
	c_tanker TEXT,
	c_receiver TEXT,
	v_srd_tanker TEXT,
	v_srd_receiver TEXT,
    boom_pod_bda TEXT,
    min_alt INT,
    max_alt INT,
    min_as INT,
    max_as_kcas INT,
	max_as_m INT,
    fuel_flow_rate INT,
    notes TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS specifications_compatibility_id_uidx
ON specifications (compatibility_id);


INSERT INTO specifications (compatibility_id, c_tanker, c_receiver, v_srd_tanker, v_srd_receiver, boom_pod_bda, min_alt, max_alt, min_as, max_as_kcas, max_as_m, fuel_flow_rate, notes)
SELECT c.id, s.c_tanker, s.c_receiver, s.v_srd_tanker, s.v_srd_receiver, s.boom_pod_bda, s.min_alt, s.max_alt, s.min_as, s.max_as_kcas, s.max_as_m, s.fuel_flow_rate, s.notes
FROM specifications s
JOIN tankers t 
	ON s.tanker_model = t.model 
	AND s.tanker_nation = t.nation
	AND s.tanker_type = t.type
JOIN receivers r 
	ON s.receiver_model = r.model 
	AND s.receiver_nation = r.nation
	AND s.receiver_type = r.type
JOIN compatibility c 
	ON c.tanker_id = t.id 
	AND c.receiver_id = r.id;

	----------------------------------------------------------------------------------
	--Create Rol en userID table---

	----------------------------------------------------
-- Roles table
CREATE TABLE IF NOT EXISTS "Rol" (
  "RolID" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL UNIQUE
);

----------------------------------------------------
-- Users table
CREATE TABLE IF NOT EXISTS "User" (
  "UserID" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL UNIQUE,
  "RolRolID" INT NOT NULL REFERENCES "Rol"("RolID"),
  "password_hash" VARCHAR(255) NOT NULL
);

----------------------------------------------------
-- Change requests for SRD holder create/update/delete proposals.
-- request_target = tanker | receiver | both
-- delete_scope clarifies whether delete applies to one specification,
-- one compatibility pair, or a master tanker/receiver record.
-- Incorrect submissions can be removed by the SRD holder by deleting the
-- change_request row before processing; no separate withdrawn status is stored.
CREATE TABLE IF NOT EXISTS change_request (
  change_request_id SERIAL PRIMARY KEY,

  request_target VARCHAR(20) NOT NULL,
  request_type VARCHAR(20) NOT NULL,
  request_mode VARCHAR(20) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',

  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  baseline_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_by INT NOT NULL REFERENCES "User"("UserID"),
  reviewed_by INT NULL REFERENCES "User"("UserID"),

  compatibility_id INT NULL REFERENCES compatibility(id) ON DELETE SET NULL,
  specification_id BIGINT NULL REFERENCES specifications(id) ON DELETE SET NULL,
  tanker_id INT NULL REFERENCES tankers(id) ON DELETE SET NULL,
  receiver_id INT NULL REFERENCES receivers(id) ON DELETE SET NULL,

  processed_tanker_id INT NULL REFERENCES tankers(id) ON DELETE SET NULL,
  processed_receiver_id INT NULL REFERENCES receivers(id) ON DELETE SET NULL,
  processed_compatibility_id INT NULL REFERENCES compatibility(id) ON DELETE SET NULL,
  processed_specification_id BIGINT NULL REFERENCES specifications(id) ON DELETE SET NULL,

  request_comment TEXT NOT NULL,
  review_comment TEXT NULL,

  validation_status VARCHAR(20) NULL,
  validation_summary TEXT NULL,
  validation_details JSONB NULL,

  delete_scope VARCHAR(20) NULL,
  submitted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP NULL,
  validated_at TIMESTAMP NULL,
  processed_at TIMESTAMP NULL,
  processing_error TEXT NULL,

  CONSTRAINT change_request_target_chk
    CHECK (request_target IN ('tanker', 'receiver', 'both')),
  CONSTRAINT change_request_type_chk
    CHECK (request_type IN ('create', 'update', 'delete')),
  CONSTRAINT change_request_mode_chk
    CHECK (request_mode IN ('existing', 'new')),
  CONSTRAINT change_request_status_chk
    CHECK (
      status IN (
        'draft',
        'pending_review',
        'approved',
        'rejected',
        'processed',
        'processing_failed'
      )
    ),
  CONSTRAINT change_request_validation_chk
    CHECK (
      validation_status IS NULL
      OR validation_status IN ('ok', 'warning', 'conflict')
    ),
  CONSTRAINT change_request_delete_scope_chk
    CHECK (
      delete_scope IS NULL
      OR delete_scope IN ('specification', 'compatibility', 'tanker', 'receiver')
    ),
  CONSTRAINT change_request_mode_type_match_chk
    CHECK (
      (request_type = 'create' AND request_mode = 'new')
      OR (request_type IN ('update', 'delete') AND request_mode = 'existing')
    ),
  CONSTRAINT change_request_comment_required_chk
    CHECK (length(trim(request_comment)) > 0),
  CONSTRAINT change_request_submit_fields_chk
    CHECK (
      (status = 'draft' AND submitted_at IS NULL)
      OR (
        status IN (
          'pending_review',
          'approved',
          'rejected',
          'processed',
          'processing_failed'
        )
        AND submitted_at IS NOT NULL
      )
    ),
  CONSTRAINT change_request_review_fields_chk
    CHECK (
      (
        status IN ('draft', 'pending_review')
        AND reviewed_by IS NULL
        AND reviewed_at IS NULL
        AND review_comment IS NULL
      )
      OR (
        status IN ('approved', 'rejected', 'processed', 'processing_failed')
        AND reviewed_by IS NOT NULL
        AND reviewed_at IS NOT NULL
      )
    ),
  CONSTRAINT change_request_delete_requires_scope_chk
    CHECK (
      request_type <> 'delete'
      OR delete_scope IS NOT NULL
    ),
  CONSTRAINT change_request_existing_target_reference_chk
    CHECK (
      request_mode <> 'existing'
      OR (
        (request_target = 'tanker' AND tanker_id IS NOT NULL)
        OR (request_target = 'receiver' AND receiver_id IS NOT NULL)
        OR (
          request_target = 'both'
          AND compatibility_id IS NOT NULL
        )
      )
    ),
  CONSTRAINT change_request_delete_scope_reference_chk
    CHECK (
      request_type <> 'delete'
      OR (
        (delete_scope = 'specification' AND specification_id IS NOT NULL)
        OR (delete_scope = 'compatibility' AND compatibility_id IS NOT NULL)
        OR (delete_scope = 'tanker' AND tanker_id IS NOT NULL)
        OR (delete_scope = 'receiver' AND receiver_id IS NOT NULL)
      )
    ),
  CONSTRAINT change_request_processing_fields_chk
    CHECK (
      (
        status IN ('draft', 'pending_review', 'approved', 'rejected')
        AND processed_at IS NULL
        AND processing_error IS NULL
      )
      OR (
        status = 'processed'
        AND processed_at IS NOT NULL
        AND processing_error IS NULL
      )
      OR (
        status = 'processing_failed'
        AND processed_at IS NOT NULL
        AND processing_error IS NOT NULL
      )
    ),
  CONSTRAINT change_request_processed_reference_chk
    CHECK (
      status <> 'processed'
      OR (
        (request_target = 'tanker' AND processed_tanker_id IS NOT NULL)
        OR (request_target = 'receiver' AND processed_receiver_id IS NOT NULL)
        OR (
          request_target = 'both'
          AND (
            processed_specification_id IS NOT NULL
            OR processed_compatibility_id IS NOT NULL
          )
        )
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_change_request_status_created_at
  ON change_request (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_change_request_created_by
  ON change_request (created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_change_request_reviewed_by
  ON change_request (reviewed_by, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_change_request_pending_review
  ON change_request (created_at DESC)
  WHERE status = 'pending_review';

CREATE INDEX IF NOT EXISTS idx_change_request_tanker_id
  ON change_request (tanker_id);

CREATE INDEX IF NOT EXISTS idx_change_request_receiver_id
  ON change_request (receiver_id);

CREATE INDEX IF NOT EXISTS idx_change_request_compatibility_id
  ON change_request (compatibility_id);

CREATE INDEX IF NOT EXISTS idx_change_request_specification_id
  ON change_request (specification_id);

----------------------------------------------------
-- Insert roles
INSERT INTO "Rol" ("name")
VALUES ('admin'), ('srd_holder'), ('viewer')
ON CONFLICT ("name") DO NOTHING;

----------------------------------------------------
-- Insert users with hash

INSERT INTO "User" ("name","email","RolRolID","password_hash")
VALUES
('Admin','admin@japcc.com',
 (SELECT "RolID" FROM "Rol" WHERE "name"='admin'),
 '$2b$10$egRYV7eGB6EDFF7JGIsvzOUbXlz3ta2nO8LrWyvXhn4b3pu6gR4hS'),

('SRD_Holder','srd@mindef.com',
 (SELECT "RolID" FROM "Rol" WHERE "name"='srd_holder'),
 '$2b$10$egRYV7eGB6EDFF7JGIsvzOUbXlz3ta2nO8LrWyvXhn4b3pu6gR4hS'),

('Viewer','viewer@japcc.com',
 (SELECT "RolID" FROM "Rol" WHERE "name"='viewer'),
 '$2b$10$egRYV7eGB6EDFF7JGIsvzOUbXlz3ta2nO8LrWyvXhn4b3pu6gR4hS')
ON CONFLICT ("email") DO NOTHING;
